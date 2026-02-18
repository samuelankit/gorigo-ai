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
    if (primaryId === secondaryId) {
      return NextResponse.json({ error: "Cannot merge a contact with itself" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [primary] = await tx.select().from(unifiedContacts).where(eq(unifiedContacts.id, primaryId)).limit(1);
      const [secondary] = await tx.select().from(unifiedContacts).where(eq(unifiedContacts.id, secondaryId)).limit(1);
      if (!primary || !secondary) {
        throw new Error("NOT_FOUND");
      }

      await tx
        .update(omnichannelConversations)
        .set({ contactId: primaryId })
        .where(eq(omnichannelConversations.contactId, secondaryId));

      const existingMerged = (primary.mergedFromIds as number[]) || [];
      const secondaryMerged = (secondary.mergedFromIds as number[]) || [];
      const allIds = [...existingMerged, ...secondaryMerged, secondaryId];
      const mergedIds = allIds.filter((v, i, a) => a.indexOf(v) === i);

      const [updated] = await tx
        .update(unifiedContacts)
        .set({
          mergedFromIds: mergedIds,
          totalInteractions: (primary.totalInteractions || 0) + (secondary.totalInteractions || 0),
        })
        .where(eq(unifiedContacts.id, primaryId))
        .returning();

      await tx
        .update(unifiedContacts)
        .set({
          displayName: `[MERGED] ${secondary.displayName || ""}`,
          mergedFromIds: [primaryId],
        })
        .where(eq(unifiedContacts.id, secondaryId));

      return updated;
    });

    return NextResponse.json({ merged: result });
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") {
      return NextResponse.json({ error: "One or both contacts not found" }, { status: 404 });
    }
    console.error("Omnichannel contact merge error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
