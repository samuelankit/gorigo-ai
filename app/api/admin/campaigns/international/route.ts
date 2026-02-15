import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, campaignContacts, countries, insertCampaignContactSchema } from "@/shared/schema";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { adminLimiter } from "@/lib/rate-limit";
import { isOnDNCList } from "@/lib/dnc";

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

function validateE164(phone: string): { valid: boolean; normalized: string; error?: string } {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (!cleaned.startsWith("+")) {
    return { valid: false, normalized: cleaned, error: "Must start with +" };
  }
  if (!E164_REGEX.test(cleaned)) {
    return { valid: false, normalized: cleaned, error: "Invalid E.164 format" };
  }
  return { valid: true, normalized: cleaned };
}

function detectCountryFromE164(phone: string): string | null {
  const prefixMap: [string, string][] = [
    ["+1", "US"], ["+44", "GB"], ["+33", "FR"], ["+49", "DE"],
    ["+91", "IN"], ["+61", "AU"], ["+34", "ES"], ["+39", "IT"],
    ["+31", "NL"], ["+81", "JP"], ["+55", "BR"], ["+52", "MX"],
    ["+971", "AE"], ["+65", "SG"], ["+27", "ZA"], ["+353", "IE"],
    ["+46", "SE"], ["+41", "CH"], ["+48", "PL"],
  ];
  
  for (const [prefix, code] of prefixMap) {
    if (phone.startsWith(prefix)) return code;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    if (campaignId) {
      const contacts = await db
        .select()
        .from(campaignContacts)
        .where(eq(campaignContacts.campaignId, parseInt(campaignId, 10)))
        .orderBy(desc(campaignContacts.createdAt));

      const stats = await db
        .select({
          total: count(),
          pending: sql<number>`COUNT(CASE WHEN ${campaignContacts.status} = 'pending' THEN 1 END)`,
          completed: sql<number>`COUNT(CASE WHEN ${campaignContacts.status} = 'completed' THEN 1 END)`,
          failed: sql<number>`COUNT(CASE WHEN ${campaignContacts.status} = 'failed' THEN 1 END)`,
          optedOut: sql<number>`COUNT(CASE WHEN ${campaignContacts.optedOut} = true THEN 1 END)`,
          dncBlocked: sql<number>`COUNT(CASE WHEN ${campaignContacts.dncResult} = 'blocked' THEN 1 END)`,
        })
        .from(campaignContacts)
        .where(eq(campaignContacts.campaignId, parseInt(campaignId, 10)));

      return NextResponse.json({ contacts, stats: stats[0] });
    }

    const campaignList = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        countryCode: campaigns.countryCode,
        status: campaigns.status,
        contactCount: sql<number>`(SELECT COUNT(*) FROM campaign_contacts WHERE campaign_id = ${campaigns.id})`,
      })
      .from(campaigns)
      .where(sql`${campaigns.countryCode} IS NOT NULL`)
      .orderBy(desc(campaigns.createdAt));

    return NextResponse.json({ campaigns: campaignList });
  } catch (error) {
    console.error("International campaigns error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json();
    const { campaignId, contacts } = body;

    if (!campaignId || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "campaignId and contacts array required" }, { status: 400 });
    }

    const [campaign] = await db.select().from(campaigns)
      .where(eq(campaigns.id, campaignId)).limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const results = {
      added: 0,
      skipped: 0,
      invalid: 0,
      dncBlocked: 0,
      errors: [] as string[],
    };

    for (const contact of contacts) {
      const phone = contact.phoneNumber || contact.phone;
      if (!phone) {
        results.invalid++;
        results.errors.push(`Missing phone number for contact: ${JSON.stringify(contact)}`);
        continue;
      }

      const validation = validateE164(phone);
      if (!validation.valid) {
        results.invalid++;
        results.errors.push(`Invalid number ${phone}: ${validation.error}`);
        continue;
      }

      const countryCode = contact.countryCode || detectCountryFromE164(validation.normalized) || campaign.countryCode;

      const orgId = campaign.orgId;
      const onDnc = await isOnDNCList(orgId, validation.normalized);

      try {
        await db.insert(campaignContacts).values({
          campaignId,
          orgId,
          phoneNumber: phone,
          phoneNumberE164: validation.normalized,
          countryCode: countryCode || null,
          contactName: contact.name || contact.contactName || null,
          contactEmail: contact.email || contact.contactEmail || null,
          contactMetadata: contact.metadata || null,
          dncChecked: true,
          dncResult: onDnc ? "blocked" : "clear",
          dncCheckedAt: new Date(),
          status: onDnc ? "dnc_blocked" : "pending",
          maxAttempts: campaign.maxRetries || 3,
        });
        
        if (onDnc) {
          results.dncBlocked++;
        } else {
          results.added++;
        }
      } catch (err: any) {
        if (err.message?.includes("unique") || err.code === "23505") {
          results.skipped++;
        } else {
          results.errors.push(`Error adding ${phone}: ${err.message}`);
        }
      }
    }

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "campaign_contacts.import",
      entityType: "campaign",
      entityId: campaignId,
      details: { ...results, totalProvided: contacts.length },
    });

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    console.error("Campaign contacts import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
