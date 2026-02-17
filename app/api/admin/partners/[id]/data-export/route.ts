import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { partners, partnerClients, affiliates, affiliateClicks, affiliateCommissions, partnerAgreements, partnerLifecycleEvents, orgs, wallets } from "@/shared/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const isUnderLegalHold = partner.legalHold || false;

    const clients = await db
      .select({
        id: partnerClients.id,
        orgId: partnerClients.orgId,
        orgName: orgs.name,
        status: partnerClients.status,
        retailRate: partnerClients.retailRatePerMinute,
        joinedAt: partnerClients.assignedAt,
      })
      .from(partnerClients)
      .leftJoin(orgs, eq(orgs.id, partnerClients.orgId))
      .where(eq(partnerClients.partnerId, partnerId));

    const affiliateData = await db
      .select()
      .from(affiliates)
      .where(and(eq(affiliates.ownerType, "partner"), eq(affiliates.ownerId, partnerId)));

    const affiliateIds = affiliateData.map(a => a.id);
    let links: any[] = [];
    let commissions: any[] = [];

    if (affiliateIds.length > 0) {
      links = await db
        .select()
        .from(affiliateClicks)
        .where(sql`${affiliateClicks.affiliateId} = ANY(${affiliateIds})`);

      commissions = await db
        .select()
        .from(affiliateCommissions)
        .where(sql`${affiliateCommissions.affiliateId} = ANY(${affiliateIds})`);
    }

    const agreements = await db
      .select()
      .from(partnerAgreements)
      .where(eq(partnerAgreements.partnerId, partnerId));

    const lifecycleEvents = await db
      .select()
      .from(partnerLifecycleEvents)
      .where(eq(partnerLifecycleEvents.partnerId, partnerId))
      .orderBy(sql`${partnerLifecycleEvents.createdAt} DESC`);

    const resellers = await db
      .select({ id: partners.id, name: partners.name, status: partners.status })
      .from(partners)
      .where(eq(partners.parentPartnerId, partnerId));

    let walletData = null;
    if (partner.orgId) {
      const [w] = await db.select().from(wallets).where(eq(wallets.orgId, partner.orgId)).limit(1);
      walletData = w || null;
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: auth!.user.email,
      legalHold: isUnderLegalHold,
      legalHoldWarning: isUnderLegalHold ? "THIS DATA IS UNDER LEGAL HOLD. Do not delete or modify until hold is released." : null,
      partner: {
        ...partner,
      },
      clients: clients.map(c => ({
        ...c,
      })),
      affiliates: affiliateData.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        status: a.status,
        commissionRate: a.commissionRate,
      })),
      affiliateClicks: links.map(l => ({
        id: l.id,
        affiliateId: l.affiliateId,
        landingPage: l.landingPage,
        convertedToSignup: l.convertedToSignup,
        createdAt: l.createdAt,
      })),
      commissions: commissions.map(c => ({
        id: c.id,
        affiliateId: c.affiliateId,
        amount: c.amount,
        status: c.status,
        createdAt: c.createdAt,
      })),
      agreements,
      lifecycleEvents,
      resellers,
      wallet: walletData ? {
        balance: walletData.balance,
        isActive: walletData.isActive,
        currency: walletData.currency,
      } : null,
      summary: {
        totalClients: clients.length,
        activeClients: clients.filter(c => c.status === "active").length,
        totalAffiliates: affiliateData.length,
        totalCommissions: commissions.length,
        totalCommissionValue: commissions.reduce((sum, c) => sum + parseFloat(c.amount || "0"), 0).toFixed(2),
        totalResellers: resellers.length,
        totalLifecycleEvents: lifecycleEvents.length,
      },
    };

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "partner.data_exported",
      entityType: "partner",
      entityId: partnerId,
      details: { summary: exportData.summary },
    });

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="partner-${partnerId}-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Partner data export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
