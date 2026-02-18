import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { publicConversations } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { publicLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

const endRateStore = new Map<string, { count: number; resetAt: number }>();
const END_WINDOW_MS = 60_000;
const END_MAX_REQUESTS = 20;

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  endRateStore.forEach((entry, key) => {
    if (entry.resetAt <= now) endRateStore.delete(key);
  });
}, 60_000);
(cleanupInterval as unknown as { unref?: () => void })?.unref?.();

function checkEndRateLimit(req: NextRequest): boolean {
  const cfIp = req.headers.get("cf-connecting-ip");
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = cfIp || forwarded?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const existing = endRateStore.get(ip);

  if (!existing || existing.resetAt <= now) {
    if (endRateStore.size >= 5000) {
      const oldest = endRateStore.keys().next().value;
      if (oldest) endRateStore.delete(oldest);
    }
    endRateStore.set(ip, { count: 1, resetAt: now + END_WINDOW_MS });
    return true;
  }
  if (existing.count < END_MAX_REQUESTS) {
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

    if (!checkEndRateLimit(req)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { sessionId, duration } = body as {
      sessionId: string;
      duration?: number;
    };

    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 100) {
      return NextResponse.json({ error: "Valid sessionId is required" }, { status: 400 });
    }

    const [conversation] = await db
      .select()
      .from(publicConversations)
      .where(eq(publicConversations.sessionId, sessionId))
      .limit(1);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.status === "ended") {
      return NextResponse.json({ success: true, alreadyEnded: true });
    }

    const updateValues: Record<string, unknown> = {
      status: "ended",
      endedAt: new Date(),
    };

    if (typeof duration === "number" && duration >= 0 && duration <= 86400) {
      updateValues.duration = Math.round(duration);
    }

    await db
      .update(publicConversations)
      .set(updateValues)
      .where(eq(publicConversations.id, conversation.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError(err, "PublicChatEnd");
  }
}
