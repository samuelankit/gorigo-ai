import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { chatMessages } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { publicLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const rl = await publicLimiter(req);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { messageId, rating } = body as { messageId: number; rating: number };

    if (!messageId || typeof messageId !== "number") {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    if (rating !== 1 && rating !== -1) {
      return NextResponse.json({ error: "Rating must be 1 or -1" }, { status: 400 });
    }

    await db.update(chatMessages).set({ rating }).where(eq(chatMessages.id, messageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "PublicChatRate");
  }
}
