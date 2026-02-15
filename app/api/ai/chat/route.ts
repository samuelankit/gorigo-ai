import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, callLogs, knowledgeChunks } from "@/shared/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { generateAgentResponse, streamAgentResponse } from "@/lib/ai";
import { getAuthenticatedUser } from "@/lib/get-user";
import { evaluateTransition, isValidState, STATE_ALLOWED_ACTIONS, type FSMState, type FSMConfig } from "@/lib/fsm";
import { checkResponseCache, searchKnowledge, buildRAGContext, cacheResponse } from "@/lib/rag";
import { aiLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { hasInsufficientBalance, deductFromWallet } from "@/lib/wallet";
import { requireEmailVerified } from "@/lib/get-user";
import { redactPII } from "@/lib/pii-redaction";
import { detectPromptInjection, detectHumanRequest, SAFE_REFUSAL_TEXT } from "@/lib/prompt-guard";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";
import { logCostEvent, calculateLLMCost } from "@/lib/unit-economics";

const aiChatSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "system", "assistant"]),
    content: z.string().min(1),
  })).optional(),
  stream: z.boolean().optional(),
  callLogId: z.number().int().positive().optional(),
  currentState: z.string().optional(),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const rl = await aiLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.chat);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    if (!auth.isDemo) {
      const verifiedCheck = requireEmailVerified(auth);
      if (!verifiedCheck.allowed) {
        return NextResponse.json({ error: verifiedCheck.error, code: "EMAIL_NOT_VERIFIED" }, { status: verifiedCheck.status || 403 });
      }

      const insufficientBalance = await hasInsufficientBalance(auth.orgId);
      if (insufficientBalance) {
        return NextResponse.json({
          error: "Insufficient wallet balance. Please top up your wallet to continue using AI services.",
          code: "INSUFFICIENT_BALANCE",
        }, { status: 402 });
      }
    }

    const body = await request.json();
    const {
      message,
      conversationHistory = [],
      stream = false,
      callLogId,
      currentState: requestedState,
    } = aiChatSchema.parse(body);

    if (detectPromptInjection(message)) {
      return NextResponse.json({
        response: SAFE_REFUSAL_TEXT,
        currentState: requestedState || "GREETING",
        confidenceScore: 1.0,
        blocked: true,
      });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.orgId, auth.orgId));
    if (!agent) {
      return NextResponse.json({ error: "No agent configured" }, { status: 404 });
    }

    const currentState: FSMState = isValidState(requestedState ?? "") ? (requestedState as FSMState) : "GREETING";
    const allowedActions = STATE_ALLOWED_ACTIONS[currentState] || [];
    const userRequestedHuman = detectHumanRequest(message);

    const fsmConfig: FSMConfig = {
      maxTurns: agent.maxTurns ?? 10,
      confidenceThreshold: Number(agent.confidenceThreshold) || 0.55,
      perStateRetries: 2,
    };

    let turnCount = 0;
    if (callLogId) {
      const [log] = await db
        .select()
        .from(callLogs)
        .where(and(eq(callLogs.id, callLogId), eq(callLogs.orgId, auth.orgId)))
        .limit(1);
      if (log) {
        turnCount = log.turnCount ?? 0;
      }
    }

    const agentConfig = {
      name: agent.name,
      greeting: agent.greeting || "",
      businessDescription: agent.businessDescription,
      roles: agent.roles || "receptionist",
      faqEntries: (agent.faqEntries as Array<{ question: string; answer: string }>) || [],
      complianceDisclosure: agent.complianceDisclosure ?? true,
      negotiationEnabled: agent.negotiationEnabled ?? false,
      negotiationGuardrails: agent.negotiationGuardrails,
    };

    const fsmConstraints = `
Current FSM State: ${currentState}
Allowed Actions: ${allowedActions.join(", ")}
Turn: ${turnCount + 1}/${fsmConfig.maxTurns}
Rules:
- Stay within your allowed actions for this state
- If the user requests a human, acknowledge and prepare for handoff
- Provide a confidence score (0.0-1.0) for your understanding of the user's intent
- Suggest the next state from: GREETING, INTENT_CAPTURE, CONFIRM, EXECUTE, CLOSE, HANDOFF, FAILSAFE
Respond in JSON format: {"assistantText": "...", "nextState": "...", "confidenceScore": 0.0-1.0, "toolCalls": []}`;

    const [hasKnowledge] = await db
      .select({ total: count() })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.orgId, auth.orgId));
    const ragEnabled = Number(hasKnowledge.total) > 0;

    let ragContext = "";
    let cacheHit = false;
    let ragSource = "llm";

    if (ragEnabled && !stream) {
      try {
        const cached = await checkResponseCache(auth.orgId, message);
        if (cached.hit && cached.response) {
          cacheHit = true;
          ragSource = "cache";

          const fsmContext = {
            currentState,
            turnCount,
            lastConfidence: cached.confidence ?? 0.9,
            lowConfidenceCount: 0,
            stateRetries: {},
          };

          const transition = evaluateTransition(
            fsmContext,
            currentState === "GREETING" ? "INTENT_CAPTURE" as FSMState : currentState,
            cached.confidence ?? 0.9,
            userRequestedHuman,
            fsmConfig
          );

          if (callLogId) {
            await db
              .update(callLogs)
              .set({
                currentState: transition.nextState,
                turnCount: turnCount + 1,
                lastConfidence: String(cached.confidence ?? 0.9),
                handoffTriggered: transition.shouldHandoff,
                handoffReason: transition.handoffReason,
                handoffAt: transition.shouldHandoff ? new Date() : undefined,
              })
              .where(eq(callLogs.id, callLogId));
          }

          return NextResponse.json({
            response: cached.response,
            model: "cache",
            usedFallback: false,
            currentState: transition.nextState,
            previousState: currentState,
            confidenceScore: cached.confidence ?? 0.9,
            shouldHandoff: transition.shouldHandoff,
            handoffReason: transition.handoffReason,
            allowedActions: transition.allowedActions,
            turnCount: turnCount + 1,
            toolCalls: [],
            ragSource: "cache",
          });
        }
      } catch (cacheErr) {
        console.error("Cache check failed, proceeding with LLM:", cacheErr);
      }

      try {
        const relevantChunks = await searchKnowledge(auth.orgId, message);
        if (relevantChunks.length > 0) {
          ragContext = buildRAGContext(relevantChunks);
          ragSource = "rag";
        }
      } catch (ragErr) {
        console.error("RAG retrieval failed, proceeding without:", ragErr);
      }
    }

    if (stream) {
      const streamResponse = await streamAgentResponse(
        agentConfig,
        conversationHistory,
        message,
        undefined,
        auth.orgId
      );

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResponse) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
            );
            controller.close();
          } catch {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const enhancedHistory = [
      ...conversationHistory,
      { role: "system" as const, content: fsmConstraints + ragContext },
    ];

    const response = await generateAgentResponse(
      agentConfig,
      enhancedHistory,
      message,
      auth.orgId
    );

    if (response.inputTokens || response.outputTokens) {
      const llmCost = calculateLLMCost(
        response.model,
        response.inputTokens || 0,
        response.outputTokens || 0
      );
      logCostEvent({
        orgId: auth.orgId,
        category: "llm",
        provider: response.provider || "openai",
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        unitQuantity: (response.inputTokens || 0) + (response.outputTokens || 0),
        unitType: "tokens",
        unitCost: llmCost.costGBP,
        totalCost: llmCost.costGBP,
        revenueCharged: 0.003,
        metadata: { source: "ai_chat", agentId: body.agentId },
      }).catch(() => {});
    }

    let assistantText = response.content;
    let proposedNextState: FSMState = currentState;
    let confidenceScore = 0.8;
    let toolCalls: unknown[] = [];

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        assistantText = parsed.assistantText || response.content;
        if (isValidState(parsed.nextState)) {
          proposedNextState = parsed.nextState;
        }
        confidenceScore = typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.8;
        toolCalls = Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [];
      }
    } catch {
    }

    const piiResult = redactPII(message);
    const redactedMessage = piiResult.redactedText;

    if (ragEnabled && confidenceScore >= 0.7) {
      cacheResponse(auth.orgId, redactedMessage, assistantText, confidenceScore).catch(() => {});
    }

    const fsmContext = {
      currentState,
      turnCount,
      lastConfidence: confidenceScore,
      lowConfidenceCount: confidenceScore < fsmConfig.confidenceThreshold ? 1 : 0,
      stateRetries: {},
    };

    const transition = evaluateTransition(
      fsmContext,
      proposedNextState,
      confidenceScore,
      userRequestedHuman,
      fsmConfig
    );

    if (callLogId) {
      await db
        .update(callLogs)
        .set({
          currentState: transition.nextState,
          turnCount: turnCount + 1,
          lastConfidence: String(confidenceScore),
          handoffTriggered: transition.shouldHandoff,
          handoffReason: transition.handoffReason,
          handoffAt: transition.shouldHandoff ? new Date() : undefined,
          finalOutcome: transition.nextState === "CLOSE"
            ? "resolved"
            : transition.shouldHandoff
              ? "handoff"
              : undefined,
        })
        .where(eq(callLogs.id, callLogId));
    }

    if (!auth.isDemo && auth.orgId) {
      const aiCostPerRequest = 0.003;
      try {
        await deductFromWallet(
          auth.orgId,
          aiCostPerRequest,
          "AI chat request",
          "ai_chat",
          callLogId ? String(callLogId) : undefined
        );
      } catch (walletErr) {
        console.error("Wallet deduction failed for AI chat:", walletErr);
      }
    }

    return NextResponse.json({
      response: assistantText,
      model: response.model,
      usedFallback: response.usedFallback,
      currentState: transition.nextState,
      previousState: currentState,
      confidenceScore,
      shouldHandoff: transition.shouldHandoff,
      handoffReason: transition.handoffReason,
      allowedActions: transition.allowedActions,
      turnCount: turnCount + 1,
      toolCalls,
      ragSource,
    });
  } catch (error) {
    return handleRouteError(error, "AIChat");
  }
}
