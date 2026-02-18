import { db } from "@/lib/db";
import { unifiedContacts, omnichannelConversations } from "@/shared/schema";
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
    const contactId = parseInt(id);

    const [contact] = await db.select().from(unifiedContacts).where(eq(unifiedContacts.id, contactId)).limit(1);
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    const conversations = await db
      .select()
      .from(omnichannelConversations)
      .where(eq(omnichannelConversations.contactId, contactId))
      .orderBy(desc(omnichannelConversations.lastMessageAt))
      .limit(20);

    return NextResponse.json({ contact, conversations });
  } catch (error) {
    console.error("Omnichannel contact get error:", error);
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
    const [updated] = await db.update(unifiedContacts).set(body).where(eq(unifiedContacts.id, parseInt(id))).returning();
    if (!updated) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Omnichannel contact update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
