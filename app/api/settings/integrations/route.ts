import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { getOrgByokStatus, saveOrgKeys, validateOpenAIKey, type ByokMode } from "@/lib/byok";
import { logAudit } from "@/lib/audit";
import { settingsLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("validate_openai"),
    apiKey: z.string().min(1),
    baseUrl: z.string().optional(),
  }).strict(),
  z.object({
    action: z.literal("save"),
    mode: z.enum(["platform", "byok"]).optional(),
    openaiKey: z.string().optional(),
    openaiBaseUrl: z.string().optional(),
  }).strict(),
  z.object({
    action: z.literal("clear"),
    provider: z.enum(["openai", "all"]),
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
    return handleRouteError(error, "Integrations");
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

    if (parsed.action === "save") {
      const { mode, openaiKey, openaiBaseUrl } = parsed;

      await saveOrgKeys(auth.orgId, {
        mode: mode as ByokMode | undefined,
        openaiKey: openaiKey?.trim(),
        openaiBaseUrl: openaiBaseUrl?.trim(),
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
        },
      });

      const status = await getOrgByokStatus(auth.orgId);
      return NextResponse.json({ success: true, ...status });
    }

    if (parsed.action === "clear") {
      const { provider } = parsed;
      if (provider === "openai") {
        await saveOrgKeys(auth.orgId, { openaiKey: "", openaiBaseUrl: "" });
      } else {
        await saveOrgKeys(auth.orgId, {
          mode: "platform",
          openaiKey: "",
          openaiBaseUrl: "",
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
    return handleRouteError(error, "Integrations");
  }
}
