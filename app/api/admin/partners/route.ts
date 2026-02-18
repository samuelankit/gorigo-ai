import { db } from "@/lib/db";
import { partners, partnerClients } from "@/shared/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const createPartnerSchema = z.object({
  name: z.string().min(1).max(200),
  contactEmail: z.string().email().max(255),
  contactName: z.string().max(200).nullable().optional(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional().default("BRONZE"),
  status: z.enum(["pending", "active", "suspended"]).optional().default("pending"),
  wholesaleRatePerMinute: z.number().min(0).max(10).optional().default(0.05),
  resellerRatePerMinute: z.number().min(0).max(10).optional().default(0.04),
  monthlyPlatformFee: z.number().min(0).max(100000).optional().default(0),
  revenueSharePercent: z.number().min(0).max(100).optional().default(0),
  whitelabelMode: z.enum(["co-branded", "white-label"]).optional().default("co-branded"),
  maxClients: z.number().int().min(1).max(10000).optional().default(50),
  maxResellers: z.number().int().min(0).max(1000).optional().default(20),
  canCreateResellers: z.boolean().optional().default(true),
  canSellDirect: z.boolean().optional().default(true),
  canCreateAffiliates: z.boolean().optional().default(true),
  notes: z.string().max(5000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    const results = await db
      .select({
        id: partners.id,
        name: partners.name,
        contactEmail: partners.contactEmail,
        contactName: partners.contactName,
        tier: partners.tier,
        status: partners.status,
        partnerType: partners.partnerType,
        parentPartnerId: partners.parentPartnerId,
        wholesaleRatePerMinute: partners.wholesaleRatePerMinute,
        monthlyPlatformFee: partners.monthlyPlatformFee,
        whitelabelMode: partners.whitelabelMode,
        maxClients: partners.maxClients,
        canCreateResellers: partners.canCreateResellers,
        canSellDirect: partners.canSellDirect,
        canCreateAffiliates: partners.canCreateAffiliates,
        createdAt: partners.createdAt,
        suspendedAt: partners.suspendedAt,
        clientCount: count(partnerClients.id),
      })
      .from(partners)
      .leftJoin(partnerClients, eq(partners.id, partnerClients.partnerId))
      .groupBy(partners.id)
      .orderBy(desc(partners.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ total: count() })
      .from(partners);

    return NextResponse.json({
      partners: results,
      pagination: { total: Number(totalResult.total), limit, offset },
    });
  } catch (error) {
    return handleRouteError(error, "AdminPartners");
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    let validated;
    try {
      validated = createPartnerSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const [partner] = await db
      .insert(partners)
      .values({
        name: validated.name,
        contactEmail: validated.contactEmail,
        contactName: validated.contactName ?? null,
        tier: validated.tier,
        status: validated.status,
        partnerType: "business_partner",
        wholesaleRatePerMinute: String(validated.wholesaleRatePerMinute),
        resellerRatePerMinute: String(validated.resellerRatePerMinute),
        monthlyPlatformFee: String(validated.monthlyPlatformFee),
        revenueSharePercent: String(validated.revenueSharePercent),
        whitelabelMode: validated.whitelabelMode,
        maxClients: validated.maxClients,
        maxResellers: validated.maxResellers,
        canCreateResellers: validated.canCreateResellers,
        canSellDirect: validated.canSellDirect,
        canCreateAffiliates: validated.canCreateAffiliates,
        notes: validated.notes ?? null,
      })
      .returning();

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "partner.create",
      entityType: "partner",
      entityId: partner.id,
      details: { name: partner.name, contactEmail: partner.contactEmail },
    });

    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "AdminPartners");
  }
}
