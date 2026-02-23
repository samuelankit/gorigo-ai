import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { campaignContacts, campaigns } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const addSchema = z.object({
  campaignId: z.number().optional(),
  companies: z.array(z.object({
    companyNumber: z.string(),
    companyName: z.string(),
    entityType: z.string(),
    registeredAddress: z.string().optional(),
    status: z.string().optional(),
    sicCodes: z.array(z.string()).optional(),
  })),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addSchema.parse(body);

    if (parsed.campaignId) {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.id, parsed.campaignId), eq(campaigns.orgId, auth.orgId)))
        .limit(1);
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
    }

    const contacts = parsed.companies.map((company) => ({
      ...(parsed.campaignId ? { campaignId: parsed.campaignId } : {}),
      orgId: auth.orgId,
      contactName: company.companyName,
      phoneNumber: "",
      phoneNumberE164: "",
      contactEmail: "",
      contactMetadata: {
        companyNumber: company.companyNumber,
        entityType: company.entityType,
        registeredAddress: company.registeredAddress || "",
        status: company.status || "",
        sicCodes: company.sicCodes || [],
        source: "companies_house",
      },
      status: "pending",
    }));

    let created = 0;
    if (contacts.length > 0) {
      const result = await db.insert(campaignContacts).values(contacts as any).returning();
      created = result.length;
    }

    return NextResponse.json({
      created,
      message: `${created} companies added. Note: Phone numbers are not available from Companies House. Add phone numbers manually or from another source.`,
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Companies House Add");
  }
}
