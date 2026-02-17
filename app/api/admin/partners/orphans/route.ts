import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { partners, partnerClients, affiliates, orgs } from "@/shared/schema";
import { eq, and, sql, isNull, count } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
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

    const orphanedResellers = await db
      .select({
        id: partners.id,
        name: partners.name,
        status: partners.status,
        parentPartnerId: partners.parentPartnerId,
        createdAt: partners.createdAt,
      })
      .from(partners)
      .where(and(
        eq(partners.partnerType, "reseller"),
        sql`${partners.parentPartnerId} IS NOT NULL`,
        sql`${partners.parentPartnerId} NOT IN (SELECT id FROM ${partners})`,
      ));

    const suspendedPartnerClients = await db
      .select({
        clientId: partnerClients.id,
        orgId: partnerClients.orgId,
        orgName: orgs.name,
        clientStatus: partnerClients.status,
        partnerId: partnerClients.partnerId,
        partnerName: partners.name,
        partnerStatus: partners.status,
      })
      .from(partnerClients)
      .innerJoin(partners, eq(partners.id, partnerClients.partnerId))
      .leftJoin(orgs, eq(orgs.id, partnerClients.orgId))
      .where(and(
        eq(partnerClients.status, "active"),
        sql`${partners.status} IN ('suspended', 'terminated')`,
      ));

    const deadOwnerAffiliates = await db
      .select({
        id: affiliates.id,
        name: affiliates.name,
        email: affiliates.email,
        status: affiliates.status,
        ownerType: affiliates.ownerType,
        ownerId: affiliates.ownerId,
      })
      .from(affiliates)
      .where(and(
        eq(affiliates.ownerType, "partner"),
        eq(affiliates.status, "active"),
        sql`${affiliates.ownerId} NOT IN (SELECT id FROM ${partners} WHERE status = 'active')`,
      ));

    const inactivePartners = await db
      .select({
        id: partners.id,
        name: partners.name,
        status: partners.status,
        updatedAt: partners.updatedAt,
        autoSuspendAfterDays: partners.autoSuspendAfterDays,
      })
      .from(partners)
      .where(and(
        eq(partners.status, "active"),
        sql`${partners.updatedAt} < NOW() - INTERVAL '60 days'`,
      ));

    const approachingInactivity = inactivePartners.map(p => {
      const daysSinceUpdate = p.updatedAt
        ? Math.floor((Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const threshold = p.autoSuspendAfterDays || 90;
      return {
        ...p,
        daysSinceActivity: daysSinceUpdate,
        autoSuspendThreshold: threshold,
        daysUntilAutoSuspend: daysSinceUpdate !== null ? Math.max(0, threshold - daysSinceUpdate) : null,
        severity: daysSinceUpdate !== null && daysSinceUpdate >= threshold ? "critical" : "warning",
      };
    });

    const orgsWithoutPartner = await db
      .select({
        orgId: orgs.id,
        orgName: orgs.name,
        channelType: orgs.channelType,
        status: orgs.status,
      })
      .from(orgs)
      .where(and(
        sql`${orgs.channelType} IN ('partner', 'reseller')`,
        sql`${orgs.id} NOT IN (SELECT org_id FROM partner_clients)`,
        sql`${orgs.id} NOT IN (SELECT COALESCE(org_id, 0) FROM ${partners})`,
      ));

    return NextResponse.json({
      orphanedResellers: {
        count: orphanedResellers.length,
        items: orphanedResellers,
        description: "Resellers whose parent partner no longer exists",
      },
      activeClientsUnderSuspendedPartners: {
        count: suspendedPartnerClients.length,
        items: suspendedPartnerClients,
        description: "Active clients still linked to suspended/terminated partners",
      },
      affiliatesWithDeadOwners: {
        count: deadOwnerAffiliates.length,
        items: deadOwnerAffiliates,
        description: "Active affiliates whose partner owner is no longer active",
      },
      approachingInactivity: {
        count: approachingInactivity.length,
        items: approachingInactivity,
        description: "Active partners approaching auto-suspend threshold",
      },
      orgsWithoutPartner: {
        count: orgsWithoutPartner.length,
        items: orgsWithoutPartner,
        description: "Orgs marked as partner/reseller channel but not linked to any partner",
      },
      totalIssues:
        orphanedResellers.length +
        suspendedPartnerClients.length +
        deadOwnerAffiliates.length +
        approachingInactivity.length +
        orgsWithoutPartner.length,
    });
  } catch (error) {
    console.error("Orphan detection error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
