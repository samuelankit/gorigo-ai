import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { affiliates, affiliateCommissions, affiliatePayouts, partners, partnerClients } from "@/shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";

function generateAffiliateCode(prefix: string = "GR"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = `${prefix}-`;
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getPartnerForUser(userId: number, orgId: number) {
  const partnerResults = await db
    .select()
    .from(partners)
    .where(eq(partners.orgId, orgId))
    .limit(1);
  return partnerResults[0] || null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.globalRole === "SUPERADMIN") {
      const allAffiliates = await db.select().from(affiliates).orderBy(desc(affiliates.createdAt));
      return NextResponse.json({ affiliates: allAffiliates });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization context" }, { status: 403 });
    }

    const partner = await getPartnerForUser(auth.user.id, auth.orgId);

    if (partner && partner.canCreateAffiliates) {
      const partnerAffiliates = await db
        .select()
        .from(affiliates)
        .where(and(
          eq(affiliates.ownerType, "partner"),
          eq(affiliates.ownerId, partner.id)
        ))
        .orderBy(desc(affiliates.createdAt));

      const [stats] = await db.select({
        totalClicks: sql<number>`COALESCE(SUM(${affiliates.totalClicks}), 0)`,
        totalSignups: sql<number>`COALESCE(SUM(${affiliates.totalSignups}), 0)`,
        totalEarnings: sql<number>`COALESCE(SUM(${affiliates.totalEarnings}), 0)`,
      }).from(affiliates)
        .where(and(
          eq(affiliates.ownerType, "partner"),
          eq(affiliates.ownerId, partner.id)
        ));

      return NextResponse.json({
        affiliates: partnerAffiliates,
        stats,
        canCreate: true,
      });
    }

    const userAffiliate = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.userId, auth.user.id))
      .limit(1);

    if (userAffiliate.length > 0) {
      const aff = userAffiliate[0];
      const commissions = await db
        .select()
        .from(affiliateCommissions)
        .where(eq(affiliateCommissions.affiliateId, aff.id))
        .orderBy(desc(affiliateCommissions.createdAt))
        .limit(50);

      const payouts = await db
        .select()
        .from(affiliatePayouts)
        .where(eq(affiliatePayouts.affiliateId, aff.id))
        .orderBy(desc(affiliatePayouts.createdAt))
        .limit(20);

      return NextResponse.json({
        affiliate: aff,
        commissions,
        payouts,
        isAffiliate: true,
      });
    }

    return NextResponse.json({ affiliates: [], canCreate: false, isAffiliate: false });
  } catch (error) {
    console.error("Affiliates GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization context" }, { status: 403 });
    }

    const partner = await getPartnerForUser(auth.user.id, auth.orgId);
    if (!partner || !partner.canCreateAffiliates) {
      return NextResponse.json({ error: "Only partners with affiliate creation privileges can create affiliate links" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, commissionRate, notes } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const maxRate = Math.min(commissionRate ?? 10, Number(partner.revenueSharePercent ?? "20"));
    if (maxRate < 0 || maxRate > 50) {
      return NextResponse.json({ error: "Commission rate must be between 0 and 50%" }, { status: 400 });
    }

    const prefix = partner.brandingCompanyName
      ? partner.brandingCompanyName.substring(0, 3).toUpperCase()
      : "PT";
    let code = generateAffiliateCode(prefix);
    const existingCode = await db.select().from(affiliates).where(eq(affiliates.code, code)).limit(1);
    if (existingCode.length > 0) {
      code = generateAffiliateCode(prefix);
    }

    const [affiliate] = await db.insert(affiliates).values({
      code,
      name,
      email,
      commissionRate: String(maxRate),
      commissionType: "percentage",
      ownerType: "partner",
      ownerId: partner.id,
      notes,
      status: "active",
    }).returning();

    return NextResponse.json({ affiliate }, { status: 201 });
  } catch (error) {
    console.error("Partner affiliates POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
