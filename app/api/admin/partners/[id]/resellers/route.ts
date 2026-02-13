import { db } from "@/lib/db";
import { partners, partnerClients } from "@/shared/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { z } from "zod";

const createResellerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contactEmail: z.string().email("Invalid email"),
  contactName: z.string().max(200).optional().nullable(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM", "ENTERPRISE"]).optional(),
  status: z.enum(["pending", "active", "suspended", "terminated"]).optional(),
  wholesaleRatePerMinute: z.number().min(0).max(10).optional(),
  monthlyPlatformFee: z.number().min(0).max(100000).optional(),
  revenueSharePercent: z.number().min(0).max(100).optional(),
  whitelabelMode: z.enum(["none", "co-branded", "white-label"]).optional(),
  maxClients: z.number().int().min(1).max(10000).optional(),
  canSellDirect: z.boolean().optional(),
  canCreateAffiliates: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { id } = await params;
    const partnerId = parseInt(id, 10);
    if (isNaN(partnerId)) {
      return NextResponse.json({ error: "Invalid partner ID" }, { status: 400 });
    }

    const [parent] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
    if (!parent) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const resellers = await db
      .select({
        id: partners.id,
        name: partners.name,
        contactEmail: partners.contactEmail,
        contactName: partners.contactName,
        tier: partners.tier,
        status: partners.status,
        partnerType: partners.partnerType,
        wholesaleRatePerMinute: partners.wholesaleRatePerMinute,
        revenueSharePercent: partners.revenueSharePercent,
        canSellDirect: partners.canSellDirect,
        canCreateAffiliates: partners.canCreateAffiliates,
        createdAt: partners.createdAt,
        clientCount: count(partnerClients.id),
      })
      .from(partners)
      .leftJoin(partnerClients, eq(partners.id, partnerClients.partnerId))
      .where(eq(partners.parentPartnerId, partnerId))
      .groupBy(partners.id)
      .orderBy(desc(partners.createdAt));

    return NextResponse.json({ resellers, parentPartner: { id: parent.id, name: parent.name, maxResellers: parent.maxResellers } });
  } catch (error) {
    console.error("List resellers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { id } = await params;
    const parentId = parseInt(id, 10);
    if (isNaN(parentId)) {
      return NextResponse.json({ error: "Invalid partner ID" }, { status: 400 });
    }

    const [parent] = await db.select().from(partners).where(eq(partners.id, parentId)).limit(1);
    if (!parent) {
      return NextResponse.json({ error: "Parent partner not found" }, { status: 404 });
    }

    if (parent.partnerType === "reseller") {
      return NextResponse.json({ error: "Only business partners can create resellers. Resellers cannot create sub-resellers." }, { status: 403 });
    }

    if (!parent.canCreateResellers) {
      return NextResponse.json({ error: "This partner does not have reseller creation privileges" }, { status: 403 });
    }

    const existingResellers = await db
      .select({ total: count() })
      .from(partners)
      .where(eq(partners.parentPartnerId, parentId));

    const currentCount = Number(existingResellers[0]?.total ?? 0);
    if (currentCount >= (parent.maxResellers ?? 20)) {
      return NextResponse.json({
        error: `Reseller limit reached (${parent.maxResellers ?? 20}). Upgrade the partner tier to add more.`,
      }, { status: 400 });
    }

    const rawBody = await request.json();
    const parsed = createResellerSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const body = parsed.data;

    const [reseller] = await db
      .insert(partners)
      .values({
        name: body.name,
        contactEmail: body.contactEmail,
        contactName: body.contactName ?? null,
        tier: body.tier ?? parent.tier ?? "BRONZE",
        status: body.status ?? "pending",
        partnerType: "reseller",
        parentPartnerId: parentId,
        wholesaleRatePerMinute: String(body.wholesaleRatePerMinute ?? (Number(parent.resellerRatePerMinute) || 0.04)),
        resellerRatePerMinute: "0",
        monthlyPlatformFee: String(body.monthlyPlatformFee ?? 0),
        revenueSharePercent: String(body.revenueSharePercent ?? 10),
        whitelabelMode: body.whitelabelMode ?? parent.whitelabelMode ?? "co-branded",
        maxClients: body.maxClients ?? 25,
        maxResellers: 0,
        canCreateResellers: false,
        canSellDirect: body.canSellDirect ?? true,
        canCreateAffiliates: body.canCreateAffiliates ?? true,
        notes: body.notes ?? null,
      })
      .returning();

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "reseller.create",
      entityType: "partner",
      entityId: reseller.id,
      details: { parentPartnerId: parentId, name: reseller.name, contactEmail: reseller.contactEmail },
    });

    return NextResponse.json({ reseller }, { status: 201 });
  } catch (error) {
    console.error("Create reseller error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
