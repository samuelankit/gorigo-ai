import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { affiliates, affiliatePayouts, affiliateCommissions } from "@/shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const affiliateId = searchParams.get("affiliateId");

    const conditions = [];
    if (status) conditions.push(eq(affiliatePayouts.status, status));
    if (affiliateId) conditions.push(eq(affiliatePayouts.affiliateId, parseInt(affiliateId)));

    let result;
    if (conditions.length > 0) {
      result = await db.select().from(affiliatePayouts)
        .where(and(...conditions))
        .orderBy(desc(affiliatePayouts.createdAt));
    } else {
      result = await db.select().from(affiliatePayouts)
        .orderBy(desc(affiliatePayouts.createdAt));
    }

    return NextResponse.json({ payouts: result });
  } catch (error) {
    console.error("Admin payouts GET error:", error);
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
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { affiliateId, amount, method, notes } = body;

    if (!affiliateId || !amount) {
      return NextResponse.json({ error: "Affiliate ID and amount are required" }, { status: 400 });
    }

    if (amount <= 0 || amount > 10000) {
      return NextResponse.json({ error: "Amount must be between 0.01 and 10,000" }, { status: 400 });
    }

    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    if ((affiliate.pendingPayout ?? 0) < amount) {
      return NextResponse.json({
        error: `Payout amount (£${amount}) exceeds pending balance (£${affiliate.pendingPayout ?? 0})`,
      }, { status: 400 });
    }

    const [payout] = await db.insert(affiliatePayouts).values({
      affiliateId,
      amount,
      method: method ?? "wallet_credit",
      status: "pending",
      notes,
    }).returning();

    return NextResponse.json({ payout }, { status: 201 });
  } catch (error) {
    console.error("Admin payouts POST error:", error);
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
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status: newStatus } = body;

    if (!id || !newStatus) {
      return NextResponse.json({ error: "Payout ID and status are required" }, { status: 400 });
    }

    if (!["approved", "rejected", "completed"].includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const [payout] = await db
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.id, id))
      .limit(1);

    if (!payout) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    }

    if (payout.status !== "pending") {
      return NextResponse.json({ error: "Only pending payouts can be updated" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      processedBy: auth.user.id,
      processedAt: new Date(),
    };

    const [updated] = await db
      .update(affiliatePayouts)
      .set(updateData)
      .where(eq(affiliatePayouts.id, id))
      .returning();

    if (newStatus === "completed" || newStatus === "approved") {
      await db
        .update(affiliates)
        .set({
          pendingPayout: sql`GREATEST(0, ${affiliates.pendingPayout} - ${payout.amount})`,
          lifetimePayouts: sql`${affiliates.lifetimePayouts} + ${payout.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(affiliates.id, payout.affiliateId));
    }

    return NextResponse.json({ payout: updated });
  } catch (error) {
    console.error("Admin payouts PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
