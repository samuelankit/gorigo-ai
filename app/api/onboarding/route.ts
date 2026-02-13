import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { agents, knowledgeDocuments, callLogs, wallets } from "@/shared/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const orgId = auth.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const [agentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(eq(agents.orgId, orgId));

    const [knowledgeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.orgId, orgId));

    const [callCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(callLogs)
      .where(eq(callLogs.orgId, orgId));

    const [wallet] = await db
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.orgId, orgId));

    const steps = [
      {
        id: "create_agent",
        title: "Create your first agent",
        description: "Set up an AI agent to handle calls",
        completed: (agentCount?.count ?? 0) > 0,
        link: "/dashboard/agent",
      },
      {
        id: "add_knowledge",
        title: "Add knowledge base content",
        description: "Upload documents or FAQs for your agent",
        completed: (knowledgeCount?.count ?? 0) > 0,
        link: "/dashboard/agent",
      },
      {
        id: "make_call",
        title: "Make or receive your first call",
        description: "Test your agent with a live call",
        completed: (callCount?.count ?? 0) > 0,
        link: "/dashboard/calls",
      },
      {
        id: "top_up_wallet",
        title: "Top up your wallet",
        description: "Add credits to start making calls",
        completed: wallet ? Number(wallet.balance) > 0 : false,
        link: "/dashboard/billing",
      },
    ];

    const completedCount = steps.filter((s) => s.completed).length;

    return NextResponse.json({
      steps,
      completedCount,
      totalSteps: steps.length,
      allComplete: completedCount === steps.length,
    });
  } catch (error) {
    console.error("Onboarding check error:", error);
    return NextResponse.json({ error: "Failed to check onboarding status" }, { status: 500 });
  }
}
