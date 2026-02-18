import { db } from "@/lib/db";
import { omnichannelConversations, omnichannelMessages, unifiedContacts } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
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

    const [conversation] = await db
      .select()
      .from(omnichannelConversations)
      .where(eq(omnichannelConversations.id, conversationId))
      .limit(1);

    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const [contact] = await db
      .select()
      .from(unifiedContacts)
      .where(eq(unifiedContacts.id, conversation.contactId))
      .limit(1);

    const messages = await db
      .select()
      .from(omnichannelMessages)
      .where(eq(omnichannelMessages.conversationId, conversationId))
      .orderBy(desc(omnichannelMessages.createdAt))
      .limit(50);

    return NextResponse.json({ conversation, contact, messages });
  } catch (error) {
    console.error("Omnichannel conversation get error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const [updated] = await db
      .update(omnichannelConversations)
      .set(body)
      .where(eq(omnichannelConversations.id, parseInt(id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Omnichannel conversation update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
