import { db } from "@/lib/db";
import {
  partners, partnerClients, affiliates, affiliateCommissions,
  wallets, orgs, partnerLifecycleEvents,
} from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

interface CascadeResult {
  clientsPaused: number;
  walletsDeactivated: number;
  campaignsPaused: number;
  affiliatesFrozen: number;
  commissionsFrozen: number;
  resellersCascaded: number;
  errors: string[];
}

const MAX_CASCADE_DEPTH = 10;

export async function executePartnerCascade(
  partnerId: number,
  action: "suspend" | "terminate",
  initiatedBy: number,
  reason: string,
): Promise<CascadeResult> {
  return db.transaction(async (tx) => {
    return executeCascadeInTx(tx, partnerId, action, initiatedBy, reason, new Set(), 0);
  });
}

async function executeCascadeInTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  partnerId: number,
  action: "suspend" | "terminate",
  initiatedBy: number,
  reason: string,
  _visited: Set<number>,
  _depth: number,
): Promise<CascadeResult> {
  const result: CascadeResult = {
    clientsPaused: 0,
    walletsDeactivated: 0,
    campaignsPaused: 0,
    affiliatesFrozen: 0,
    commissionsFrozen: 0,
    resellersCascaded: 0,
    errors: [],
  };

  if (_visited.has(partnerId)) {
    throw new Error(`Circular cascade detected: partner ${partnerId} already visited`);
  }
  if (_depth > MAX_CASCADE_DEPTH) {
    throw new Error(`Maximum cascade depth (${MAX_CASCADE_DEPTH}) exceeded at partner ${partnerId}`);
  }
  _visited.add(partnerId);

  const [partner] = await tx.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
  if (!partner) {
    throw new Error(`Partner ${partnerId} not found`);
  }

  const clients = await tx
    .select({ id: partnerClients.id, orgId: partnerClients.orgId, status: partnerClients.status })
    .from(partnerClients)
    .where(and(eq(partnerClients.partnerId, partnerId), eq(partnerClients.status, "active")));

  for (const client of clients) {
    await tx
      .update(partnerClients)
      .set({ status: action === "terminate" ? "terminated" : "suspended" })
      .where(eq(partnerClients.id, client.id));

    await tx
      .update(orgs)
      .set({
        status: action === "terminate" ? "partner_terminated" : "partner_suspended",
        suspendedAt: new Date(),
        suspendedReason: `Partner ${action === "terminate" ? "terminated" : "suspended"}: ${reason}`,
      })
      .where(eq(orgs.id, client.orgId));

    result.clientsPaused++;

    await tx
      .update(wallets)
      .set({ isActive: false })
      .where(eq(wallets.orgId, client.orgId));
    result.walletsDeactivated++;
  }

  if (partner.orgId) {
    await tx
      .update(orgs)
      .set({
        status: action === "terminate" ? "terminated" : "suspended",
        suspendedAt: new Date(),
        suspendedReason: `Partner self-org ${action}: ${reason}`,
      })
      .where(eq(orgs.id, partner.orgId));

    await tx
      .update(wallets)
      .set({ isActive: false })
      .where(eq(wallets.orgId, partner.orgId));
    result.walletsDeactivated++;
  }

  const partnerAffiliates = await tx
    .select({ id: affiliates.id, status: affiliates.status })
    .from(affiliates)
    .where(and(
      eq(affiliates.ownerType, "partner"),
      eq(affiliates.ownerId, partnerId),
    ));

  for (const aff of partnerAffiliates) {
    if (aff.status === "active" || aff.status === "approved") {
      await tx
        .update(affiliates)
        .set({ status: "frozen", updatedAt: new Date() })
        .where(eq(affiliates.id, aff.id));
      result.affiliatesFrozen++;

      const frozenCommissions = await tx
        .update(affiliateCommissions)
        .set({ status: "frozen" })
        .where(and(
          eq(affiliateCommissions.affiliateId, aff.id),
          eq(affiliateCommissions.status, "pending"),
        ));
      result.commissionsFrozen += frozenCommissions.rowCount || 0;
    }
  }

  await tx.execute(sql`
    UPDATE campaigns
    SET status = 'paused'
    WHERE org_id IN (
      SELECT org_id FROM partner_clients WHERE partner_id = ${partnerId}
    )
    AND status IN ('active', 'scheduled')
  `);
  result.campaignsPaused++;

  const resellers = await tx
    .select({ id: partners.id, status: partners.status })
    .from(partners)
    .where(eq(partners.parentPartnerId, partnerId));

  for (const reseller of resellers) {
    if (reseller.status === "active" || reseller.status === "pending") {
      await tx
        .update(partners)
        .set({
          status: "suspended",
          suspendedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(partners.id, reseller.id));

      const subResult = await executeCascadeInTx(
        tx,
        reseller.id,
        action,
        initiatedBy,
        `Parent partner ${partner.name} ${action}d: ${reason}`,
        _visited,
        _depth + 1,
      );
      result.resellersCascaded++;
      result.clientsPaused += subResult.clientsPaused;
      result.walletsDeactivated += subResult.walletsDeactivated;
      result.affiliatesFrozen += subResult.affiliatesFrozen;
      result.commissionsFrozen += subResult.commissionsFrozen;
      result.campaignsPaused += subResult.campaignsPaused;
      result.errors.push(...subResult.errors);
    }
  }

  await tx.insert(partnerLifecycleEvents).values({
    partnerId,
    eventType: `cascade_${action}`,
    fromStatus: partner.status,
    toStatus: action === "terminate" ? "terminated" : "suspended",
    reason,
    initiatedBy,
    affectedClients: result.clientsPaused,
    affectedResellers: result.resellersCascaded,
    affectedAffiliates: result.affiliatesFrozen,
    cascadeActions: {
      walletsDeactivated: result.walletsDeactivated,
      campaignsPaused: result.campaignsPaused,
      commissionsFrozen: result.commissionsFrozen,
      errors: result.errors,
    },
  });

  return result;
}

export async function reversePartnerCascade(
  partnerId: number,
  initiatedBy: number,
): Promise<CascadeResult> {
  return db.transaction(async (tx) => {
    const result: CascadeResult = {
      clientsPaused: 0,
      walletsDeactivated: 0,
      campaignsPaused: 0,
      affiliatesFrozen: 0,
      commissionsFrozen: 0,
      resellersCascaded: 0,
      errors: [],
    };

    const [partner] = await tx.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
    if (!partner) {
      throw new Error(`Partner ${partnerId} not found`);
    }

    const clients = await tx
      .select({ id: partnerClients.id, orgId: partnerClients.orgId })
      .from(partnerClients)
      .where(and(eq(partnerClients.partnerId, partnerId), eq(partnerClients.status, "suspended")));

    for (const client of clients) {
      await tx.update(partnerClients).set({ status: "active" }).where(eq(partnerClients.id, client.id));
      await tx.update(orgs).set({ status: "active", suspendedAt: null, suspendedReason: null }).where(eq(orgs.id, client.orgId));
      await tx.update(wallets).set({ isActive: true }).where(eq(wallets.orgId, client.orgId));
      result.clientsPaused++;
    }

    if (partner.orgId) {
      await tx.update(orgs).set({ status: "active", suspendedAt: null, suspendedReason: null }).where(eq(orgs.id, partner.orgId));
      await tx.update(wallets).set({ isActive: true }).where(eq(wallets.orgId, partner.orgId));
    }

    const partnerAffiliates = await tx
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(and(eq(affiliates.ownerType, "partner"), eq(affiliates.ownerId, partnerId), eq(affiliates.status, "frozen")));

    for (const aff of partnerAffiliates) {
      await tx.update(affiliates).set({ status: "active", updatedAt: new Date() }).where(eq(affiliates.id, aff.id));
      await tx.update(affiliateCommissions).set({ status: "pending" }).where(and(eq(affiliateCommissions.affiliateId, aff.id), eq(affiliateCommissions.status, "frozen")));
      result.affiliatesFrozen++;
    }

    await tx.insert(partnerLifecycleEvents).values({
      partnerId,
      eventType: "cascade_reverse",
      fromStatus: partner.status,
      toStatus: "active",
      reason: "Partner reactivated",
      initiatedBy,
      affectedClients: result.clientsPaused,
      affectedResellers: 0,
      affectedAffiliates: result.affiliatesFrozen,
      cascadeActions: { reversed: true },
    });

    return result;
  });
}
