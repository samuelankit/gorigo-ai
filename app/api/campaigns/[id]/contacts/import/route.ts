import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, campaignContacts } from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { isOnDNCList, normalizePhoneNumber } from "@/lib/dnc";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

const COUNTRY_PREFIXES: [string, string][] = [
  ["+971", "AE"], ["+353", "IE"],
  ["+44", "GB"], ["+33", "FR"], ["+49", "DE"], ["+91", "IN"],
  ["+61", "AU"], ["+34", "ES"], ["+39", "IT"], ["+31", "NL"],
  ["+81", "JP"], ["+55", "BR"], ["+52", "MX"], ["+65", "SG"],
  ["+27", "ZA"], ["+46", "SE"], ["+41", "CH"], ["+48", "PL"],
  ["+1", "US"],
];

const SORTED_PREFIXES = [...COUNTRY_PREFIXES].sort((a, b) => b[0].length - a[0].length);

function detectCountryFromPhone(phoneE164: string): string | null {
  for (const [prefix, code] of SORTED_PREFIXES) {
    if (phoneE164.startsWith(prefix)) {
      return code;
    }
  }
  return null;
}

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

export async function POST(
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

    const { id } = await params;
    const campaignId = parseInt(id, 10);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await request.json();
    const { contacts } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "Contacts array is required" }, { status: 400 });
    }

    if (contacts.length > 1000) {
      return NextResponse.json(
        { error: "Maximum 1000 contacts per import" },
        { status: 400 }
      );
    }

    let validCount = 0;
    let invalidCount = 0;
    let dncBlockedCount = 0;
    let duplicatesSkipped = 0;
    const insertedContacts: any[] = [];

    for (const contact of contacts) {
      const rawPhone = contact.phone;
      if (!rawPhone) {
        invalidCount++;
        try {
          const [inserted] = await db
            .insert(campaignContacts)
            .values({
              campaignId,
              orgId: auth.orgId,
              phoneNumber: "",
              phoneNumberE164: "",
              countryCode: null,
              contactName: contact.name || null,
              contactEmail: contact.email || null,
              status: "invalid",
              dncChecked: false,
              dncResult: "missing phone number",
            })
            .returning();
          insertedContacts.push({
            id: inserted.id,
            phoneNumberE164: "",
            contactName: inserted.contactName,
            countryCode: null,
            status: "invalid",
            dncResult: "missing phone number",
          });
        } catch (error) {
          // skip if insert fails (e.g. duplicate empty phone)
        }
        continue;
      }

      const normalized = normalizePhoneNumber(rawPhone);

      if (!isValidE164(normalized)) {
        invalidCount++;
        insertedContacts.push({
          phoneNumberE164: normalized,
          contactName: contact.name || null,
          countryCode: null,
          status: "invalid",
          dncResult: null,
        });
        continue;
      }

      const countryCode = detectCountryFromPhone(normalized);

      const existing = await db
        .select({ id: campaignContacts.id })
        .from(campaignContacts)
        .where(
          and(
            eq(campaignContacts.campaignId, campaignId),
            eq(campaignContacts.phoneNumberE164, normalized)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        duplicatesSkipped++;
        continue;
      }

      const onDnc = await isOnDNCList(auth.orgId, normalized);

      let status: string;
      let dncResult: string | null = null;

      if (onDnc) {
        status = "dnc_blocked";
        dncResult = "blocked";
        dncBlockedCount++;
      } else {
        status = "valid";
        validCount++;
      }

      const [inserted] = await db
        .insert(campaignContacts)
        .values({
          campaignId,
          orgId: auth.orgId,
          phoneNumber: rawPhone,
          phoneNumberE164: normalized,
          countryCode,
          contactName: contact.name || null,
          contactEmail: contact.email || null,
          status,
          dncChecked: true,
          dncResult,
          dncCheckedAt: new Date(),
        })
        .returning();

      insertedContacts.push({
        id: inserted.id,
        phoneNumberE164: inserted.phoneNumberE164,
        contactName: inserted.contactName,
        countryCode: inserted.countryCode,
        status: inserted.status,
        dncResult: inserted.dncResult,
      });
    }

    const actualInserted = insertedContacts.length;

    await db
      .update(campaigns)
      .set({
        totalContacts: sql`(SELECT COUNT(*) FROM campaign_contacts WHERE campaign_id = ${campaignId} AND org_id = ${auth.orgId})`,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    return NextResponse.json({
      imported: actualInserted,
      valid: validCount,
      invalid: invalidCount,
      dncBlocked: dncBlockedCount,
      duplicatesSkipped,
      contacts: insertedContacts,
    });
  } catch (error) {
    return handleRouteError(error, "CampaignContactImport");
  }
}
