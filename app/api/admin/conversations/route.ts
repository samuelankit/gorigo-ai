import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { publicConversations, chatLeads } from "@/shared/schema";
import { eq, desc, sql, like, or, and, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const rl = await adminLimiter(req);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = 25;
    const offset = (page - 1) * limit;
    const channel = url.searchParams.get("channel") || "all";
    const status = url.searchParams.get("status") || "all";
    const search = url.searchParams.get("search") || "";

    const conditions = [];
    if (channel !== "all") {
      conditions.push(eq(publicConversations.channel, channel));
    }
    if (status !== "all") {
      conditions.push(eq(publicConversations.status, status));
    }
    if (search) {
      conditions.push(
        or(
          like(publicConversations.ipAddress, `%${search}%`),
          like(chatLeads.email, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = db
      .select({
        id: publicConversations.id,
        sessionId: publicConversations.sessionId,
        channel: publicConversations.channel,
        status: publicConversations.status,
        messageCount: publicConversations.messageCount,
        ipAddress: publicConversations.ipAddress,
        userAgent: publicConversations.userAgent,
        leadId: publicConversations.leadId,
        startedAt: publicConversations.startedAt,
        endedAt: publicConversations.endedAt,
        duration: publicConversations.duration,
        leadName: chatLeads.name,
        leadEmail: chatLeads.email,
      })
      .from(publicConversations)
      .leftJoin(chatLeads, eq(publicConversations.leadId, chatLeads.id));

    const [totalResult] = await db
      .select({ count: count() })
      .from(publicConversations)
      .leftJoin(chatLeads, eq(publicConversations.leadId, chatLeads.id))
      .where(whereClause);

    const conversations = await baseQuery
      .where(whereClause)
      .orderBy(desc(publicConversations.startedAt))
      .limit(limit)
      .offset(offset);

    const [stats] = await db
      .select({
        totalConversations: count(),
        webCallCount: sql<number>`count(*) filter (where ${publicConversations.channel} = 'web_call')`,
        chatbotCount: sql<number>`count(*) filter (where ${publicConversations.channel} = 'chatbot')`,
        activeCount: sql<number>`count(*) filter (where ${publicConversations.status} = 'active')`,
        endedCount: sql<number>`count(*) filter (where ${publicConversations.status} = 'ended')`,
        avgDuration: sql<number>`coalesce(round(avg(${publicConversations.duration})::numeric, 0), 0)`,
        avgMessages: sql<number>`coalesce(round(avg(${publicConversations.messageCount})::numeric, 1), 0)`,
      })
      .from(publicConversations);

    return NextResponse.json({
      conversations,
      total: totalResult.count,
      page,
      totalPages: Math.ceil(totalResult.count / limit),
      stats: {
        totalConversations: stats.totalConversations,
        webCallCount: Number(stats.webCallCount),
        chatbotCount: Number(stats.chatbotCount),
        activeCount: Number(stats.activeCount),
        endedCount: Number(stats.endedCount),
        avgDuration: Number(stats.avgDuration),
        avgMessages: Number(stats.avgMessages),
      },
    });
  } catch (err) {
    return handleRouteError(error, "AdminConversations");
  }
}
