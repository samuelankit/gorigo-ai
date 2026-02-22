import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, requireEmailVerified } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { users, orgs, orgMembers, agents, knowledgeDocuments, callLogs, wallets, walletTransactions } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const logger = createLogger("DataExport");

export async function POST(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailCheck = requireEmailVerified(auth);
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: emailCheck.status || 403 });
    }

    logger.info("GDPR data export requested", { userId: auth.user.id, orgId: auth.orgId });

    const [user] = await db.select().from(users).where(eq(users.id, auth.user.id)).limit(1);
    const [org] = await db.select().from(orgs).where(eq(orgs.id, auth.orgId)).limit(1);
    const members = await db.select().from(orgMembers).where(eq(orgMembers.orgId, auth.orgId));
    const orgAgents = await db.select().from(agents).where(eq(agents.orgId, auth.orgId));
    const docs = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.orgId, auth.orgId));
    const orgCalls = await db.select().from(callLogs).where(eq(callLogs.orgId, auth.orgId));
    const [wallet] = await db.select().from(wallets).where(eq(wallets.orgId, auth.orgId)).limit(1);

    let transactions: any[] = [];
    if (wallet) {
      transactions = await db.select().from(walletTransactions).where(eq(walletTransactions.orgId, auth.orgId));
    }

    const sanitizeUser = (u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      globalRole: u.globalRole,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      twoFactorEnabled: u.twoFactorEnabled,
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: "GDPR Article 15 - Right of Access",
      platform: "GoRigo AI Call Centre Platform",
      company: "International Business Exchange Limited (15985956)",

      account: sanitizeUser(user),

      organisation: org ? {
        id: org.id,
        name: org.name,
        channelType: org.channelType,
        currency: org.currency,
        createdAt: org.createdAt,
      } : null,

      members: members.map((m) => ({
        userId: m.userId,
        role: m.role,
      })),

      agents: orgAgents.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        createdAt: a.createdAt,
      })),

      knowledgeDocuments: docs.map((d) => ({
        id: d.id,
        title: d.title,
        sourceType: d.sourceType,
        status: d.status,
        createdAt: d.createdAt,
      })),

      calls: orgCalls.map((c) => ({
        id: c.id,
        status: c.status,
        direction: c.direction,
        duration: c.duration,
        createdAt: c.createdAt,
        agentId: c.agentId,
      })),

      wallet: wallet ? {
        balance: wallet.balance,
        currency: wallet.currency,
        lowBalanceThreshold: wallet.lowBalanceThreshold,
      } : null,

      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        createdAt: t.createdAt,
      })),

      dataRetention: {
        callRecordings: "90 days after call completion",
        transcripts: "365 days after call completion",
        accountData: "Retained while account is active, deleted 30 days after account closure",
        billingData: "Retained for 7 years per UK tax requirements",
      },

      yourRights: {
        rectification: "Contact support@gorigo.ai to correct any inaccurate data",
        erasure: "Request account deletion via Settings > Account > Delete Account",
        portability: "This export provides your data in machine-readable JSON format",
        restriction: "Contact support@gorigo.ai to restrict processing of your data",
        objection: "Contact support@gorigo.ai to object to data processing",
      },
    };

    const jsonStr = JSON.stringify(exportData, null, 2);

    return new NextResponse(jsonStr, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gorigo-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/account/data-export");
  }
}
