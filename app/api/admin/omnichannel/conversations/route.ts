import { db } from "@/lib/db";
import { omnichannelConversations, unifiedContacts } from "@/shared/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const url = request.nextUrl;
    const orgId = url.searchParams.get("orgId");
    const status = url.searchParams.get("status");
    const channelType = url.searchParams.get("channelType");
    const priority = url.searchParams.get("priority");
    const assignedTo = url.searchParams.get("assignedTo");
    const isUnread = url.searchParams.get("isUnread");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const conditions = [];
    if (orgId) conditions.push(eq(omnichannelConversations.orgId, parseInt(orgId)));
    if (status) conditions.push(eq(omnichannelConversations.status, status));
    if (channelType) conditions.push(eq(omnichannelConversations.channelType, channelType));
    if (priority) conditions.push(eq(omnichannelConversations.priority, parseInt(priority)));
    if (assignedTo) conditions.push(eq(omnichannelConversations.assignedHumanAgentId, parseInt(assignedTo)));
    if (isUnread !== null && isUnread !== undefined) {
      conditions.push(eq(omnichannelConversations.isUnread, isUnread === "true"));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ total: count() }).from(omnichannelConversations).where(where);

    const conversations = await db
      .select({
        conversation: omnichannelConversations,
        contactDisplayName: unifiedContacts.displayName,
        contactPhone: unifiedContacts.primaryPhone,
        contactEmail: unifiedContacts.primaryEmail,
      })
      .from(omnichannelConversations)
      .leftJoin(unifiedContacts, eq(omnichannelConversations.contactId, unifiedContacts.id))
      .where(where)
      .orderBy(desc(omnichannelConversations.lastMessageAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        ...c.conversation,
        contactDisplayName: c.contactDisplayName,
        contactPhone: c.contactPhone,
        contactEmail: c.contactEmail,
      })),
      total: Number(totalResult.total),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Omnichannel conversations list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const body = await request.json();
    const [conversation] = await db.insert(omnichannelConversations).values(body).returning();
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Omnichannel conversation create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
