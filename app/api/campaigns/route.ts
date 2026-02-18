import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, insertCampaignSchema } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireEmailVerified } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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
    return handleRouteError(error, "Campaigns");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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
  } catch (error) {
    return handleRouteError(error, "Campaigns");
  }
}
