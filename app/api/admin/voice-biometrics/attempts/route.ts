import { db } from "@/lib/db";
import { voiceBiometricAttempts } from "@/shared/schema";
import { eq, and, desc, gte, lte, count } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const voiceprintId = searchParams.get("voiceprintId");
    const result = searchParams.get("result");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = (page - 1) * limit;

    const conditions = [];
    if (orgId) conditions.push(eq(voiceBiometricAttempts.orgId, parseInt(orgId)));
    if (voiceprintId) conditions.push(eq(voiceBiometricAttempts.voiceprintId, parseInt(voiceprintId)));
    if (result) conditions.push(eq(voiceBiometricAttempts.result, result));
    if (from) conditions.push(gte(voiceBiometricAttempts.createdAt, new Date(from)));
    if (to) conditions.push(lte(voiceBiometricAttempts.createdAt, new Date(to)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ total: count() })
      .from(voiceBiometricAttempts)
      .where(whereClause);

    const attempts = await db
      .select()
      .from(voiceBiometricAttempts)
      .where(whereClause)
      .orderBy(desc(voiceBiometricAttempts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: attempts,
      pagination: {
        page,
        limit,
        total: Number(totalResult.total),
        totalPages: Math.ceil(Number(totalResult.total) / limit),
      },
    });
  } catch (error) {
    console.error("Attempts list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
