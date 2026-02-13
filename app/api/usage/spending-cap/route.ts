import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usageRecords } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";

export async function PUT(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const body = await request.json();
    const { spendingCap } = body;

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [usage] = await db
      .select()
      .from(usageRecords)
      .where(and(eq(usageRecords.orgId, auth.orgId), eq(usageRecords.month, month)))
      .limit(1);

    if (!usage) {
      return NextResponse.json({ error: "No usage record found" }, { status: 404 });
    }

    await db
      .update(usageRecords)
      .set({ spendingCap: spendingCap !== null && spendingCap !== undefined ? String(Number(spendingCap)) : null })
      .where(eq(usageRecords.id, usage.id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update spending cap error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
