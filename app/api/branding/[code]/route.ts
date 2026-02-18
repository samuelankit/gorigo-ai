import { db } from "@/lib/db";
import { partners } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { publicLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const rl = await publicLimiter(_request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { code } = await params;

    if (!code || code.length < 3) {
      return NextResponse.json(
        { error: "Invalid partner code" },
        { status: 400 }
      );
    }

    const [partner] = await db
      .select({
        brandName: partners.brandingCompanyName,
        brandLogo: partners.brandingLogo,
        brandColor: partners.brandingPrimaryColor,
        partnerName: partners.name,
        mobileAppEnabled: partners.mobileAppEnabled,
      })
      .from(partners)
      .where(
        and(
          eq(partners.partnerCode, code),
          eq(partners.status, "active"),
          eq(partners.mobileAppEnabled, true)
        )
      )
      .limit(1);

    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found or mobile app not enabled" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      brandName: partner.brandName || partner.partnerName,
      brandLogo: partner.brandLogo || null,
      brandColor: partner.brandColor || "#189553",
    });
  } catch (error) {
    return handleRouteError(error, "Branding");
  }
}
