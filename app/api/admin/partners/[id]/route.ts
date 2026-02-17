import { db } from "@/lib/db";
import { partners, partnerClients, billingLedger, affiliates, orgs } from "@/shared/schema";
import { eq, and, sql, count, sum } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { z } from "zod";

const updatePartnerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactEmail: z.string().email().max(255).optional(),
  contactName: z.string().max(200).nullable().optional(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
  status: z.enum(["pending", "active", "suspended", "terminated", "archived"]).optional(),
  terminationReason: z.string().max(2000).optional(),
  wholesaleRatePerMinute: z.number().min(0).max(10).optional(),
  resellerRatePerMinute: z.number().min(0).max(10).optional(),
  monthlyPlatformFee: z.number().min(0).max(100000).optional(),
  revenueSharePercent: z.number().min(0).max(100).optional(),
  whitelabelMode: z.enum(["co-branded", "white-label"]).optional(),
  maxClients: z.number().int().min(1).max(10000).optional(),
  maxResellers: z.number().int().min(0).max(1000).optional(),
  canCreateResellers: z.boolean().optional(),
  canSellDirect: z.boolean().optional(),
  canCreateAffiliates: z.boolean().optional(),
  partnerCode: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  brandingLogo: z.string().url().nullable().optional(),
  brandingPrimaryColor: z.string().optional(),
  brandingCompanyName: z.string().optional(),
  mobileAppEnabled: z.boolean().optional(),
  customDomain: z.string().optional(),
  notes: z.string().max(5000).nullable().optional(),
  legalHold: z.boolean().optional(),
  legalHoldReason: z.string().max(2000).optional(),
  autoSuspendAfterDays: z.number().int().min(7).max(365).optional(),
}).strict();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    const [clientStats] = await db
      .select({ clientCount: count() })
      .from(partnerClients)
      .where(eq(partnerClients.partnerId, partnerId));

    const clientLinks = await db
      .select({
        id: partnerClients.id,
        orgId: partnerClients.orgId,
        status: partnerClients.status,
        retailRatePerMinute: partnerClients.retailRatePerMinute,
        notes: partnerClients.notes,
        createdAt: partnerClients.createdAt,
        orgName: orgs.name,
      })
      .from(partnerClients)
      .leftJoin(orgs, eq(partnerClients.orgId, orgs.id))
      .where(eq(partnerClients.partnerId, partnerId));

    let totalRevenue = 0;
    if (clientLinks.length > 0) {
      const orgIds = clientLinks.map((c) => c.orgId);
      const [revenueResult] = await db
        .select({ total: sum(billingLedger.cost) })
        .from(billingLedger)
        .where(sql`${billingLedger.orgId} IN (${sql.join(orgIds.map(id => sql`${id}`), sql`, `)})`);
      totalRevenue = Number(revenueResult.total ?? 0);
    }

    const [resellerStats] = await db
      .select({ resellerCount: count() })
      .from(partners)
      .where(eq(partners.parentPartnerId, partnerId));

    const [affiliateStats] = await db
      .select({ affiliateCount: count() })
      .from(affiliates)
      .where(and(eq(affiliates.ownerType, "partner"), eq(affiliates.ownerId, partnerId)));

    let parentPartnerName: string | null = null;
    if (partner.parentPartnerId) {
      const [parentPartner] = await db
        .select({ name: partners.name })
        .from(partners)
        .where(eq(partners.id, partner.parentPartnerId))
        .limit(1);
      if (parentPartner) parentPartnerName = parentPartner.name;
    }

    return NextResponse.json({
      partner,
      clientCount: clientStats.clientCount,
      clients: clientLinks,
      resellerCount: Number(resellerStats.resellerCount),
      affiliateCount: Number(affiliateStats.affiliateCount),
      parentPartnerName,
      totalRevenue,
    });
  } catch (error) {
    console.error("Admin get partner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

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

    const [existing] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const body = await request.json();

    let validated;
    try {
      validated = updatePartnerSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validated)) {
      if (value === undefined) continue;
      
      if (["wholesaleRatePerMinute", "resellerRatePerMinute", "monthlyPlatformFee", "revenueSharePercent"].includes(key)) {
        updates[key] = String(value);
      } else {
        updates[key] = value;
      }
    }

    if (validated.status && validated.status !== existing.status) {
      const VALID_TRANSITIONS: Record<string, string[]> = {
        pending: ["active", "suspended"],
        active: ["suspended", "terminated"],
        suspended: ["active", "terminated", "archived"],
        terminated: ["archived"],
        archived: [],
      };

      const allowed = VALID_TRANSITIONS[existing.status || "pending"] || [];
      if (!allowed.includes(validated.status)) {
        return NextResponse.json(
          { error: `Cannot transition from '${existing.status}' to '${validated.status}'. Allowed: ${allowed.join(", ") || "none"}` },
          { status: 400 },
        );
      }

      if (existing.legalHold && validated.status === "archived") {
        return NextResponse.json(
          { error: "Cannot archive a partner under legal hold. Remove the hold first." },
          { status: 400 },
        );
      }

      if (validated.status === "suspended") {
        updates.suspendedAt = new Date();
      } else if (validated.status === "active") {
        updates.suspendedAt = null;
        updates.gracePeriodEndsAt = null;
      } else if (validated.status === "terminated") {
        updates.terminatedAt = new Date();
        updates.terminationReason = validated.terminationReason || null;
      } else if (validated.status === "archived") {
        updates.archivedAt = new Date();
      }
    }

    if (validated.legalHold !== undefined) {
      updates.legalHold = validated.legalHold;
      if (validated.legalHold) {
        updates.legalHoldSetAt = new Date();
        updates.legalHoldReason = validated.legalHoldReason || null;
      } else {
        updates.legalHoldSetAt = null;
        updates.legalHoldReason = null;
      }
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(partners)
      .set(updates)
      .where(eq(partners.id, partnerId))
      .returning();

    let auditAction = "partner.update";
    if (validated.status && validated.status !== existing.status) {
      if (validated.status === "active" && existing.status === "pending") auditAction = "partner.approved";
      else if (validated.status === "suspended") auditAction = "partner.suspended";
      else if (validated.status === "active") auditAction = "partner.activated";
      else if (validated.status === "terminated") auditAction = "partner.terminated";
      else if (validated.status === "archived") auditAction = "partner.archived";
    }
    if (validated.legalHold !== undefined) {
      auditAction = validated.legalHold ? "partner.legal_hold_set" : "partner.legal_hold_removed";
    }

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: auditAction,
      entityType: "partner",
      entityId: partnerId,
      details: { ...updates, previousStatus: existing.status },
    });

    if (validated.status && validated.status !== existing.status) {
      const { partnerLifecycleEvents } = await import("@/shared/schema");
      const [clientCount] = await db.select({ count: count() }).from(partnerClients).where(eq(partnerClients.partnerId, partnerId));
      const [resellerCount] = await db.select({ count: count() }).from(partners).where(eq(partners.parentPartnerId, partnerId));
      const [affiliateCount] = await db.select({ count: count() }).from(affiliates).where(and(eq(affiliates.ownerType, "partner"), eq(affiliates.ownerId, partnerId)));

      await db.insert(partnerLifecycleEvents).values({
        partnerId,
        eventType: `status_change_${validated.status}`,
        fromStatus: existing.status,
        toStatus: validated.status,
        reason: validated.terminationReason || validated.status,
        initiatedBy: auth!.user.id,
        affectedClients: Number(clientCount.count),
        affectedResellers: Number(resellerCount.count),
        affectedAffiliates: Number(affiliateCount.count),
        cascadeActions: null,
      });
    }

    return NextResponse.json({ partner: updated });
  } catch (error) {
    console.error("Admin update partner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
