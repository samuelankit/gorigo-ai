import { db } from "@/lib/db";
import { assistSuggestions } from "@/shared/schema";
import { eq, asc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const { id } = await params;
    const result = await db
      .select()
      .from(assistSuggestions)
      .where(eq(assistSuggestions.sessionId, parseInt(id, 10)))
      .orderBy(asc(assistSuggestions.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
