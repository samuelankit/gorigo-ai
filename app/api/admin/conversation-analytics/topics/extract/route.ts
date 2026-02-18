import { db } from "@/lib/db";
import { callLogs, callTopics } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const TOPIC_DICTIONARY = [
  "billing", "refund", "complaint", "support", "technical",
  "pricing", "cancellation", "upgrade", "delivery", "account",
  "password", "payment", "shipping", "return", "warranty",
  "quality", "service", "appointment", "schedule", "emergency",
  "invoice", "subscription", "renewal", "discount", "promotion",
  "outage", "downtime", "error", "bug", "issue",
  "onboarding", "training", "demo", "trial", "integration",
  "security", "privacy", "compliance", "fraud", "dispute",
  "transfer", "escalation", "callback", "voicemail", "hold",
  "satisfaction", "feedback", "survey", "rating", "review",
  "contract", "agreement", "terms", "policy", "regulation",
  "feature", "request", "suggestion", "improvement", "update",
];

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const body = await request.json();
    const { callLogId, orgId } = body;

    if (!callLogId || !orgId) {
      return NextResponse.json({ error: "callLogId and orgId are required" }, { status: 400 });
    }

    const [call] = await db
      .select({ id: callLogs.id, transcript: callLogs.transcript, sentimentLabel: callLogs.sentimentLabel })
      .from(callLogs)
      .where(and(eq(callLogs.id, callLogId), eq(callLogs.orgId, orgId)))
      .limit(1);

    if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
    if (!call.transcript) return NextResponse.json({ error: "No transcript available" }, { status: 400 });

    const transcriptLower = call.transcript.toLowerCase();
    const words = transcriptLower.split(/\W+/);

    const detectedTopics: { topic: string; mentions: number; confidence: number }[] = [];

    for (const topic of TOPIC_DICTIONARY) {
      const mentions = words.filter((w) => w === topic).length;
      if (mentions > 0) {
        const confidence = Math.min(0.5 + (mentions * 0.1), 1.0);
        detectedTopics.push({ topic, mentions, confidence: Math.round(confidence * 100) / 100 });
      }
    }

    if (detectedTopics.length === 0) {
      return NextResponse.json({ extracted: 0, topics: [] });
    }

    const existingTopics = await db
      .select({ topic: callTopics.topic })
      .from(callTopics)
      .where(and(eq(callTopics.callLogId, callLogId), eq(callTopics.orgId, orgId)));
    const existingSet = new Set(existingTopics.map((t) => t.topic));
    const newTopics = detectedTopics.filter((t) => !existingSet.has(t.topic));

    if (newTopics.length === 0) {
      return NextResponse.json({ extracted: 0, topics: [], message: "All topics already extracted" });
    }

    const insertValues = newTopics.map((t) => ({
      callLogId: callLogId as number,
      orgId: orgId as number,
      topic: t.topic,
      confidence: String(t.confidence),
      sentiment: call.sentimentLabel ?? "neutral",
      isResolved: false,
      mentions: t.mentions,
    }));

    await db.insert(callTopics).values(insertValues);

    return NextResponse.json({
      extracted: detectedTopics.length,
      topics: detectedTopics,
    });
  } catch (error: any) {
    console.error("Topic extraction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
