import { db } from "@/lib/db";
import { unifiedContacts } from "@/shared/schema";
import { eq, and, desc, sql, ilike, or, count } from "drizzle-orm";
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

    const url = request.nextUrl;
    const orgId = url.searchParams.get("orgId");
    const search = url.searchParams.get("search");
    const channel = url.searchParams.get("channel");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const conditions = [];
    if (orgId) conditions.push(eq(unifiedContacts.orgId, parseInt(orgId)));
    if (channel) conditions.push(eq(unifiedContacts.lastChannel, channel));
    if (search) {
      conditions.push(
        or(
          ilike(unifiedContacts.displayName, `%${search}%`),
          ilike(unifiedContacts.primaryPhone, `%${search}%`),
          ilike(unifiedContacts.primaryEmail, `%${search}%`)
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ total: count() }).from(unifiedContacts).where(where);
    const contacts = await db
      .select()
      .from(unifiedContacts)
      .where(where)
      .orderBy(desc(unifiedContacts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ contacts, total: Number(totalResult.total), limit, offset });
  } catch (error) {
    console.error("Omnichannel contacts list error:", error);
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
    const [contact] = await db.insert(unifiedContacts).values(body).returning();
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Omnichannel contact create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
