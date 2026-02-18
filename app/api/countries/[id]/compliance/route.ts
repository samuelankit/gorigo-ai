import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countryComplianceProfiles, insertCountryComplianceProfileSchema } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const countryId = parseInt(id, 10);
    if (isNaN(countryId)) {
      return NextResponse.json({ error: "Invalid country ID" }, { status: 400 });
    }

    const [profile] = await db
      .select()
      .from(countryComplianceProfiles)
      .where(eq(countryComplianceProfiles.countryId, countryId))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: "Compliance profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    return handleRouteError(error, "CountryCompliance");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const countryId = parseInt(id, 10);
    if (isNaN(countryId)) {
      return NextResponse.json({ error: "Invalid country ID" }, { status: 400 });
    }

    const body = await request.json();
    const data = insertCountryComplianceProfileSchema.parse({
      ...body,
      countryId,
    });

    const [existing] = await db
      .select()
      .from(countryComplianceProfiles)
      .where(eq(countryComplianceProfiles.countryId, countryId))
      .limit(1);

    let result;
    if (existing) {
      const [updated] = await db
        .update(countryComplianceProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(countryComplianceProfiles.countryId, countryId))
        .returning();
      result = updated;
    } else {
      const [created] = await db
        .insert(countryComplianceProfiles)
        .values(data)
        .returning();
      result = created;
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "CountryCompliance");
  }
}
