import { db } from "@/lib/db";
import { channelConfigurations, channelHealthLog } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const healthLogs = await db
      .select()
      .from(channelHealthLog)
      .where(
        and(
          eq(channelHealthLog.orgId, channel.orgId),
          eq(channelHealthLog.channelType, channel.channelType)
        )
      )
      .orderBy(desc(channelHealthLog.createdAt))
      .limit(20);

    return NextResponse.json({
      channel: {
        id: channel.id,
        channelType: channel.channelType,
        healthStatus: channel.healthStatus,
        lastHealthCheck: channel.lastHealthCheck,
        status: channel.status,
      },
      healthLogs,
    });
  } catch (error) {
    return handleRouteError(error, "ChannelHealth");
  }
}
