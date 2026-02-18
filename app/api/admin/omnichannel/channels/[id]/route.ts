import { db } from "@/lib/db";
import { channelConfigurations } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const ALLOWED = ["enabled", "credentials", "webhookUrl", "healthStatus", "rateLimitPerMinute"];
    const updateData: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    const [updated] = await db
      .update(channelConfigurations)
      .set(updateData)
      .where(eq(channelConfigurations.id, parseInt(id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Channel configuration not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Channel configuration update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
