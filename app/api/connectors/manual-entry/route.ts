import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { normalizePhoneE164 } from "@/lib/phone-normalize";
import { db } from "@/lib/db";
import { campaignContacts, campaigns } from "@/shared/schema";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";

const manualSchema = z.object({
  campaignId: z.number().optional(),
  defaultCountry: z.string().default("GB"),
  skipDuplicates: z.boolean().default(true),
  contacts: z.array(z.object({
    name: z.string().optional().default(""),
    phone: z.string().min(1, "Phone number is required"),
    email: z.string().optional().default(""),
    company: z.string().optional().default(""),
  })).min(1, "At least one contact is required").max(20, "Maximum 20 contacts per manual entry"),
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
    const parsed = manualSchema.parse(body);

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

    let existingPhones = new Set<string>();
    if (parsed.skipDuplicates) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentContacts = await db
        .select({ phone: campaignContacts.phoneNumberE164 })
        .from(campaignContacts)
        .where(
          and(
            eq(campaignContacts.orgId, auth.orgId),
            gte(campaignContacts.createdAt, thirtyDaysAgo)
          )
        );
      existingPhones = new Set(recentContacts.map(c => c.phone));
    }

    const validContacts: Array<Record<string, unknown>> = [];
    const errors: Array<{ index: number; reason: string }> = [];
    let duplicateCount = 0;

    for (let i = 0; i < parsed.contacts.length; i++) {
      const c = parsed.contacts[i];
      const normalized = normalizePhoneE164(c.phone, parsed.defaultCountry);

      if (!normalized.valid) {
        errors.push({ index: i, reason: `Invalid phone number '${c.phone}'` });
        continue;
      }

      if (parsed.skipDuplicates && existingPhones.has(normalized.e164)) {
        duplicateCount++;
        continue;
      }

      existingPhones.add(normalized.e164);

      const metadata: Record<string, unknown> = { source: "manual_entry" };
      if (c.company) metadata.company = c.company;

      validContacts.push({
        ...(parsed.campaignId ? { campaignId: parsed.campaignId } : {}),
        orgId: auth.orgId,
        phoneNumber: c.phone,
        phoneNumberE164: normalized.e164,
        contactName: c.name || "",
        contactEmail: c.email || "",
        contactMetadata: metadata,
        status: "pending",
      });
    }

    let created = 0;
    if (validContacts.length > 0) {
      const result = await db.insert(campaignContacts).values(validContacts as any).returning();
      created = result.length;
    }

    return NextResponse.json({
      created,
      duplicatesSkipped: duplicateCount,
      errors,
      totalSubmitted: parsed.contacts.length,
    });
  } catch (error) {
    return handleRouteError(error, "Manual Entry");
  }
}
