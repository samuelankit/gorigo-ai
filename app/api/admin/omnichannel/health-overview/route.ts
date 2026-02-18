import { db } from "@/lib/db";
import { channelConfigurations, channelHealthLog } from "@/shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const orgId = request.nextUrl.searchParams.get("orgId");
    const where = orgId ? eq(channelConfigurations.orgId, parseInt(orgId)) : undefined;

    const channels = await db
      .select()
      .from(channelConfigurations)
      .where(where)
      .orderBy(desc(channelConfigurations.createdAt));

    const overview = await Promise.all(
      channels.map(async (channel) => {
        const [latestLog] = await db
          .select()
          .from(channelHealthLog)
          .where(
            and(
              eq(channelHealthLog.orgId, channel.orgId),
              eq(channelHealthLog.channelType, channel.channelType)
            )
          )
          .orderBy(desc(channelHealthLog.createdAt))
          .limit(1);

        return {
          id: channel.id,
          orgId: channel.orgId,
          channelType: channel.channelType,
          isEnabled: channel.isEnabled,
          status: channel.status,
          healthStatus: channel.healthStatus,
          lastHealthCheck: channel.lastHealthCheck,
          latestHealthLog: latestLog || null,
        };
      })
    );

    return NextResponse.json({ channels: overview });
  } catch (error) {
    return handleRouteError(error, "OmnichannelHealthOverview");
  }
}
