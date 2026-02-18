import { db } from "@/lib/db";
import { messageTemplates } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
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

    const url = request.nextUrl;
    const orgId = url.searchParams.get("orgId");
    const channelType = url.searchParams.get("channelType");
    const approvalStatus = url.searchParams.get("approvalStatus");

    const conditions = [];
    if (orgId) conditions.push(eq(messageTemplates.orgId, parseInt(orgId)));
    if (channelType) conditions.push(eq(messageTemplates.channelType, channelType));
    if (approvalStatus) conditions.push(eq(messageTemplates.approvalStatus, approvalStatus));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const templates = await db
      .select()
      .from(messageTemplates)
      .where(where)
      .orderBy(desc(messageTemplates.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ templates });
  } catch (error) {
    return handleRouteError(error, "MessageTemplates");
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
    if (!body.orgId || !body.name || !body.content || !body.channelType) {
      return NextResponse.json({ error: "orgId, name, content, and channelType are required" }, { status: 400 });
    }
    const VALID_CHANNELS = ["whatsapp", "sms", "email", "web_chat"];
    if (!VALID_CHANNELS.includes(body.channelType)) {
      return NextResponse.json({ error: `Invalid channelType. Must be: ${VALID_CHANNELS.join(", ")}` }, { status: 400 });
    }
    const [template] = await db.insert(messageTemplates).values({
      orgId: body.orgId,
      name: body.name,
      content: body.content,
      channelType: body.channelType,
      category: body.category,
      language: body.language ?? "en",
      variables: body.variables,
      approvalStatus: "pending",
    }).returning();
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "MessageTemplates");
  }
}
