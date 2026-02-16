import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { publicConversations, chatMessages, chatLeads } from "@/shared/schema";
import { eq, asc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await adminLimiter(req);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = parseInt(id);
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const results = await db
      .select({
        id: publicConversations.id,
        sessionId: publicConversations.sessionId,
        channel: publicConversations.channel,
        status: publicConversations.status,
        messageCount: publicConversations.messageCount,
        ipAddress: publicConversations.ipAddress,
        userAgent: publicConversations.userAgent,
        leadId: publicConversations.leadId,
        startedAt: publicConversations.startedAt,
        endedAt: publicConversations.endedAt,
        duration: publicConversations.duration,
        leadName: chatLeads.name,
        leadEmail: chatLeads.email,
      })
      .from(publicConversations)
      .leftJoin(chatLeads, eq(publicConversations.leadId, chatLeads.id))
      .where(eq(publicConversations.id, conversationId));

    if (results.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const conversation = results[0];

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(asc(chatMessages.createdAt));

    return NextResponse.json({ conversation, messages });
  } catch (err) {
    console.error("Admin conversation detail error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
