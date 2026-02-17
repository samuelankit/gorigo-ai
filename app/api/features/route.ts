import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { partners, partnerClients, affiliates } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";

const FEATURE_MATRIX: Record<string, string[]> = {
  SUPERADMIN: [
    "dashboard", "analytics", "partners", "clients", "affiliates",
    "distribution", "wallets", "pricing", "settings", "audit",
    "agent_config", "calls", "knowledge", "billing",
  ],
  PARTNER: [
    "dashboard", "clients", "affiliates", "wallet",
    "agent_config", "calls", "knowledge", "billing", "settings",
    "partner_analytics",
  ],
  CLIENT: [
    "dashboard", "agent_config", "calls", "knowledge",
    "wallet", "billing", "settings",
  ],
  AFFILIATE: [
    "affiliate_dashboard", "referral_link", "commissions",
    "payouts", "settings",
  ],
};

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = auth.globalRole || "CLIENT";
    let features = FEATURE_MATRIX[role] || FEATURE_MATRIX.CLIENT;
    let userType = role.toLowerCase();
    let partnerInfo = null;
    let affiliateInfo = null;

    if (role !== "SUPERADMIN" && auth.orgId) {
      const orgId = auth.orgId;
      const [partnerLink] = await db
        .select()
        .from(partners)
        .where(eq(partners.orgId, orgId))
        .limit(1);

      if (partnerLink) {
        userType = "partner";
        features = FEATURE_MATRIX.PARTNER;
        partnerInfo = {
          id: partnerLink.id,
          name: partnerLink.name,
          tier: partnerLink.tier,
          canCreateAffiliates: partnerLink.canCreateAffiliates,
        };

        if (!partnerLink.canCreateAffiliates) {
          features = features.filter(f => f !== "affiliates");
        }
      }

      const [userAffiliate] = await db
        .select()
        .from(affiliates)
        .where(eq(affiliates.userId, auth.user.id))
        .limit(1);

      if (userAffiliate) {
        userType = "affiliate";
        const combined = [...features, ...FEATURE_MATRIX.AFFILIATE];
        features = combined.filter((v, i, a) => a.indexOf(v) === i);
        affiliateInfo = {
          id: userAffiliate.id,
          code: userAffiliate.code,
          status: userAffiliate.status,
        };
      }
    }

    return NextResponse.json({
      features,
      userType,
      role,
      partnerInfo,
      affiliateInfo,
    });
  } catch (error) {
    console.error("Features GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
