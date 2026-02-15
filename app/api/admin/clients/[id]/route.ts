import { db } from "@/lib/db";
import { orgs, orgMembers, users, wallets, partners, partnerClients, callLogs, billingLedger, agents } from "@/shared/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const orgId = parseInt(id, 10);
    if (isNaN(orgId) || orgId < 1) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
    if (!org) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = {
      id: org.id,
      name: org.name,
      timezone: org.timezone,
      currency: org.currency,
      channelType: org.channelType,
      deploymentModel: org.deploymentModel,
      maxConcurrentCalls: org.maxConcurrentCalls,
      voicemailEnabled: org.voicemailEnabled,
      createdAt: org.createdAt,
    };

    const [ownerRow] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.businessName,
        lastName: sql<string | null>`null`,
      })
      .from(orgMembers)
      .leftJoin(users, eq(orgMembers.userId, users.id))
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, "OWNER")))
      .limit(1);

    const owner = ownerRow
      ? { id: ownerRow.id, email: ownerRow.email, firstName: ownerRow.firstName, lastName: ownerRow.lastName }
      : null;

    const [walletRow] = await db
      .select({
        balance: wallets.balance,
        currency: wallets.currency,
        isActive: wallets.isActive,
        lowBalanceThreshold: wallets.lowBalanceThreshold,
      })
      .from(wallets)
      .where(eq(wallets.orgId, orgId))
      .limit(1);

    const wallet = walletRow ?? null;

    const [pcRow] = await db
      .select({ partnerId: partnerClients.partnerId })
      .from(partnerClients)
      .where(eq(partnerClients.orgId, orgId))
      .limit(1);

    let partner: { id: number; name: string; tier: string | null } | null = null;
    if (pcRow) {
      const [p] = await db
        .select({ id: partners.id, name: partners.name, tier: partners.tier })
        .from(partners)
        .where(eq(partners.id, pcRow.partnerId))
        .limit(1);
      if (p) partner = p;
    }

    const [usageAll] = await db
      .select({
        totalCalls: sql<number>`count(*)`,
        completedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.status} = 'completed')`,
        failedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.status} = 'failed')`,
        totalMinutes: sql<number>`COALESCE(SUM(${callLogs.duration}), 0) / 60.0`,
        totalCost: sql<number>`COALESCE(SUM(${callLogs.callCost}), 0)`,
        avgDuration: sql<number>`COALESCE(AVG(${callLogs.duration}), 0)`,
      })
      .from(callLogs)
      .where(eq(callLogs.orgId, orgId));

    const usage = {
      totalCalls: Number(usageAll.totalCalls),
      completedCalls: Number(usageAll.completedCalls),
      failedCalls: Number(usageAll.failedCalls),
      totalMinutes: Number(Number(usageAll.totalMinutes).toFixed(2)),
      totalCost: Number(Number(usageAll.totalCost).toFixed(2)),
      avgDuration: Number(Number(usageAll.avgDuration).toFixed(2)),
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [usage30] = await db
      .select({
        totalCalls: sql<number>`count(*)`,
        completedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.status} = 'completed')`,
        failedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.status} = 'failed')`,
        totalMinutes: sql<number>`COALESCE(SUM(${callLogs.duration}), 0) / 60.0`,
        totalCost: sql<number>`COALESCE(SUM(${callLogs.callCost}), 0)`,
        avgDuration: sql<number>`COALESCE(AVG(${callLogs.duration}), 0)`,
      })
      .from(callLogs)
      .where(and(eq(callLogs.orgId, orgId), gte(callLogs.createdAt, thirtyDaysAgo)));

    const usageLast30Days = {
      totalCalls: Number(usage30.totalCalls),
      completedCalls: Number(usage30.completedCalls),
      failedCalls: Number(usage30.failedCalls),
      totalMinutes: Number(Number(usage30.totalMinutes).toFixed(2)),
      totalCost: Number(Number(usage30.totalCost).toFixed(2)),
      avgDuration: Number(Number(usage30.avgDuration).toFixed(2)),
    };

    const [agentCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(eq(agents.orgId, orgId));

    const [memberCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orgMembers)
      .where(eq(orgMembers.orgId, orgId));

    return NextResponse.json({
      client,
      owner,
      wallet,
      partner,
      usage,
      usageLast30Days,
      agentCount: Number(agentCountRow.count),
      memberCount: Number(memberCountRow.count),
    });
  } catch (error) {
    console.error("Admin get client detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
