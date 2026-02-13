import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { getOrgByokStatus, saveOrgKeys, validateOpenAIKey, validateTwilioCredentials, type ByokMode } from "@/lib/byok";
import { logAudit } from "@/lib/audit";
import { settingsLimiter } from "@/lib/rate-limit";

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
    const { action } = body;

    if (action === "validate_openai") {
      const { apiKey, baseUrl } = body;
      if (!apiKey || typeof apiKey !== "string") {
        return NextResponse.json({ error: "API key is required" }, { status: 400 });
      }
      const result = await validateOpenAIKey(apiKey.trim(), baseUrl?.trim());
      return NextResponse.json(result);
    }

    if (action === "validate_twilio") {
      const { accountSid, authToken } = body;
      if (!accountSid || !authToken) {
        return NextResponse.json({ error: "Account SID and Auth Token are required" }, { status: 400 });
      }
      const result = await validateTwilioCredentials(accountSid.trim(), authToken.trim());
      return NextResponse.json(result);
    }

    if (action === "save") {
      const { mode, openaiKey, openaiBaseUrl, twilioSid, twilioToken, twilioPhone } = body;

      if (mode && !["platform", "byok"].includes(mode)) {
        return NextResponse.json({ error: "Mode must be 'platform' or 'byok'" }, { status: 400 });
      }

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

    if (action === "clear") {
      const { provider } = body;
      if (provider === "openai") {
        await saveOrgKeys(auth.orgId, { openaiKey: "", openaiBaseUrl: "" });
      } else if (provider === "twilio") {
        await saveOrgKeys(auth.orgId, { twilioSid: "", twilioToken: "", twilioPhone: "" });
      } else if (provider === "all") {
        await saveOrgKeys(auth.orgId, {
          mode: "platform",
          openaiKey: "",
          openaiBaseUrl: "",
          twilioSid: "",
          twilioToken: "",
          twilioPhone: "",
        });
      } else {
        return NextResponse.json({ error: "Provider must be 'openai', 'twilio', or 'all'" }, { status: 400 });
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

    return NextResponse.json({ error: "Invalid action. Use: validate_openai, validate_twilio, save, clear" }, { status: 400 });
  } catch (error) {
    console.error("BYOK POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
