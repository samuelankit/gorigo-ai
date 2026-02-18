import { db } from "@/lib/db";
import { omnichannelConversations, omnichannelMessages } from "@/shared/schema";
import { eq, and, desc, sql, gte, lte, count, avg } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const url = request.nextUrl;
    const orgId = url.searchParams.get("orgId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const convConditions = [];
    const msgConditions = [];

    if (orgId) {
      convConditions.push(eq(omnichannelConversations.orgId, parseInt(orgId)));
      msgConditions.push(eq(omnichannelMessages.orgId, parseInt(orgId)));
    }
    if (from) {
      convConditions.push(gte(omnichannelConversations.createdAt, new Date(from)));
      msgConditions.push(gte(omnichannelMessages.createdAt, new Date(from)));
    }
    if (to) {
      convConditions.push(lte(omnichannelConversations.createdAt, new Date(to)));
      msgConditions.push(lte(omnichannelMessages.createdAt, new Date(to)));
    }

    const convWhere = convConditions.length > 0 ? and(...convConditions) : undefined;
    const msgWhere = msgConditions.length > 0 ? and(...msgConditions) : undefined;

    const [totalConversations] = await db
      .select({ total: count() })
      .from(omnichannelConversations)
      .where(convWhere);

    const activeConditions = [...convConditions, eq(omnichannelConversations.status, "active")];
    const [activeConversations] = await db
      .select({ total: count() })
      .from(omnichannelConversations)
      .where(and(...activeConditions));

    const messagesByChannel = await db
      .select({
        channelType: omnichannelConversations.channelType,
        messageCount: count(),
      })
      .from(omnichannelMessages)
      .innerJoin(
        omnichannelConversations,
        eq(omnichannelMessages.conversationId, omnichannelConversations.id)
      )
      .where(msgWhere)
      .groupBy(omnichannelConversations.channelType);

    const [avgResponseTime] = await db
      .select({
        avgMs: avg(
          sql<number>`EXTRACT(EPOCH FROM (${omnichannelConversations.lastMessageAt} - ${omnichannelConversations.lastCustomerMessageAt})) * 1000`
        ),
      })
      .from(omnichannelConversations)
      .where(convWhere);

    const slaConditions = [...convConditions];
    const [totalWithSla] = await db
      .select({ total: count() })
      .from(omnichannelConversations)
      .where(
        and(
          ...slaConditions,
          sql`${omnichannelConversations.slaDeadline} IS NOT NULL`
        )
      );

    const [slaBreached] = await db
      .select({ total: count() })
      .from(omnichannelConversations)
      .where(
        and(
          ...slaConditions,
          eq(omnichannelConversations.slaBreach, true)
        )
      );

    const totalSla = Number(totalWithSla.total);
    const breached = Number(slaBreached.total);
    const slaCompliancePercent = totalSla > 0 ? Math.round(((totalSla - breached) / totalSla) * 10000) / 100 : 100;

    return NextResponse.json({
      totalConversations: Number(totalConversations.total),
      activeConversations: Number(activeConversations.total),
      messagesByChannel: messagesByChannel.map((m) => ({
        channelType: m.channelType,
        count: Number(m.messageCount),
      })),
      avgResponseTimeMs: avgResponseTime.avgMs ? Math.round(Number(avgResponseTime.avgMs)) : null,
      slaCompliance: {
        totalWithSla: totalSla,
        breached,
        compliancePercent: slaCompliancePercent,
      },
    });
  } catch (error) {
    console.error("Omnichannel stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
