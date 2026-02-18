import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { webhooks, insertWebhookSchema } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import crypto from "crypto";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { webhookLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

const ALLOWED_WEBHOOK_EVENTS = new Set([
  "call.completed", "call.started", "call.handoff", "call.voicemail",
  "lead.captured", "campaign.completed", "sentiment.alert",
]);

const PRIVATE_IP_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/0\./,
  /^https?:\/\/\[::1\]/,
  /^https?:\/\/\[fe80:/i,
  /^https?:\/\/\[fc/i,
  /^https?:\/\/\[fd/i,
  /^https?:\/\/169\.254\./,
  /^https?:\/\/\.internal/i,
  /^https?:\/\/metadata\./i,
];

function isPrivateUrl(url: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(url));
}

const httpsUrlSchema = z.string().url().refine(
  (url) => url.startsWith("https://"),
  { message: "Webhook URL must use HTTPS" }
);

const webhookEventsSchema = z.array(z.string()).refine(
  (events) => events.every(e => ALLOWED_WEBHOOK_EVENTS.has(e)),
  { message: "Invalid webhook event type" }
);

const patchWebhookSchema = z.object({
  id: z.number(),
  url: httpsUrlSchema.optional(),
  events: webhookEventsSchema.optional(),
  isActive: z.boolean().optional(),
}).refine(
  (d) => d.url !== undefined || d.events !== undefined || d.isActive !== undefined,
  { message: "At least one field to update is required" }
);

export async function GET(request: NextRequest) {
  try {
    const rl = await webhookLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.orgId, auth.orgId))
      .orderBy(webhooks.createdAt);

    const sanitized = result.map(({ secret, ...rest }) => ({
      ...rest,
      hasSecret: !!secret,
    }));

    return NextResponse.json(sanitized);
  } catch (error) {
    return handleRouteError(error, "Webhooks");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await webhookLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.url && !body.url.startsWith("https://")) {
      return NextResponse.json({ error: "Webhook URL must use HTTPS" }, { status: 400 });
    }
    if (body.url && isPrivateUrl(body.url)) {
      return NextResponse.json({ error: "Webhook URL cannot point to private or internal networks" }, { status: 400 });
    }
    if (body.events && Array.isArray(body.events)) {
      const invalid = body.events.filter((e: string) => !ALLOWED_WEBHOOK_EVENTS.has(e));
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Invalid webhook events: ${invalid.join(", ")}` }, { status: 400 });
      }
    }

    const secret = crypto.randomBytes(32).toString("hex");
    const data = insertWebhookSchema.parse({
      ...body,
      orgId: auth.orgId,
      secret,
    });

    const [webhook] = await db.insert(webhooks).values(data).returning();

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "webhook_create",
        entityType: "webhook",
        entityId: webhook.id,
        details: { url: webhook.url, events: webhook.events },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    const { secret: returnedSecret, ...webhookWithoutSecret } = webhook;
    return NextResponse.json({
      ...webhookWithoutSecret,
      secret: returnedSecret,
      _secretNote: "Store this secret securely. It will not be shown again.",
    }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    return handleRouteError(error, "Webhooks");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = await webhookLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = patchWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.errors }, { status: 400 });
    }

    const { id, url, events, isActive } = parsed.data;

    if (url !== undefined && isPrivateUrl(url)) {
      return NextResponse.json({ error: "Webhook URL cannot point to private or internal networks" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (url !== undefined) updates.url = url;
    if (events !== undefined) updates.events = events;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db
      .update(webhooks)
      .set(updates)
      .where(and(eq(webhooks.id, id), eq(webhooks.orgId, auth.orgId)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "webhook_update",
        entityType: "webhook",
        entityId: updated.id,
        details: { url: updated.url, events: updated.events },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    const { secret: _, ...updatedWithoutSecret } = updated;
    return NextResponse.json({ ...updatedWithoutSecret, hasSecret: !!updated.secret });
  } catch (error) {
    return handleRouteError(error, "Webhooks");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = await webhookLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    if (!id) return NextResponse.json({ error: "Webhook ID required" }, { status: 400 });

    await db.delete(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.orgId, auth.orgId)));

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "webhook_delete",
        entityType: "webhook",
        entityId: id,
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "Webhooks");
  }
}
