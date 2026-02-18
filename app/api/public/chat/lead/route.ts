import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { chatLeads, chatMessages, publicConversations } from "@/shared/schema";
import { checkBodySize } from "@/lib/body-limit";
import { eq, sql } from "drizzle-orm";
import { publicLimiter } from "@/lib/rate-limit";
import { enrichLead } from "@/lib/enrichment-engine";
import { handleRouteError } from "@/lib/api-error";

const leadRateStore = new Map<string, { count: number; resetAt: number }>();
const LEAD_WINDOW_MS = 300_000;
const LEAD_MAX_REQUESTS = 5;

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  leadRateStore.forEach((entry, key) => {
    if (entry.resetAt <= now) leadRateStore.delete(key);
  });
}, 60_000);
if (typeof cleanupInterval === "object" && cleanupInterval && "unref" in cleanupInterval) {
  (cleanupInterval as NodeJS.Timeout).unref();
}

function checkLeadRateLimit(req: NextRequest): boolean {
  const cfIp = req.headers.get("cf-connecting-ip");
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = cfIp || forwarded?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const existing = leadRateStore.get(ip);

  if (!existing || existing.resetAt <= now) {
    if (leadRateStore.size >= 5000) {
      const oldest = leadRateStore.keys().next().value;
      if (oldest) leadRateStore.delete(oldest);
    }
    leadRateStore.set(ip, { count: 1, resetAt: now + LEAD_WINDOW_MS });
    return true;
  }
  if (existing.count < LEAD_MAX_REQUESTS) {
    existing.count++;
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const rl = await publicLimiter(req);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (!checkLeadRateLimit(req)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const sizeError = checkBodySize(req, 10 * 1024);
    if (sizeError) return sizeError;

    const body = await req.json();
    const { name, email, sessionId } = body as { name: string; email: string; sessionId?: string };

    if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100) {
      return NextResponse.json({ error: "Valid name is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const cfIp = req.headers.get("cf-connecting-ip");
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = cfIp || forwarded?.split(",")[0]?.trim() || null;

    const normalizedEmail = email.trim().toLowerCase();
    const [existingLead] = await db
      .select({ id: chatLeads.id })
      .from(chatLeads)
      .where(eq(chatLeads.email, normalizedEmail))
      .limit(1);

    if (existingLead) {
      await db
        .update(chatLeads)
        .set({ totalMessages: sql`COALESCE(${chatLeads.totalMessages}, 0) + 1`, lastMessageAt: new Date() })
        .where(eq(chatLeads.id, existingLead.id));

      const greeting = `Welcome back, ${name.trim().split(" ")[0]}! How can I help you today?`;
      await db.insert(chatMessages).values({
        leadId: existingLead.id,
        role: "assistant",
        content: greeting,
      });

      if (sessionId && typeof sessionId === "string" && sessionId.length <= 100) {
        await db
          .update(publicConversations)
          .set({ leadId: existingLead.id })
          .where(eq(publicConversations.sessionId, sessionId))
          .catch((err: unknown) => { console.error("[Lead] Failed to link conversation:", err); });
      }

      return NextResponse.json({ leadId: existingLead.id, greeting });
    }

    const [lead] = await db.insert(chatLeads).values({
      name: name.trim(),
      email: normalizedEmail,
      ipAddress: ip,
      status: "new",
      pipelineStage: "new",
      sourceChannel: "chatbot",
      totalMessages: 1,
      lastMessageAt: new Date(),
    }).returning();

    if (sessionId && typeof sessionId === "string" && sessionId.length <= 100) {
      try {
        await db
          .update(publicConversations)
          .set({ leadId: lead.id })
          .where(eq(publicConversations.sessionId, sessionId));
      } catch (err) {
        console.error("[Lead] Failed to link conversation:", err);
      }
    }

    const greeting = `Hi ${name.trim().split(" ")[0]}! I'm GoRigo, your AI assistant. How can I help you today?`;

    await db.insert(chatMessages).values({
      leadId: lead.id,
      role: "assistant",
      content: greeting,
    });

    enrichLead(lead.id).catch((err: unknown) => {
      console.error("[Lead] Auto-enrichment failed:", err);
    });

    return NextResponse.json({
      leadId: lead.id,
      greeting,
    });
  } catch (error) {
    return handleRouteError(error, "PublicChatLead");
  }
}
