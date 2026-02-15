import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, insertCampaignSchema } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireEmailVerified } from "@/lib/get-user";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.orgId, auth.orgId))
      .orderBy(campaigns.createdAt);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Campaign list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const verifiedCheck = requireEmailVerified(auth);
    if (!verifiedCheck.allowed) {
      return NextResponse.json({ error: verifiedCheck.error }, { status: verifiedCheck.status || 403 });
    }

    const body = await request.json();
    const data = insertCampaignSchema.parse({
      ...body,
      orgId: auth.orgId,
      totalContacts: Array.isArray(body.contactList) ? body.contactList.length : 0,
    });

    const [campaign] = await db.insert(campaigns).values(data).returning();
    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Campaign create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
