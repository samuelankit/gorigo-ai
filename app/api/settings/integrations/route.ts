import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { getOrgByokStatus, saveOrgKeys, validateOpenAIKey, validateTwilioCredentials, type ByokMode } from "@/lib/byok";
import { logAudit } from "@/lib/audit";
import { settingsLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("validate_openai"),
    apiKey: z.string().min(1),
    baseUrl: z.string().optional(),
  }).strict(),
  z.object({
    action: z.literal("validate_twilio"),
    accountSid: z.string().min(1),
    authToken: z.string().min(1),
  }).strict(),
  z.object({
    action: z.literal("save"),
    mode: z.enum(["platform", "byok"]).optional(),
    openaiKey: z.string().optional(),
    openaiBaseUrl: z.string().optional(),
    twilioSid: z.string().optional(),
    twilioToken: z.string().optional(),
    twilioPhone: z.string().optional(),
  }).strict(),
  z.object({
    action: z.literal("clear"),
    provider: z.enum(["openai", "twilio", "all"]),
  }).strict(),
]);

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

    const status = await getOrgByokStatus(auth.orgId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("BYOK GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const body = await request.json();
    const parsed = bodySchema.parse(body);

    if (parsed.action === "validate_openai") {
      const result = await validateOpenAIKey(parsed.apiKey.trim(), parsed.baseUrl?.trim());
      return NextResponse.json(result);
    }

    if (parsed.action === "validate_twilio") {
      const result = await validateTwilioCredentials(parsed.accountSid.trim(), parsed.authToken.trim());
      return NextResponse.json(result);
    }

    if (parsed.action === "save") {
      const { mode, openaiKey, openaiBaseUrl, twilioSid, twilioToken, twilioPhone } = parsed;

      await saveOrgKeys(auth.orgId, {
        mode: mode as ByokMode | undefined,
        openaiKey: openaiKey?.trim(),
        openaiBaseUrl: openaiBaseUrl?.trim(),
        twilioSid: twilioSid?.trim(),
        twilioToken: twilioToken?.trim(),
        twilioPhone: twilioPhone?.trim(),
      });

      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "byok_keys_updated",
        entityType: "org",
        entityId: auth.orgId,
        details: {
          mode: mode || "unchanged",
          openaiKeySet: !!openaiKey,
          twilioSidSet: !!twilioSid,
          twilioPhoneSet: !!twilioPhone,
        },
      });

      const status = await getOrgByokStatus(auth.orgId);
      return NextResponse.json({ success: true, ...status });
    }

    if (parsed.action === "clear") {
      const { provider } = parsed;
      if (provider === "openai") {
        await saveOrgKeys(auth.orgId, { openaiKey: "", openaiBaseUrl: "" });
      } else if (provider === "twilio") {
        await saveOrgKeys(auth.orgId, { twilioSid: "", twilioToken: "", twilioPhone: "" });
      } else {
        await saveOrgKeys(auth.orgId, {
          mode: "platform",
          openaiKey: "",
          openaiBaseUrl: "",
          twilioSid: "",
          twilioToken: "",
          twilioPhone: "",
        });
      }

      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "byok_keys_cleared",
        entityType: "org",
        entityId: auth.orgId,
        details: { provider },
      });

      const status = await getOrgByokStatus(auth.orgId);
      return NextResponse.json({ success: true, ...status });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("BYOK POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
