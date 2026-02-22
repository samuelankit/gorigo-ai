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
  _visited: Set<number> = new Set(),
  _depth: number = 0,
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
    result.errors.push(`Circular cascade detected: partner ${partnerId} already visited`);
    return result;
  }
  if (_depth > MAX_CASCADE_DEPTH) {
    result.errors.push(`Maximum cascade depth (${MAX_CASCADE_DEPTH}) exceeded at partner ${partnerId}`);
    return result;
  }
  _visited.add(partnerId);

  const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
  if (!partner) {
    result.errors.push("Partner not found");
    return result;
  }

  try {
    const clients = await db
      .select({ id: partnerClients.id, orgId: partnerClients.orgId, status: partnerClients.status })
      .from(partnerClients)
      .where(and(eq(partnerClients.partnerId, partnerId), eq(partnerClients.status, "active")));

    for (const client of clients) {
      try {
        await db
          .update(partnerClients)
          .set({ status: action === "terminate" ? "terminated" : "suspended" })
          .where(eq(partnerClients.id, client.id));

        await db
          .update(orgs)
          .set({
            status: action === "terminate" ? "partner_terminated" : "partner_suspended",
            suspendedAt: new Date(),
            suspendedReason: `Partner ${action === "terminate" ? "terminated" : "suspended"}: ${reason}`,
          })
          .where(eq(orgs.id, client.orgId));

        result.clientsPaused++;

        try {
          await db
            .update(wallets)
            .set({ isActive: false })
            .where(eq(wallets.orgId, client.orgId));
          result.walletsDeactivated++;
        } catch (error) {
          console.error("Wallet deactivation during partner cascade failed:", error);
        }
      } catch (err) {
        result.errors.push(`Failed to ${action} client org ${client.orgId}: ${String(err)}`);
      }
    }
  } catch (err) {
    result.errors.push(`Failed to fetch partner clients: ${String(err)}`);
  }

  if (partner.orgId) {
    try {
      await db
        .update(orgs)
        .set({
          status: action === "terminate" ? "terminated" : "suspended",
          suspendedAt: new Date(),
          suspendedReason: `Partner self-org ${action}: ${reason}`,
        })
        .where(eq(orgs.id, partner.orgId));

      await db
        .update(wallets)
        .set({ isActive: false })
        .where(eq(wallets.orgId, partner.orgId));
      result.walletsDeactivated++;
    } catch (err) {
      result.errors.push(`Failed to suspend partner's own org: ${String(err)}`);
    }
  }

  try {
    const partnerAffiliates = await db
      .select({ id: affiliates.id, status: affiliates.status })
      .from(affiliates)
      .where(and(
        eq(affiliates.ownerType, "partner"),
        eq(affiliates.ownerId, partnerId),
      ));

    for (const aff of partnerAffiliates) {
      if (aff.status === "active" || aff.status === "approved") {
        await db
          .update(affiliates)
          .set({ status: "frozen", updatedAt: new Date() })
          .where(eq(affiliates.id, aff.id));
        result.affiliatesFrozen++;

        const frozenCommissions = await db
          .update(affiliateCommissions)
          .set({ status: "frozen" })
          .where(and(
            eq(affiliateCommissions.affiliateId, aff.id),
            eq(affiliateCommissions.status, "pending"),
          ));
        result.commissionsFrozen += frozenCommissions.rowCount || 0;
      }
    }
  } catch (err) {
    result.errors.push(`Failed to freeze affiliates: ${String(err)}`);
  }

  try {
    await db.execute(sql`
      UPDATE campaigns
      SET status = 'paused'
      WHERE org_id IN (
        SELECT org_id FROM partner_clients WHERE partner_id = ${partnerId}
      )
      AND status IN ('active', 'scheduled')
    `);
    result.campaignsPaused++;
  } catch (err) {
    result.errors.push(`Failed to pause campaigns: ${String(err)}`);
  }

  try {
    const resellers = await db
      .select({ id: partners.id, status: partners.status })
      .from(partners)
      .where(eq(partners.parentPartnerId, partnerId));

    for (const reseller of resellers) {
      if (reseller.status === "active" || reseller.status === "pending") {
        await db
          .update(partners)
          .set({
            status: "suspended",
            suspendedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(partners.id, reseller.id));

        const subResult = await executePartnerCascade(
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
  } catch (err) {
    result.errors.push(`Failed to cascade to resellers: ${String(err)}`);
  }

  try {
    await db.insert(partnerLifecycleEvents).values({
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
  } catch (error) {
    console.error("Partner cascade lifecycle event logging failed:", error);
  }

  return result;
}

export async function reversePartnerCascade(
  partnerId: number,
  initiatedBy: number,
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

  const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
  if (!partner) {
    result.errors.push("Partner not found");
    return result;
  }

  try {
    const clients = await db
      .select({ id: partnerClients.id, orgId: partnerClients.orgId })
      .from(partnerClients)
      .where(and(eq(partnerClients.partnerId, partnerId), eq(partnerClients.status, "suspended")));

    for (const client of clients) {
      await db.update(partnerClients).set({ status: "active" }).where(eq(partnerClients.id, client.id));
      await db.update(orgs).set({ status: "active", suspendedAt: null, suspendedReason: null }).where(eq(orgs.id, client.orgId));
      await db.update(wallets).set({ isActive: true }).where(eq(wallets.orgId, client.orgId));
      result.clientsPaused++;
    }
  } catch (err) {
    result.errors.push(`Failed to reactivate clients: ${String(err)}`);
  }

  if (partner.orgId) {
    try {
      await db.update(orgs).set({ status: "active", suspendedAt: null, suspendedReason: null }).where(eq(orgs.id, partner.orgId));
      await db.update(wallets).set({ isActive: true }).where(eq(wallets.orgId, partner.orgId));
    } catch (err) {
      result.errors.push(`Failed to reactivate partner org: ${String(err)}`);
    }
  }

  try {
    const partnerAffiliates = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(and(eq(affiliates.ownerType, "partner"), eq(affiliates.ownerId, partnerId), eq(affiliates.status, "frozen")));

    for (const aff of partnerAffiliates) {
      await db.update(affiliates).set({ status: "active", updatedAt: new Date() }).where(eq(affiliates.id, aff.id));
      await db.update(affiliateCommissions).set({ status: "pending" }).where(and(eq(affiliateCommissions.affiliateId, aff.id), eq(affiliateCommissions.status, "frozen")));
      result.affiliatesFrozen++;
    }
  } catch (err) {
    result.errors.push(`Failed to unfreeze affiliates: ${String(err)}`);
  }

  try {
    await db.insert(partnerLifecycleEvents).values({
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
  } catch (error) {
    console.error("Reverse partner cascade lifecycle event logging failed:", error);
  }

  return result;
}
