import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { dataConnectors, campaignContacts } from "@/shared/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { listContacts, refreshAccessToken, isTokenExpiringSoon } from "@/lib/oauth-hubspot";
import { normalizePhoneE164 } from "@/lib/phone-normalize";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

const importSchema = z.object({
  contactIds: z.array(z.string()).optional(),
  importAll: z.boolean().optional(),
  campaignId: z.number().optional(),
  defaultCountry: z.string().default("GB"),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const connectorId = parseInt(id, 10);
    if (isNaN(connectorId)) {
      return NextResponse.json({ error: "Invalid connector ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = importSchema.parse(body);

    const [connector] = await db
      .select()
      .from(dataConnectors)
      .where(
        and(
          eq(dataConnectors.id, connectorId),
          eq(dataConnectors.orgId, auth.orgId),
          eq(dataConnectors.connectorType, "hubspot"),
          isNull(dataConnectors.deletedAt)
        )
      )
      .limit(1);

    if (!connector) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    let accessToken = connector.oauthAccessToken ? decrypt(connector.oauthAccessToken) : null;
    if (!accessToken) {
      return NextResponse.json({ error: "No access token available" }, { status: 400 });
    }

    if (isTokenExpiringSoon(connector.oauthExpiresAt)) {
      const refreshToken = connector.oauthRefreshToken ? decrypt(connector.oauthRefreshToken) : null;
      if (!refreshToken) {
        return NextResponse.json({ error: "Token expired. Please reconnect." }, { status: 401 });
      }
      try {
        const refreshed = await refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;
        await db
          .update(dataConnectors)
          .set({
            oauthAccessToken: encrypt(refreshed.accessToken),
            oauthRefreshToken: encrypt(refreshed.refreshToken),
            oauthExpiresAt: refreshed.expiresAt,
            status: "active",
            lastErrorMessage: null,
          })
          .where(eq(dataConnectors.id, connectorId));
      } catch (refreshError: any) {
        if (refreshError.message === "REVOKED") {
          await db
            .update(dataConnectors)
            .set({ status: "disconnected", lastErrorMessage: "Access revoked" })
            .where(eq(dataConnectors.id, connectorId));
          return NextResponse.json({ error: "HubSpot access revoked. Please reconnect." }, { status: 401 });
        }
        throw refreshError;
      }
    }

    let imported = 0;
    let skipped = 0;
    let invalid = 0;
    const errors: string[] = [];

    if (parsed.importAll) {
      let after: string | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const result = await listContacts(accessToken!, { after, limit: 100 });

        for (const contact of result.contacts) {
          const importResult = await importContact(contact, auth.orgId, parsed.campaignId ?? null, parsed.defaultCountry, errors);
          if (importResult === "imported") imported++;
          else if (importResult === "invalid") invalid++;
          else skipped++;
        }

        hasMore = result.hasMore;
        after = result.after || undefined;
      }
    } else if (parsed.contactIds && parsed.contactIds.length > 0) {
      const result = await listContacts(accessToken, { limit: 100 });
      const contactMap = new Map(result.contacts.map((c) => [c.id, c]));

      for (const contactId of parsed.contactIds) {
        const contact = contactMap.get(contactId);
        if (!contact) {
          skipped++;
          continue;
        }
        const importResult = await importContact(contact, auth.orgId, parsed.campaignId ?? null, parsed.defaultCountry, errors);
        if (importResult === "imported") imported++;
        else if (importResult === "invalid") invalid++;
        else skipped++;
      }
    } else {
      return NextResponse.json({ error: "Provide contactIds or set importAll: true" }, { status: 400 });
    }

    await db
      .update(dataConnectors)
      .set({ totalLookups: sql`${dataConnectors.totalLookups} + ${imported}` })
      .where(eq(dataConnectors.id, connectorId));

    return NextResponse.json({
      imported,
      skipped,
      invalid,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleRouteError(error, "HubSpot Import");
  }
}

async function importContact(
  contact: { firstName: string; lastName: string; email: string; phone: string; company: string },
  orgId: number,
  campaignId: number | null,
  defaultCountry: string,
  errors: string[]
): Promise<"imported" | "skipped" | "invalid"> {
  if (!contact.phone) {
    return "skipped";
  }

  const normalized = normalizePhoneE164(contact.phone, defaultCountry);
  if (!normalized.valid) {
    if (errors.length < 10) {
      errors.push(`Invalid phone for ${contact.firstName} ${contact.lastName}: ${contact.phone}`);
    }
    return "invalid";
  }

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || null;

  try {
    await db
      .insert(campaignContacts)
      .values({
        campaignId,
        orgId,
        phoneNumber: contact.phone,
        phoneNumberE164: normalized.e164,
        contactName: fullName,
        contactEmail: contact.email || null,
        contactMetadata: contact.company ? { company: contact.company } : null,
      })
      .onConflictDoNothing();
    return "imported";
  } catch {
    return "skipped";
  }
}
