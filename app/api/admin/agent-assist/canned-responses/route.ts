import { db } from "@/lib/db";
import { cannedResponses } from "@/shared/schema";
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
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const category = searchParams.get("category");
    const conditions: any[] = [];
    if (orgId) conditions.push(eq(cannedResponses.orgId, parseInt(orgId, 10)));
    if (category) conditions.push(eq(cannedResponses.category, category));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const result = await db.select().from(cannedResponses).where(where).orderBy(desc(cannedResponses.usageCount)).limit(limit).offset(offset);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "CannedResponses");
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
    if (!body.orgId || !body.title || !body.content) {
      return NextResponse.json({ error: "orgId, title, and content are required" }, { status: 400 });
    }
    const [response] = await db.insert(cannedResponses).values({
      orgId: body.orgId,
      category: body.category,
      title: body.title,
      content: body.content,
      shortcut: body.shortcut,
      isActive: body.isActive ?? true,
    }).returning();
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "CannedResponses");
  }
}
