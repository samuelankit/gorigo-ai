import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { affiliates, affiliateClicks } from "@/shared/schema";
import { eq, desc, sql, and, ilike, or } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";

function generateAffiliateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "GR-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const ownerType = searchParams.get("ownerType");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    const conditions: any[] = [];
    if (search) {
      conditions.push(
        or(
          ilike(affiliates.name, `%${search}%`),
          ilike(affiliates.email, `%${search}%`),
          ilike(affiliates.code, `%${search}%`)
        )
      );
    }
    if (ownerType && ownerType !== "all") conditions.push(eq(affiliates.ownerType, ownerType));
    if (status && status !== "all") conditions.push(eq(affiliates.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [result, countResult, statsResult] = await Promise.all([
      db
        .select()
        .from(affiliates)
        .where(whereClause)
        .orderBy(desc(affiliates.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(affiliates)
        .where(whereClause),

      db
        .select({
          totalAffiliates: sql<number>`count(*)::int`,
          activeAffiliates: sql<number>`count(*) FILTER (WHERE ${affiliates.status} = 'active')::int`,
          totalClicks: sql<number>`COALESCE(SUM(${affiliates.totalClicks}), 0)::int`,
          totalSignups: sql<number>`COALESCE(SUM(${affiliates.totalSignups}), 0)::int`,
          totalEarnings: sql<number>`COALESCE(SUM(${affiliates.totalEarnings}::numeric), 0)`,
          totalPending: sql<number>`COALESCE(SUM(${affiliates.pendingPayout}::numeric), 0)`,
          totalPayouts: sql<number>`COALESCE(SUM(${affiliates.lifetimePayouts}::numeric), 0)`,
        })
        .from(affiliates),
    ]);

    return NextResponse.json({
      affiliates: result,
      total: countResult[0]?.count ?? 0,
      stats: statsResult[0] ?? {
        totalAffiliates: 0,
        activeAffiliates: 0,
        totalClicks: 0,
        totalSignups: 0,
        totalEarnings: 0,
        totalPending: 0,
        totalPayouts: 0,
      },
    });
  } catch (error) {
    console.error("Admin affiliates GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, commissionRate, commissionType, ownerType, ownerId, notes, cookieDurationDays } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    if (commissionRate !== undefined && (commissionRate < 0 || commissionRate > 50)) {
      return NextResponse.json({ error: "Commission rate must be between 0 and 50%" }, { status: 400 });
    }

    let code = generateAffiliateCode();
    const existingCode = await db.select().from(affiliates).where(eq(affiliates.code, code)).limit(1);
    if (existingCode.length > 0) {
      code = generateAffiliateCode();
    }

    const [affiliate] = await db.insert(affiliates).values({
      code,
      name,
      email,
      commissionRate: commissionRate ?? 10,
      commissionType: commissionType ?? "percentage",
      ownerType: ownerType ?? "platform",
      ownerId: ownerId ?? null,
      cookieDurationDays: cookieDurationDays ?? 30,
      notes,
      status: "active",
    }).returning();

    return NextResponse.json({ affiliate }, { status: 201 });
  } catch (error) {
    console.error("Admin affiliates POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Affiliate ID is required" }, { status: 400 });
    }

    if (updates.commissionRate !== undefined && (updates.commissionRate < 0 || updates.commissionRate > 50)) {
      return NextResponse.json({ error: "Commission rate must be between 0 and 50%" }, { status: 400 });
    }

    const allowedFields = ["name", "email", "commissionRate", "commissionType", "status", "notes", "cookieDurationDays", "ownerType", "ownerId"];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        safeUpdates[key] = updates[key];
      }
    }
    safeUpdates.updatedAt = new Date();

    const [updated] = await db
      .update(affiliates)
      .set(safeUpdates)
      .where(eq(affiliates.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    return NextResponse.json({ affiliate: updated });
  } catch (error) {
    console.error("Admin affiliates PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Affiliate ID is required" }, { status: 400 });
    }

    const [deactivated] = await db
      .update(affiliates)
      .set({ status: "deactivated", updatedAt: new Date() })
      .where(eq(affiliates.id, parseInt(id)))
      .returning();

    if (!deactivated) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin affiliates DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
