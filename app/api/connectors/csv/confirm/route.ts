import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { normalizePhoneE164 } from "@/lib/phone-normalize";
import { db } from "@/lib/db";
import { campaignContacts, campaigns } from "@/shared/schema";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";

const confirmSchema = z.object({
  campaignId: z.number().optional(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  columnMapping: z.object({
    phone: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional(),
  }),
  defaultCountry: z.string().default("GB"),
  skipInvalid: z.boolean().default(true),
  skipDuplicates: z.boolean().default(true),
  firstRowIsHeader: z.boolean().default(true),
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
    const parsed = confirmSchema.parse(body);

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

    const { headers, rows, columnMapping, defaultCountry } = parsed;
    const phoneIdx = columnMapping.phone ? headers.indexOf(columnMapping.phone) : -1;
    const nameIdx = columnMapping.name ? headers.indexOf(columnMapping.name) : -1;
    const emailIdx = columnMapping.email ? headers.indexOf(columnMapping.email) : -1;
    const companyIdx = columnMapping.company ? headers.indexOf(columnMapping.company) : -1;

    if (phoneIdx < 0) {
      return NextResponse.json({ error: "Phone number column mapping is required." }, { status: 400 });
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

    const contacts: Array<Record<string, unknown>> = [];
    const errors: Array<{ row: number; reason: string }> = [];
    let duplicateCount = 0;
    let skippedInvalid = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const phoneVal = phoneIdx >= 0 ? (row[phoneIdx] || "") : "";
      const nameVal = nameIdx >= 0 ? (row[nameIdx] || "") : "";
      const emailVal = emailIdx >= 0 ? (row[emailIdx] || "") : "";
      const companyVal = companyIdx >= 0 ? (row[companyIdx] || "") : "";

      if (!phoneVal) {
        if (parsed.skipInvalid) {
          skippedInvalid++;
          continue;
        }
        errors.push({ row: i + 2, reason: "Missing phone number" });
        continue;
      }

      const normalized = normalizePhoneE164(phoneVal, defaultCountry);
      if (!normalized.valid) {
        if (parsed.skipInvalid) {
          skippedInvalid++;
          continue;
        }
        errors.push({ row: i + 2, reason: `Invalid phone number '${phoneVal}'` });
        continue;
      }

      if (parsed.skipDuplicates && existingPhones.has(normalized.e164)) {
        duplicateCount++;
        continue;
      }

      existingPhones.add(normalized.e164);

      const metadata: Record<string, unknown> = { source: "csv_upload" };
      if (companyVal) metadata.company = companyVal;
      for (let j = 0; j < headers.length; j++) {
        if (j !== phoneIdx && j !== nameIdx && j !== emailIdx && j !== companyIdx) {
          if (row[j]) metadata[headers[j]] = row[j];
        }
      }

      contacts.push({
        ...(parsed.campaignId ? { campaignId: parsed.campaignId } : {}),
        orgId: auth.orgId,
        phoneNumber: phoneVal,
        phoneNumberE164: normalized.e164,
        contactName: nameVal,
        contactEmail: emailVal,
        contactMetadata: metadata,
        status: "pending",
      });
    }

    let created = 0;
    if (contacts.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        const result = await db.insert(campaignContacts).values(batch as any).returning();
        created += result.length;
      }
    }

    return NextResponse.json({
      created,
      skippedInvalid,
      duplicatesSkipped: duplicateCount,
      errors: errors.slice(0, 50),
      totalProcessed: rows.length,
    });
  } catch (error) {
    return handleRouteError(error, "CSV Confirm");
  }
}
