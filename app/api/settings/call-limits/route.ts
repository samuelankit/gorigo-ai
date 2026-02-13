import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { getActiveCalls } from "@/lib/call-limits";
import { settingsLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [org] = await db.select().from(orgs).where(eq(orgs.id, auth.orgId)).limit(1);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const activeCalls = await getActiveCalls(auth.orgId);

    return NextResponse.json({
      maxConcurrentCalls: org.maxConcurrentCalls || 5,
      minCallBalance: org.minCallBalance || 1.00,
      activeCalls,
    });
  } catch (error) {
    console.error("Call limits GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.maxConcurrentCalls !== undefined) {
      const max = parseInt(body.maxConcurrentCalls);
      if (isNaN(max) || max < 1 || max > 100) {
        return NextResponse.json({ error: "maxConcurrentCalls must be between 1 and 100" }, { status: 400 });
      }
      updates.maxConcurrentCalls = max;
    }

    if (body.minCallBalance !== undefined) {
      const min = parseFloat(body.minCallBalance);
      if (isNaN(min) || min < 0) {
        return NextResponse.json({ error: "minCallBalance must be non-negative" }, { status: 400 });
      }
      updates.minCallBalance = min;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(orgs)
      .set(updates)
      .where(eq(orgs.id, auth.orgId))
      .returning();

    return NextResponse.json({
      maxConcurrentCalls: updated.maxConcurrentCalls || 5,
      minCallBalance: updated.minCallBalance || 1.00,
    });
  } catch (error) {
    console.error("Call limits PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
