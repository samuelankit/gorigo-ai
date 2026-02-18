import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { partners, affiliates, affiliateCommissions, wallets, partnerLifecycleEvents, partnerAgreements } from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const settlementSchema = z.object({
  action: z.enum(["preview", "execute"]),
  clawbackDays: z.number().int().min(0).max(365).default(0),
  forceSettle: z.boolean().default(false),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { id } = await params;
    const partnerId = parseInt(id, 10);
    if (isNaN(partnerId)) {
      return NextResponse.json({ error: "Invalid partner ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = settlementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const { action, clawbackDays, forceSettle } = parsed.data;

    const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    if (!forceSettle && partner.status !== "terminated" && partner.status !== "suspended") {
      return NextResponse.json({ error: "Settlement only available for terminated or suspended partners. Use forceSettle to override." }, { status: 400 });
    }

    const [agreement] = await db.select().from(partnerAgreements).where(and(eq(partnerAgreements.partnerId, partnerId), eq(partnerAgreements.status, "active"))).limit(1);

    const effectiveClawbackDays = agreement?.commissionClawbackDays || clawbackDays;
    const clawbackDate = new Date();
    clawbackDate.setDate(clawbackDate.getDate() - effectiveClawbackDays);

    const partnerAffiliates = await db
      .select({ id: affiliates.id, name: affiliates.name })
      .from(affiliates)
      .where(and(eq(affiliates.ownerType, "partner"), eq(affiliates.ownerId, partnerId)));

    const affiliateIds = partnerAffiliates.map(a => a.id);

    let pendingCommissions: any[] = [];
    let clawbackCommissions: any[] = [];

    if (affiliateIds.length > 0) {
      pendingCommissions = await db
        .select()
        .from(affiliateCommissions)
        .where(and(
          sql`${affiliateCommissions.affiliateId} = ANY(${affiliateIds})`,
          sql`${affiliateCommissions.status} IN ('pending', 'frozen')`,
        ));

      if (effectiveClawbackDays > 0) {
        clawbackCommissions = await db
          .select()
          .from(affiliateCommissions)
          .where(and(
            sql`${affiliateCommissions.affiliateId} = ANY(${affiliateIds})`,
            eq(affiliateCommissions.status, "paid"),
            sql`${affiliateCommissions.paidAt} >= ${clawbackDate}`,
          ));
      }
    }

    const pendingTotal = pendingCommissions.reduce((sum: number, c: any) => sum + parseFloat(c.amount || "0"), 0);
    const clawbackTotal = clawbackCommissions.reduce((sum: number, c: any) => sum + parseFloat(c.amount || "0"), 0);

    let partnerWalletBalance = "0.00";
    if (partner.orgId) {
      const [wallet] = await db.select().from(wallets).where(eq(wallets.orgId, partner.orgId)).limit(1);
      if (wallet) partnerWalletBalance = wallet.balance || "0.00";
    }

    const settlement = {
      partnerId,
      partnerName: partner.name,
      partnerStatus: partner.status,
      affiliateCount: affiliateIds.length,
      pendingCommissions: {
        count: pendingCommissions.length,
        total: pendingTotal.toFixed(2),
      },
      clawbackCommissions: {
        count: clawbackCommissions.length,
        total: clawbackTotal.toFixed(2),
        clawbackPeriodDays: effectiveClawbackDays,
        clawbackCutoffDate: clawbackDate.toISOString(),
      },
      partnerWalletBalance,
      netSettlement: (pendingTotal - clawbackTotal).toFixed(2),
      agreement: agreement ? {
        id: agreement.id,
        noticePeriodDays: agreement.noticePeriodDays,
        clawbackPeriodDays: agreement.clawbackPeriodDays,
        dataRetentionDays: agreement.dataRetentionDays,
      } : null,
    };

    if (action === "preview") {
      return NextResponse.json({ settlement, mode: "preview" });
    }

    for (const comm of pendingCommissions) {
      await db
        .update(affiliateCommissions)
        .set({ status: "cancelled" })
        .where(eq(affiliateCommissions.id, comm.id));
    }

    for (const comm of clawbackCommissions) {
      await db
        .update(affiliateCommissions)
        .set({ status: "clawed_back" })
        .where(eq(affiliateCommissions.id, comm.id));
    }

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "partner.settlement_executed",
      entityType: "partner",
      entityId: partnerId,
      details: settlement,
    });

    await db.insert(partnerLifecycleEvents).values({
      partnerId,
      eventType: "settlement_executed",
      fromStatus: partner.status,
      toStatus: partner.status,
      reason: `Settlement executed: ${pendingCommissions.length} pending cancelled, ${clawbackCommissions.length} clawed back`,
      initiatedBy: auth!.user.id,
      affectedAffiliates: affiliateIds.length,
      metadata: settlement,
    });

    return NextResponse.json({
      settlement,
      mode: "executed",
      message: `Settlement complete. ${pendingCommissions.length} pending commissions cancelled ($${pendingTotal.toFixed(2)}). ${clawbackCommissions.length} commissions clawed back ($${clawbackTotal.toFixed(2)}).`,
    });
  } catch (error) {
    return handleRouteError(error, "PartnerSettlement");
  }
}
