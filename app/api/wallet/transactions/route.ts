import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { walletTransactions } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    const transactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.orgId, auth.orgId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Get wallet transactions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
