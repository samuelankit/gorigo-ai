import { db } from "@/lib/db";
import { omnichannelMessages, omnichannelConversations } from "@/shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const { id } = await params;
    const conversationId = parseInt(id);
    const url = request.nextUrl;
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const messages = await db
      .select()
      .from(omnichannelMessages)
      .where(eq(omnichannelMessages.conversationId, conversationId))
      .orderBy(desc(omnichannelMessages.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ messages, limit, offset });
  } catch (error) {
    return handleRouteError(error, "OmnichannelMessages");
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const { id } = await params;
    const conversationId = parseInt(id);

    const [conversation] = await db
      .select()
      .from(omnichannelConversations)
      .where(eq(omnichannelConversations.id, conversationId))
      .limit(1);

    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const { direction, senderType, senderId, content, mediaType, mediaUrl } = await request.json();
    if (!direction || !senderType) {
      return NextResponse.json({ error: "direction and senderType are required" }, { status: 400 });
    }

    const [message] = await db
      .insert(omnichannelMessages)
      .values({
        conversationId,
        orgId: conversation.orgId,
        direction,
        senderType,
        senderId,
        content,
        mediaType,
        mediaUrl,
        status: "sent",
      })
      .returning();

    const isCustomerMessage = senderType === "customer";
    await db
      .update(omnichannelConversations)
      .set({
        lastMessageAt: new Date(),
        messageCount: sql`${omnichannelConversations.messageCount} + 1`,
        isUnread: isCustomerMessage,
        ...(isCustomerMessage ? { lastCustomerMessageAt: new Date() } : {}),
      })
      .where(eq(omnichannelConversations.id, conversationId));

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "OmnichannelMessages");
  }
}
