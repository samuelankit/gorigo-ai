import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { phoneNumbers, agents } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { validateTelnyxWebhook, sendSMS } from "@/lib/telnyx";
import { searchKnowledge, buildRAGContext } from "@/lib/rag";
import { generateAgentResponse, type ConversationMessage } from "@/lib/ai";
import { createLogger } from "@/lib/logger";

const logger = createLogger("TelnyxSMS");

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const signature = request.headers.get("telnyx-signature-ed25519") || "";
    const timestamp = request.headers.get("telnyx-timestamp") || "";

    if (process.env.TELNYX_PUBLIC_KEY) {
      if (!signature || !timestamp) {
        logger.warn("Missing Telnyx SMS webhook signature headers");
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      const isValid = validateTelnyxWebhook(rawBody, signature, timestamp);
      if (!isValid) {
        logger.warn("Invalid Telnyx SMS webhook signature");
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } else if (process.env.NODE_ENV === "production") {
      logger.warn("TELNYX_PUBLIC_KEY not set — rejecting SMS webhook in production");
      return NextResponse.json({ error: "Webhook validation not configured" }, { status: 503 });
    }

    const data = (body.data as Record<string, unknown>) || {};
    const eventType = data.event_type as string || "";
    const payload = (data.payload as Record<string, unknown>) || {};

    logger.info(`Telnyx SMS webhook: ${eventType}`);

    if (eventType === "message.received") {
      return await handleInboundSMS(payload);
    }

    if (eventType === "message.sent" || eventType === "message.finalized") {
      const messageId = payload.id as string || "";
      const status = (payload.to as Array<Record<string, unknown>>)?.[0]?.status as string || "";
      logger.info("SMS delivery update", { messageId, status });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("Telnyx SMS webhook error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleInboundSMS(payload: Record<string, unknown>): Promise<NextResponse> {
  const from = (payload.from as Record<string, unknown>)?.phone_number as string || "";
  const toList = payload.to as Array<Record<string, unknown>> | undefined;
  const to = toList?.[0]?.phone_number as string || "";
  const messageBody = (payload.text as string) || "";

  logger.info("Inbound SMS received", { from, to, bodyLength: messageBody.length });

  if (!messageBody.trim()) {
    return NextResponse.json({ status: "ok" });
  }

  try {
    const [phoneRecord] = await db
      .select()
      .from(phoneNumbers)
      .where(and(eq(phoneNumbers.phoneNumber, to), eq(phoneNumbers.isActive, true)))
      .limit(1);

    if (!phoneRecord || !phoneRecord.orgId) {
      logger.warn("No phone record found for inbound SMS", { to });
      return NextResponse.json({ status: "ok" });
    }

    const orgId = phoneRecord.orgId;

    const orgAgents = await db
      .select()
      .from(agents)
      .where(and(eq(agents.orgId, orgId), eq(agents.status, "active")))
      .limit(10);

    const activeAgent = orgAgents.find(a => !a.isRouter) || orgAgents[0];

    if (!activeAgent) {
      logger.warn("No active agent found for inbound SMS", { orgId });
      return NextResponse.json({ status: "ok" });
    }

    let ragContext = "";
    let ragAvailable = false;
    try {
      const chunks = await searchKnowledge(orgId, messageBody);
      if (chunks.length > 0) {
        ragContext = buildRAGContext(chunks);
        ragAvailable = true;
      }
    } catch (ragErr) {
      logger.warn("RAG search failed for SMS", { error: ragErr instanceof Error ? ragErr.message : String(ragErr) });
    }

    const agentConfig = {
      name: activeAgent.name,
      greeting: activeAgent.greeting || "Hello!",
      businessDescription: activeAgent.businessDescription,
      roles: activeAgent.roles || "receptionist",
      faqEntries: activeAgent.faqEntries as Array<{ question: string; answer: string }> | null,
      complianceDisclosure: activeAgent.complianceDisclosure ?? true,
      negotiationEnabled: activeAgent.negotiationEnabled ?? false,
      negotiationGuardrails: activeAgent.negotiationGuardrails as any,
    };

    const hasFAQGrounding = agentConfig.faqEntries && agentConfig.faqEntries.length > 0;
    const hasBusinessContext = !!agentConfig.businessDescription;
    const hasAnyGrounding = ragAvailable || hasFAQGrounding || hasBusinessContext;

    if (!hasAnyGrounding) {
      logger.warn("NO RAG GROUNDING for SMS — refusing LLM call (compliance)", { orgId, from });
      const fallbackSMS = "Thanks for your message. Please call us during business hours for assistance.";
      await sendSMS(from, fallbackSMS, to);
      logger.info("SMS fallback reply sent (no grounding)", { from, to, orgId });
      return NextResponse.json({ status: "ok" });
    }

    const systemMessages: ConversationMessage[] = [];
    if (ragContext) {
      systemMessages.push({ role: "system", content: ragContext });
    }
    systemMessages.push({
      role: "system",
      content: "You are responding via SMS text message. Keep your response under 160 characters if possible. Be concise and helpful. Do not use emojis excessively. Only answer based on the provided knowledge base, FAQ, or business context. NEVER fabricate information. If you cannot answer, suggest calling the business."
    });

    const aiResponse = await generateAgentResponse(agentConfig, systemMessages, messageBody, orgId);

    let responseText = aiResponse.content;
    if (responseText.length > 1600) {
      responseText = responseText.substring(0, 1597) + "...";
    }

    await sendSMS(from, responseText, to);
    logger.info("SMS auto-reply sent", { from, to, orgId });
  } catch (err) {
    logger.error("Failed to handle inbound SMS", err instanceof Error ? err : undefined);
  }

  return NextResponse.json({ status: "ok" });
}
