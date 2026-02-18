import { db } from "@/lib/db";
import { channelConfigurations, channelHealthLog } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const { id } = await params;
    const channelId = parseInt(id);

    const [channel] = await db
      .select()
      .from(channelConfigurations)
      .where(eq(channelConfigurations.id, channelId))
      .limit(1);

    if (!channel) return NextResponse.json({ error: "Channel configuration not found" }, { status: 404 });

    let status = "healthy";
    let checkType = "automatic";
    let responseTimeMs: number | null = null;
    let errorMessage: string | null = null;

    try {
      const bodyText = await request.text();
      if (bodyText) {
        const parsed = JSON.parse(bodyText);
        if (parsed.status) status = parsed.status;
        if (parsed.checkType) checkType = parsed.checkType;
        if (parsed.responseTimeMs != null) responseTimeMs = parsed.responseTimeMs;
        if (parsed.errorMessage) errorMessage = parsed.errorMessage;
      }
    } catch {
    }

    const startTime = Date.now();
    if (!responseTimeMs) {
      responseTimeMs = Date.now() - startTime;
    }

    const [logEntry] = await db
      .insert(channelHealthLog)
      .values({
        orgId: channel.orgId,
        channelType: channel.channelType,
        status,
        checkType,
        responseTimeMs,
        errorMessage,
      })
      .returning();

    await db
      .update(channelConfigurations)
      .set({
        healthStatus: status,
        lastHealthCheck: new Date(),
      })
      .where(eq(channelConfigurations.id, channelId));

    return NextResponse.json(logEntry, { status: 201 });
  } catch (error) {
    console.error("Channel health check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
