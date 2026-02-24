import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialStrategies } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const strategyId = parseInt(id);
    if (isNaN(strategyId)) {
      return NextResponse.json({ error: "Invalid strategy ID" }, { status: 400 });
    }

    const [strategy] = await db.select().from(socialStrategies)
      .where(and(eq(socialStrategies.id, strategyId), eq(socialStrategies.orgId, auth.orgId)))
      .limit(1);

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    return NextResponse.json({ strategy });
  } catch (err) {
    return handleRouteError(err, "Failed to fetch strategy");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const strategyId = parseInt(id);
    if (isNaN(strategyId)) {
      return NextResponse.json({ error: "Invalid strategy ID" }, { status: 400 });
    }

    const [deleted] = await db.delete(socialStrategies)
      .where(and(eq(socialStrategies.id, strategyId), eq(socialStrategies.orgId, auth.orgId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError(err, "Failed to delete strategy");
  }
}
