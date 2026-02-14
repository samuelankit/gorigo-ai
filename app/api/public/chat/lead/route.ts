import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { chatLeads, chatMessages } from "@/shared/schema";
import { checkBodySize } from "@/lib/body-limit";

const leadRateStore = new Map<string, { count: number; resetAt: number }>();
const LEAD_WINDOW_MS = 300_000;
const LEAD_MAX_REQUESTS = 5;

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  leadRateStore.forEach((entry, key) => {
    if (entry.resetAt <= now) leadRateStore.delete(key);
  });
}, 60_000);
if (cleanupInterval.unref) cleanupInterval.unref();

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
    if (!checkLeadRateLimit(req)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const sizeError = checkBodySize(req, 10 * 1024);
    if (sizeError) return sizeError;

    const body = await req.json();
    const { name, email } = body as { name: string; email: string };

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

    const [lead] = await db.insert(chatLeads).values({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      ipAddress: ip,
      status: "new",
      totalMessages: 1,
      lastMessageAt: new Date(),
    }).returning();

    const greeting = `Hi ${name.trim().split(" ")[0]}! I'm GoRigo, your AI assistant. How can I help you today?`;

    await db.insert(chatMessages).values({
      leadId: lead.id,
      role: "assistant",
      content: greeting,
    });

    return NextResponse.json({
      leadId: lead.id,
      greeting,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
