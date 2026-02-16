import { db } from "@/lib/db";
import { partners } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
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
    console.error("Branding lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
