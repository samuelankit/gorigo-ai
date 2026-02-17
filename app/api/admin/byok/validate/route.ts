import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs } from "@/shared/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

interface ByokValidationResult {
  orgId: number;
  orgName: string;
  byokMode: string;
  openai: { configured: boolean; valid: boolean | null; error: string | null };
  twilio: { configured: boolean; valid: boolean | null; error: string | null };
}

async function validateOpenAIKey(apiKey: string, baseUrl?: string | null): Promise<{ valid: boolean; error: string | null }> {
  try {
    const url = baseUrl ? `${baseUrl}/v1/models` : "https://api.openai.com/v1/models";
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) return { valid: true, error: null };
    if (response.status === 401) return { valid: false, error: "Invalid API key (401 Unauthorized)" };
    if (response.status === 429) return { valid: true, error: "Key valid but rate-limited" };
    return { valid: false, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (err) {
    return { valid: false, error: `Connection failed: ${String(err)}` };
  }
}

async function validateTwilioCredentials(sid: string, token: string): Promise<{ valid: boolean; error: string | null }> {
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      method: "GET",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) return { valid: true, error: null };
    if (response.status === 401) return { valid: false, error: "Invalid credentials (401 Unauthorized)" };
    return { valid: false, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (err) {
    return { valid: false, error: `Connection failed: ${String(err)}` };
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const validateLive = searchParams.get("validate") === "true";
    const orgIdFilter = searchParams.get("org_id");

    let conditions = eq(orgs.byokMode, "byok");
    if (orgIdFilter) {
      const orgId = parseInt(orgIdFilter, 10);
      if (!isNaN(orgId)) {
        conditions = and(conditions, eq(orgs.id, orgId)) as any;
      }
    }

    const byokOrgs = await db
      .select({
        id: orgs.id,
        name: orgs.name,
        byokMode: orgs.byokMode,
        byokOpenaiKey: orgs.byokOpenaiKey,
        byokOpenaiBaseUrl: orgs.byokOpenaiBaseUrl,
        byokTwilioSid: orgs.byokTwilioSid,
        byokTwilioToken: orgs.byokTwilioToken,
        byokTwilioPhone: orgs.byokTwilioPhone,
        status: orgs.status,
      })
      .from(orgs)
      .where(conditions);

    const results: ByokValidationResult[] = [];
    const invalidKeys: Array<{ orgId: number; orgName: string; service: string; error: string }> = [];

    for (const org of byokOrgs) {
      const result: ByokValidationResult = {
        orgId: org.id,
        orgName: org.name,
        byokMode: org.byokMode || "byok",
        openai: { configured: !!org.byokOpenaiKey, valid: null, error: null },
        twilio: { configured: !!org.byokTwilioSid && !!org.byokTwilioToken, valid: null, error: null },
      };

      if (validateLive) {
        if (org.byokOpenaiKey) {
          const openaiResult = await validateOpenAIKey(org.byokOpenaiKey, org.byokOpenaiBaseUrl);
          result.openai.valid = openaiResult.valid;
          result.openai.error = openaiResult.error;
          if (!openaiResult.valid) {
            invalidKeys.push({ orgId: org.id, orgName: org.name, service: "OpenAI", error: openaiResult.error || "Unknown error" });
          }
        }

        if (org.byokTwilioSid && org.byokTwilioToken) {
          const twilioResult = await validateTwilioCredentials(org.byokTwilioSid, org.byokTwilioToken);
          result.twilio.valid = twilioResult.valid;
          result.twilio.error = twilioResult.error;
          if (!twilioResult.valid) {
            invalidKeys.push({ orgId: org.id, orgName: org.name, service: "Twilio", error: twilioResult.error || "Unknown error" });
          }
        }
      }

      if (!org.byokOpenaiKey && !org.byokTwilioSid) {
        result.openai.error = "BYOK mode enabled but no OpenAI key configured";
        result.twilio.error = "BYOK mode enabled but no Twilio credentials configured";
        invalidKeys.push({ orgId: org.id, orgName: org.name, service: "OpenAI", error: "Not configured" });
        invalidKeys.push({ orgId: org.id, orgName: org.name, service: "Twilio", error: "Not configured" });
      }

      results.push(result);
    }

    const autoFallback = searchParams.get("auto_fallback") === "true";
    const fallbackResults: Array<{ orgId: number; orgName: string; action: string }> = [];

    if (validateLive && invalidKeys.length > 0) {
      if (autoFallback) {
        for (const invalid of invalidKeys) {
          await db
            .update(orgs)
            .set({
              byokMode: "platform",
            })
            .where(eq(orgs.id, invalid.orgId));

          fallbackResults.push({
            orgId: invalid.orgId,
            orgName: invalid.orgName,
            action: `Switched from BYOK to platform mode (invalid ${invalid.service} key)`,
          });

          await logAudit({
            actorId: auth!.user.id,
            actorEmail: auth!.user.email,
            action: "byok.auto_fallback",
            entityType: "org",
            entityId: invalid.orgId,
            details: { service: invalid.service, error: invalid.error, fallbackTo: "platform" },
          });
        }
      }

      await logAudit({
        actorId: auth!.user.id,
        actorEmail: auth!.user.email,
        action: "byok.validation_run",
        entityType: "system",
        entityId: 0,
        details: {
          totalOrgs: byokOrgs.length,
          invalidKeys,
          autoFallbackApplied: autoFallback,
          fallbackResults,
          superAdminNotified: true,
        },
      });
    }

    return NextResponse.json({
      totalByokOrgs: byokOrgs.length,
      validatedLive: validateLive,
      autoFallbackApplied: autoFallback && fallbackResults.length > 0,
      fallbackResults,
      results,
      invalidKeys,
      summary: {
        totalConfigured: results.length,
        openaiConfigured: results.filter(r => r.openai.configured).length,
        openaiValid: results.filter(r => r.openai.valid === true).length,
        openaiInvalid: results.filter(r => r.openai.valid === false).length,
        twilioConfigured: results.filter(r => r.twilio.configured).length,
        twilioValid: results.filter(r => r.twilio.valid === true).length,
        twilioInvalid: results.filter(r => r.twilio.valid === false).length,
      },
    });
  } catch (error) {
    console.error("BYOK validation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
