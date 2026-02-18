import { db } from "@/lib/db";
import { channelConfigurations } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
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
      .orderBy(desc(channelConfigurations.createdAt))
      .limit(100);

    return NextResponse.json({ channels });
  } catch (error) {
    return handleRouteError(error, "Channels");
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
    const VALID_CHANNELS = ["whatsapp", "sms", "email", "web_chat"];
    if (!body.orgId || !body.channelType) {
      return NextResponse.json({ error: "orgId and channelType are required" }, { status: 400 });
    }
    if (!VALID_CHANNELS.includes(body.channelType)) {
      return NextResponse.json({ error: `Invalid channelType. Must be: ${VALID_CHANNELS.join(", ")}` }, { status: 400 });
    }
    const [channel] = await db.insert(channelConfigurations).values({
      orgId: body.orgId,
      channelType: body.channelType,
      enabled: body.enabled ?? true,
      credentials: body.credentials,
      webhookUrl: body.webhookUrl,
      rateLimitPerMinute: body.rateLimitPerMinute ?? 60,
    }).returning();
    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Channels");
  }
}
