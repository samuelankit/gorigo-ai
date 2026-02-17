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
import { validateLLMOutput, validateStreamChunk, KNOWLEDGE_ONLY_REFUSAL, RAG_GROUNDING_INSTRUCTION } from "@/lib/output-guard";

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

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function checkFaqRelevance(
  userMessage: string,
  faqEntries: Array<{ question: string; answer: string }> | null
): boolean {
  if (!faqEntries || faqEntries.length === 0) return false;
  const messageLower = userMessage.toLowerCase();
  const messageWords = messageLower.split(/\s+/).filter((w) => w.length > 2);

  for (const faq of faqEntries) {
    const questionLower = faq.question.toLowerCase();
    const questionWords = questionLower.split(/\s+/).filter((w) => w.length > 2);
    const matchingWords = messageWords.filter((w) => questionWords.includes(w));
    if (matchingWords.length >= 2 || (questionWords.length <= 3 && matchingWords.length >= 1)) {
      return true;
    }
  }
  return false;
}

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
    let existingTranscript = "";
    if (callLogId) {
      const [log] = await db
        .select()
        .from(callLogs)
        .where(and(eq(callLogs.id, callLogId), eq(callLogs.orgId, auth.orgId)))
        .limit(1);
      if (log) {
        turnCount = log.turnCount ?? 0;
        existingTranscript = log.transcript || "";
      }
    }

    const maxTokensPerSession = agent.maxTokensPerSession ?? 16384;
    const sessionTokenUsage = estimateTokens(
      conversationHistory.map((m) => m.content).join(" ") + " " + message
    );
    if (sessionTokenUsage > maxTokensPerSession) {
      return NextResponse.json({
        response: "This conversation has reached its token limit. Please start a new conversation to continue.",
        currentState: "CLOSE",
        confidenceScore: 1.0,
        tokenBudgetExceeded: true,
      });
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

    const [hasKnowledge] = await db
      .select({ total: count() })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.orgId, auth.orgId));
    const ragEnabled = Number(hasKnowledge.total) > 0;
    const strictMode = agent.strictKnowledgeMode ?? false;

    let ragContext = "";
    let cacheHit = false;
    let ragSource = "llm";

    if (ragEnabled && !stream) {
      try {
        const cached = await checkResponseCache(auth.orgId, message);
        if (cached.hit && cached.response) {
          cacheHit = true;
          ragSource = "cache";

          const outputCheck = validateLLMOutput(cached.response, "", { strictGrounding: false });
          const safeResponse = outputCheck.safe ? cached.response : (outputCheck.sanitizedResponse || KNOWLEDGE_ONLY_REFUSAL);

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
            response: safeResponse,
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

    const hasFaqMatch = checkFaqRelevance(message, agentConfig.faqEntries);

    if (strictMode && ragEnabled && !ragContext && !hasFaqMatch && !userRequestedHuman && !stream) {
      return NextResponse.json({
        response: KNOWLEDGE_ONLY_REFUSAL,
        currentState,
        confidenceScore: 0.0,
        ragSource: "strict_refusal",
        strictKnowledgeBlocked: true,
      });
    }

    const groundingRule = (strictMode || ragEnabled) ? RAG_GROUNDING_INSTRUCTION : "";

    const fsmConstraints = `
Current FSM State: ${currentState}
Allowed Actions: ${allowedActions.join(", ")}
Turn: ${turnCount + 1}/${fsmConfig.maxTurns}
Rules:
- Stay within your allowed actions for this state
- If the user requests a human, acknowledge and prepare for handoff
- Provide a confidence score (0.0-1.0) for your understanding of the user's intent
- Suggest the next state from: GREETING, INTENT_CAPTURE, CONFIRM, EXECUTE, CLOSE, HANDOFF, FAILSAFE
${groundingRule}
Respond in JSON format: {"assistantText": "...", "nextState": "...", "confidenceScore": 0.0-1.0, "toolCalls": []}`;

    if (stream) {
      const streamHistory = ragContext
        ? [...conversationHistory, { role: "system" as const, content: fsmConstraints + ragContext }]
        : conversationHistory;

      const streamResponse = await streamAgentResponse(
        agentConfig,
        streamHistory,
        message,
        undefined,
        auth.orgId
      );

      const encoder = new TextEncoder();
      let fullStreamResponse = "";
      let streamBlocked = false;

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResponse) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                const streamCheck = validateStreamChunk(content, fullStreamResponse);
                if (!streamCheck.safe) {
                  streamBlocked = true;
                  console.warn("[AI Chat] Output guard blocked stream:", streamCheck.reason);
                  break;
                }

                fullStreamResponse += content;

                if (fullStreamResponse.length > 2000) {
                  break;
                }

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
            );
            controller.close();
          } catch (error) {
            console.error("AI chat stream error:", error);
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
      }).catch((error) => { console.error("Track AI chat usage cost failed:", error); });
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
    } catch (error) {
      console.error("AI chat JSON parse error:", error);
    }

    const outputCheck = validateLLMOutput(assistantText, ragContext, {
      strictGrounding: strictMode,
      maxResponseLength: 2000,
    });
    if (!outputCheck.safe) {
      console.warn(`[AI Chat] Output guard blocked response for org ${auth.orgId}: ${outputCheck.reason}`);
      assistantText = outputCheck.sanitizedResponse || KNOWLEDGE_ONLY_REFUSAL;
    }

    const piiResult = redactPII(message);
    const redactedMessage = piiResult.redactedText;

    if (ragEnabled && confidenceScore >= 0.7 && outputCheck.safe) {
      cacheResponse(auth.orgId, redactedMessage, assistantText, confidenceScore).catch((error) => { console.error("Cache AI chat response failed:", error); });
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
      try {
        const { calculateUsageCost } = await import("@/lib/billing");
        const AI_CHAT_EQUIVALENT_SECONDS = 15;
        const billing = await calculateUsageCost(auth.orgId, AI_CHAT_EQUIVALENT_SECONDS, "ai_chat");
        if (billing.cost > 0) {
          await deductFromWallet(
            auth.orgId,
            billing.cost,
            `AI chat request (${billing.deploymentModel} @ \u00a3${billing.ratePerMinute}/min)`,
            "ai_chat",
            callLogId ? String(callLogId) : undefined
          );
        }
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
