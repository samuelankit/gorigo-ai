import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { chatLeads, chatMessages } from "@/shared/schema";
import { eq, desc, sql, like, or, and, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";

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
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "all";

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(chatLeads.name, `%${search}%`),
          like(chatLeads.email, `%${search}%`)
        )
      );
    }
    if (status !== "all") {
      conditions.push(eq(chatLeads.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(chatLeads)
      .where(whereClause);

    const leads = await db
      .select()
      .from(chatLeads)
      .where(whereClause)
      .orderBy(desc(chatLeads.createdAt))
      .limit(limit)
      .offset(offset);

    const [stats] = await db
      .select({
        totalLeads: count(),
        newLeads: sql<number>`count(*) filter (where ${chatLeads.status} = 'new')`,
        contactedLeads: sql<number>`count(*) filter (where ${chatLeads.status} = 'contacted')`,
        convertedLeads: sql<number>`count(*) filter (where ${chatLeads.status} = 'converted')`,
        totalMessages: sql<number>`coalesce(sum(${chatLeads.totalMessages}), 0)`,
      })
      .from(chatLeads);

    const avgMessagesResult = await db
      .select({
        avg: sql<number>`coalesce(round(avg(${chatLeads.totalMessages})::numeric, 1), 0)`,
      })
      .from(chatLeads)
      .where(sql`${chatLeads.totalMessages} > 0`);

    return NextResponse.json({
      leads,
      total: totalResult.count,
      page,
      totalPages: Math.ceil(totalResult.count / limit),
      stats: {
        totalLeads: stats.totalLeads,
        newLeads: Number(stats.newLeads),
        contactedLeads: Number(stats.contactedLeads),
        convertedLeads: Number(stats.convertedLeads),
        totalMessages: Number(stats.totalMessages),
        avgMessages: Number(avgMessagesResult[0]?.avg || 0),
        conversionRate:
          stats.totalLeads > 0
            ? Math.round((Number(stats.convertedLeads) / stats.totalLeads) * 100)
            : 0,
      },
    });
  } catch (err) {
    console.error("Admin chats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const rl = await adminLimiter(req);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { leadId, status } = body as { leadId: number; status: string };

    if (!leadId || !["new", "contacted", "converted", "archived"].includes(status)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    await db.update(chatLeads).set({ status }).where(eq(chatLeads.id, leadId));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
