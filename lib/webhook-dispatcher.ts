import { db } from "@/lib/db";
import { webhooks, orgMembers } from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { createNotification } from "@/lib/notifications";

export type WebhookEvent =
  | "call.completed"
  | "call.started"
  | "call.handoff"
  | "call.voicemail"
  | "lead.captured"
  | "campaign.completed"
  | "sentiment.alert";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_FAILURES_BEFORE_DISABLE = 10;
const DELIVERY_TIMEOUT_MS = 10000;

function calculateBackoff(attempt: number): number {
  const delay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * delay * 0.3;
  return Math.min(delay + jitter, 30000);
}

async function deliverWebhook(
  url: string,
  body: string,
  headers: Record<string, string>,
  attempt: number = 0
): Promise<{ success: boolean; statusCode?: number }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });

    if (response.ok) {
      return { success: true, statusCode: response.status };
    }

    if (response.status >= 500 && attempt < MAX_RETRIES) {
      const backoff = calculateBackoff(attempt);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return deliverWebhook(url, body, headers, attempt + 1);
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = parseInt(response.headers.get("retry-after") || "0", 10);
      const backoff = retryAfter > 0 ? retryAfter * 1000 : calculateBackoff(attempt);
      await new Promise(resolve => setTimeout(resolve, Math.min(backoff, 30000)));
      return deliverWebhook(url, body, headers, attempt + 1);
    }

    return { success: false, statusCode: response.status };
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const backoff = calculateBackoff(attempt);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return deliverWebhook(url, body, headers, attempt + 1);
    }
    return { success: false };
  }
}

export async function dispatchWebhook(orgId: number, event: WebhookEvent, payload: Record<string, any>) {
  try {
    const activeWebhooks = await db
      .select()
      .from(webhooks)
      .where(and(
        eq(webhooks.orgId, orgId),
        eq(webhooks.isActive, true),
        sql`${webhooks.events} @> ARRAY[${event}]::text[]`
      ));

    for (const webhook of activeWebhooks) {
      try {
        const body = JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          orgId,
          data: payload,
        });

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-GoRigo-Event": event,
          "X-GoRigo-Delivery-Id": crypto.randomUUID(),
        };

        if (webhook.secret) {
          const signature = crypto
            .createHmac("sha256", webhook.secret)
            .update(body)
            .digest("hex");
          headers["X-GoRigo-Signature"] = signature;
        }

        const result = await deliverWebhook(webhook.url, body, headers);

        if (result.success) {
          await db.update(webhooks).set({
            lastTriggered: new Date(),
            failureCount: 0,
          }).where(eq(webhooks.id, webhook.id));
        } else {
          const newFailureCount = (webhook.failureCount || 0) + 1;
          const updates: Record<string, any> = { failureCount: newFailureCount };
          if (newFailureCount >= MAX_FAILURES_BEFORE_DISABLE) {
            updates.isActive = false;
            notifyWebhookDisabled(orgId, webhook.url).catch(() => {});
          }
          await db.update(webhooks).set(updates).where(eq(webhooks.id, webhook.id));
        }
      } catch (err) {
        console.error(`Webhook ${webhook.id} delivery failed:`, err);
        const newFailureCount = (webhook.failureCount || 0) + 1;
        const updates: Record<string, any> = { failureCount: newFailureCount };
        if (newFailureCount >= MAX_FAILURES_BEFORE_DISABLE) {
          updates.isActive = false;
          notifyWebhookDisabled(orgId, webhook.url).catch(() => {});
        }
        await db.update(webhooks).set(updates).where(eq(webhooks.id, webhook.id));
      }
    }
  } catch (error) {
    console.error("Webhook dispatch error:", error);
  }
}

async function notifyWebhookDisabled(orgId: number, webhookUrl: string) {
  try {
    const members = await db
      .select({ userId: orgMembers.userId })
      .from(orgMembers)
      .where(eq(orgMembers.orgId, orgId));

    for (const member of members) {
      await createNotification({
        userId: member.userId,
        orgId,
        type: "webhook_failure",
        title: "Webhook disabled",
        message: `Webhook to ${webhookUrl} has been disabled after ${MAX_FAILURES_BEFORE_DISABLE} consecutive failures.`,
        actionUrl: "/dashboard/webhooks",
      });
    }
  } catch (err) {
    console.error("[Notifications] Webhook disabled notification error:", err);
  }
}
