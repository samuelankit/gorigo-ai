import { db } from "@/lib/db";
import { analyticsAlerts } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const isRead = searchParams.get("isRead");

    if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

    const conditions: any[] = [eq(analyticsAlerts.orgId, parseInt(orgId))];
    if (isRead === "true") conditions.push(eq(analyticsAlerts.isRead, true));
    if (isRead === "false") conditions.push(eq(analyticsAlerts.isRead, false));

    const alerts = await db
      .select()
      .from(analyticsAlerts)
      .where(and(...conditions))
      .orderBy(desc(analyticsAlerts.createdAt));

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error("Analytics alerts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const body = await request.json();
    const { orgId, alertType, severity, message, data } = body;

    if (!orgId || !alertType || !severity || !message) {
      return NextResponse.json({ error: "orgId, alertType, severity, and message are required" }, { status: 400 });
    }

    const [alert] = await db
      .insert(analyticsAlerts)
      .values({
        orgId,
        alertType,
        severity,
        message,
        data: data ?? null,
      })
      .returning();

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error: any) {
    console.error("Create analytics alert error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
