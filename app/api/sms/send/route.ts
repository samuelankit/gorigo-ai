import { NextRequest, NextResponse } from "next/server";
import { sendSMS, isTelnyxConfigured, getTelnyxPhoneNumber } from "@/lib/telnyx";
import { getAuthenticatedUser } from "@/lib/get-user";
import { createLogger } from "@/lib/logger";

const logger = createLogger("SMSSend");

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isTelnyxConfigured()) {
      return NextResponse.json({ error: "SMS service is not configured" }, { status: 503 });
    }

    const body = await request.json();
    const { to, message, from } = body;

    if (!to || !message) {
      return NextResponse.json({ error: "Missing required fields: to, message" }, { status: 400 });
    }

    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRegex.test(to.replace(/[\s\-()]/g, ""))) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
    }

    if (message.length > 1600) {
      return NextResponse.json({ error: "Message too long (max 1600 characters)" }, { status: 400 });
    }

    const fromNumber = from || getTelnyxPhoneNumber();

    const result = await sendSMS(to, message, fromNumber);

    logger.info("SMS sent", { to, messageId: result.messageId, orgId: user.orgId });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      status: result.status,
      to: result.to,
      from: result.from,
    });
  } catch (error) {
    logger.error("Failed to send SMS", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
  }
}
