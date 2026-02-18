import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { partners, partnerClients, wallets, orgs, affiliates } from "@/shared/schema";
import { eq, and, sql, count, lt, isNull } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

interface PartnerHealthReport {
  partnerId: number;
  partnerName: string;
  status: string;
  healthScore: number;
  alerts: string[];
  metrics: {
    clientCount: number;
    activeClients: number;
    resellerCount: number;
    affiliateCount: number;
    walletBalance: string;
    walletActive: boolean;
    daysSinceLastActivity: number | null;
    gracePeriodEndsAt: string | null;
    legalHold: boolean;
    autoSuspendAfterDays: number | null;
  };
}

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

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const alertsOnly = searchParams.get("alerts_only") === "true";
    const threshold = parseInt(searchParams.get("threshold") || "50", 10);

    let query = db.select().from(partners);
    if (statusFilter) {
      query = query.where(eq(partners.status, statusFilter)) as any;
    }
    const allPartners = await query;

    const reports: PartnerHealthReport[] = [];

    for (const partner of allPartners) {
      const alerts: string[] = [];
      let healthScore = 100;

      const [clientCountResult] = await db
        .select({ total: count(), active: sql<number>`COUNT(*) FILTER (WHERE ${partnerClients.status} = 'active')` })
        .from(partnerClients)
        .where(eq(partnerClients.partnerId, partner.id));

      const totalClients = Number(clientCountResult.total);
      const activeClients = Number(clientCountResult.active);

      const [resellerCount] = await db
        .select({ count: count() })
        .from(partners)
        .where(eq(partners.parentPartnerId, partner.id));

      const [affiliateCount] = await db
        .select({ count: count() })
        .from(affiliates)
        .where(and(eq(affiliates.ownerType, "partner"), eq(affiliates.ownerId, partner.id)));

      let walletBalance = "0.00";
      let walletActive = false;
      if (partner.orgId) {
        const [wallet] = await db.select().from(wallets).where(eq(wallets.orgId, partner.orgId)).limit(1);
        if (wallet) {
          walletBalance = wallet.balance || "0.00";
          walletActive = wallet.isActive ?? false;
          if (parseFloat(walletBalance) < 10) {
            alerts.push("Low wallet balance (< $10)");
            healthScore -= 15;
          }
          if (!walletActive) {
            alerts.push("Wallet is deactivated");
            healthScore -= 20;
          }
        } else {
          alerts.push("No wallet found");
          healthScore -= 10;
        }
      }

      if (partner.status === "suspended") {
        alerts.push("Partner is suspended");
        healthScore -= 30;
      } else if (partner.status === "terminated") {
        alerts.push("Partner is terminated");
        healthScore -= 50;
      }

      if (partner.gracePeriodEndsAt) {
        const gracePeriodEnd = new Date(partner.gracePeriodEndsAt);
        const daysUntilGraceEnd = Math.ceil((gracePeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilGraceEnd <= 0) {
          alerts.push(`Grace period expired ${Math.abs(daysUntilGraceEnd)} days ago`);
          healthScore -= 25;
        } else if (daysUntilGraceEnd <= 7) {
          alerts.push(`Grace period ends in ${daysUntilGraceEnd} days`);
          healthScore -= 10;
        }
      }

      let daysSinceLastActivity: number | null = null;
      if (partner.updatedAt) {
        daysSinceLastActivity = Math.floor((Date.now() - new Date(partner.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const autoSuspendDays = partner.autoSuspendAfterDays || 90;
        if (daysSinceLastActivity > autoSuspendDays) {
          alerts.push(`Inactive for ${daysSinceLastActivity} days (auto-suspend threshold: ${autoSuspendDays})`);
          healthScore -= 20;
        } else if (daysSinceLastActivity > autoSuspendDays * 0.75) {
          alerts.push(`Approaching inactivity threshold: ${daysSinceLastActivity}/${autoSuspendDays} days`);
          healthScore -= 10;
        }
      }

      if (totalClients > 0 && activeClients === 0) {
        alerts.push("All clients are inactive");
        healthScore -= 15;
      }

      if (partner.legalHold) {
        alerts.push("Under legal hold");
      }

      if (!partner.parentPartnerId && partner.partnerType === "reseller") {
        alerts.push("Reseller has no parent partner (orphaned)");
        healthScore -= 20;
      }

      healthScore = Math.max(0, Math.min(100, healthScore));

      const report: PartnerHealthReport = {
        partnerId: partner.id,
        partnerName: partner.name,
        status: partner.status || "pending",
        healthScore,
        alerts,
        metrics: {
          clientCount: totalClients,
          activeClients,
          resellerCount: Number(resellerCount.count),
          affiliateCount: Number(affiliateCount.count),
          walletBalance,
          walletActive,
          daysSinceLastActivity,
          gracePeriodEndsAt: partner.gracePeriodEndsAt ? new Date(partner.gracePeriodEndsAt).toISOString() : null,
          legalHold: partner.legalHold || false,
          autoSuspendAfterDays: partner.autoSuspendAfterDays || null,
        },
      };

      if (alertsOnly && alerts.length === 0) continue;
      if (healthScore > threshold && alertsOnly) continue;

      reports.push(report);
    }

    reports.sort((a, b) => a.healthScore - b.healthScore);

    const summary = {
      totalPartners: allPartners.length,
      healthyPartners: reports.filter(r => r.healthScore >= 80).length,
      warningPartners: reports.filter(r => r.healthScore >= 50 && r.healthScore < 80).length,
      criticalPartners: reports.filter(r => r.healthScore < 50).length,
      legalHolds: reports.filter(r => r.metrics.legalHold).length,
    };

    return NextResponse.json({ summary, reports });
  } catch (error) {
    return handleRouteError(error, "PartnerHealth");
  }
}
