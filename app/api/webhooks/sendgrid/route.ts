import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailEvents } from "@/shared/schema";
import crypto from "crypto";

interface SendGridEvent {
  email: string;
  event: string;
  reason?: string;
  sg_message_id?: string;
  sg_event_id?: string;
  type?: string;
  timestamp?: number;
}

const MAX_BODY_SIZE = 5 * 1024 * 1024;
const MAX_EVENTS_PER_BATCH = 1000;

function verifySignature(publicKey: string, payload: string, signature: string, timestamp: string): boolean {
  try {
    const timestampPayload = timestamp + payload;
    const decodedSignature = Buffer.from(signature, "base64");
    const verifier = crypto.createVerify("sha256");
    verifier.update(timestampPayload);
    return verifier.verify(publicKey, decodedSignature);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const body = await request.text();

    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
    if (verificationKey) {
      const signature = request.headers.get("x-twilio-email-event-webhook-signature") || "";
      const timestamp = request.headers.get("x-twilio-email-event-webhook-timestamp") || "";

      if (!signature || !timestamp) {
        console.warn("[SendGrid Webhook] Missing signature headers — rejecting");
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }

      const timestampAge = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
      if (timestampAge > 300) {
        return NextResponse.json({ error: "Timestamp too old" }, { status: 401 });
      }

      if (!verifySignature(verificationKey, body, signature, timestamp)) {
        console.warn("[SendGrid Webhook] Invalid signature — rejecting");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV !== "development") {
      console.error("[SendGrid Webhook] SENDGRID_WEBHOOK_VERIFICATION_KEY not set — rejecting in production");
      return NextResponse.json({ error: "Webhook verification not configured" }, { status: 503 });
    }

    let events: SendGridEvent[];
    try {
      events = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (events.length > MAX_EVENTS_PER_BATCH) {
      events = events.slice(0, MAX_EVENTS_PER_BATCH);
    }

    const deliverabilityTypes = new Set([
      "delivered", "bounce", "dropped", "spam_report", "deferred",
    ]);

    const rows = events
      .filter(e =>
        typeof e.email === "string" && e.email.length > 0 && e.email.length <= 320 &&
        typeof e.event === "string" && deliverabilityTypes.has(e.event) &&
        typeof e.sg_event_id === "string"
      )
      .map(e => ({
        email: e.email.toLowerCase().substring(0, 320),
        eventType: e.event,
        reason: typeof e.reason === "string" ? e.reason.substring(0, 1000) : null,
        sgMessageId: typeof e.sg_message_id === "string" ? e.sg_message_id.substring(0, 200) : null,
        sgEventId: e.sg_event_id!.substring(0, 200),
        bounceType: e.event === "bounce" ? (typeof e.type === "string" ? e.type.substring(0, 50) : "unknown") : null,
      }));

    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        await db.insert(emailEvents).values(batch).onConflictDoNothing();
      }
    }

    const bounces = rows.filter(r => r.eventType === "bounce" || r.eventType === "spam_report");
    if (bounces.length > 0) {
      console.warn(`[SendGrid] ${bounces.length} bounce/spam events:`, bounces.map(b => `${b.email} (${b.eventType})`).join(", "));
    }

    return NextResponse.json({ processed: rows.length });
  } catch (err: any) {
    console.error("[SendGrid Webhook] Error processing events:", err.message);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
