import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { dataConnectors, campaignContacts } from "@/shared/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { getSpreadsheetAllRows, refreshAccessToken, isTokenExpiringSoon } from "@/lib/oauth-google";
import { normalizePhoneE164 } from "@/lib/phone-normalize";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

const importSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().min(1),
  columnMapping: z.object({
    phone: z.string().min(1),
    name: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional(),
  }),
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
          eq(dataConnectors.connectorType, "google_sheets"),
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
          return NextResponse.json({ error: "Google access revoked. Please reconnect." }, { status: 401 });
        }
        throw refreshError;
      }
    }

    const { headers, rows } = await getSpreadsheetAllRows(accessToken, parsed.spreadsheetId, parsed.sheetName);

    const phoneIdx = headers.indexOf(parsed.columnMapping.phone);
    const nameIdx = parsed.columnMapping.name ? headers.indexOf(parsed.columnMapping.name) : -1;
    const emailIdx = parsed.columnMapping.email ? headers.indexOf(parsed.columnMapping.email) : -1;
    const companyIdx = parsed.columnMapping.company ? headers.indexOf(parsed.columnMapping.company) : -1;

    if (phoneIdx === -1) {
      return NextResponse.json({ error: "Phone column not found in spreadsheet" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    let invalid = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const rawPhone = row[phoneIdx]?.trim();
      if (!rawPhone) {
        skipped++;
        continue;
      }

      const normalized = normalizePhoneE164(rawPhone, parsed.defaultCountry);
      if (!normalized.valid) {
        invalid++;
        if (errors.length < 10) {
          errors.push(`Invalid phone: ${rawPhone}`);
        }
        continue;
      }

      try {
        await db
          .insert(campaignContacts)
          .values({
            campaignId: parsed.campaignId ?? null,
            orgId: auth.orgId,
            phoneNumber: rawPhone,
            phoneNumberE164: normalized.e164,
            contactName: nameIdx >= 0 ? row[nameIdx]?.trim() || null : null,
            contactEmail: emailIdx >= 0 ? row[emailIdx]?.trim() || null : null,
            contactMetadata: companyIdx >= 0 && row[companyIdx] ? { company: row[companyIdx].trim() } : null,
          })
          .onConflictDoNothing();
        imported++;
      } catch {
        skipped++;
      }
    }

    await db
      .update(dataConnectors)
      .set({ totalLookups: sql`${dataConnectors.totalLookups} + ${imported}` })
      .where(eq(dataConnectors.id, connectorId));

    return NextResponse.json({
      imported,
      skipped,
      invalid,
      total: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleRouteError(error, "Google Sheets Import");
  }
}
