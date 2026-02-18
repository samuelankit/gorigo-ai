import { db } from "@/lib/db";
import { unifiedContacts, omnichannelConversations } from "@/shared/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const { primaryId, secondaryId } = await request.json();
    if (!primaryId || !secondaryId) {
      return NextResponse.json({ error: "primaryId and secondaryId are required" }, { status: 400 });
    }

    const [primary] = await db.select().from(unifiedContacts).where(eq(unifiedContacts.id, primaryId)).limit(1);
    const [secondary] = await db.select().from(unifiedContacts).where(eq(unifiedContacts.id, secondaryId)).limit(1);
    if (!primary || !secondary) {
      return NextResponse.json({ error: "One or both contacts not found" }, { status: 404 });
    }

    await db
      .update(omnichannelConversations)
      .set({ contactId: primaryId })
      .where(eq(omnichannelConversations.contactId, secondaryId));

    const existingMerged = (primary.mergedFromIds as number[]) || [];
    const secondaryMerged = (secondary.mergedFromIds as number[]) || [];
    const allIds = [...existingMerged, ...secondaryMerged, secondaryId];
    const mergedIds = allIds.filter((v, i, a) => a.indexOf(v) === i);

    const [updated] = await db
      .update(unifiedContacts)
      .set({
        mergedFromIds: mergedIds,
        totalInteractions: (primary.totalInteractions || 0) + (secondary.totalInteractions || 0),
      })
      .where(eq(unifiedContacts.id, primaryId))
      .returning();

    await db.delete(unifiedContacts).where(eq(unifiedContacts.id, secondaryId));

    return NextResponse.json({ merged: updated });
  } catch (error) {
    console.error("Omnichannel contact merge error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
