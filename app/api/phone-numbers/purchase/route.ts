import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, requireEmailVerified } from "@/lib/get-user";
import { billingLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { wallets, phoneNumbers } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import { rejectMobilePayments } from "@/lib/mobile-guards";
import { logAudit } from "@/lib/audit";

const logger = createLogger("PhoneNumberPurchase");

const purchaseSchema = z.object({
  phoneNumber: z.string().min(5),
}).strict();

const VOICE_WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice`
  : "https://gorigo.ai/api/telnyx/voice";

async function configureTelnyxWebhook(telnyxKey: string, phoneNumber: string) {
  try {
    const searchRes = await fetch(
      `https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=${encodeURIComponent(phoneNumber)}`,
      { headers: { Authorization: `Bearer ${telnyxKey}` } }
    );
    if (!searchRes.ok) return;
    const searchData = await searchRes.json();
    const numberId = searchData.data?.[0]?.id;
    if (!numberId) return;

    await fetch(`https://api.telnyx.com/v2/phone_numbers/${numberId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${telnyxKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voice: {
          webhook_url: VOICE_WEBHOOK_URL,
          webhook_url_method: "POST",
        },
      }),
    });
    logger.info("Telnyx webhook configured", { phoneNumber, webhookUrl: VOICE_WEBHOOK_URL });
  } catch (err) {
    logger.error("Failed to configure Telnyx webhook", err instanceof Error ? err : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const mobileBlock = rejectMobilePayments(request);
    if (mobileBlock) return mobileBlock;

    const rl = await billingLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailCheck = requireEmailVerified(auth);
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: emailCheck.status || 403 });
    }

    const body = await request.json();
    const { phoneNumber } = purchaseSchema.parse(body);

    const telnyxKey = process.env.TELNYX_API_KEY;
    if (!telnyxKey) {
      return NextResponse.json({ error: "Telephony provider not configured" }, { status: 503 });
    }

    const isSuperAdmin = auth.user.globalRole === "superadmin" || auth.user.globalRole === "SUPER_ADMIN";
    const setupCost = 2.00;

    if (!isSuperAdmin) {
      const [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.orgId, auth.orgId))
        .limit(1);

      if (!wallet || Number(wallet.balance) < setupCost) {
        return NextResponse.json({
          error: `Insufficient balance. Phone number setup costs £${setupCost.toFixed(2)}. Please top up your wallet.`,
        }, { status: 402 });
      }
    }

    try {
      const orderRes = await fetch("https://api.telnyx.com/v2/number_orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${telnyxKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_numbers: [{ phone_number: phoneNumber }],
        }),
      });

      if (!orderRes.ok) {
        const errBody = await orderRes.text();
        logger.error("Telnyx order failed", { errBody, phoneNumber });
        return NextResponse.json({ error: "Failed to purchase phone number. It may no longer be available." }, { status: 502 });
      }

      const orderData = await orderRes.json();
      const orderStatus = orderData.data?.status;
      if (orderStatus === "failed" || orderStatus === "expired") {
        logger.error("Telnyx order rejected", { orderStatus, phoneNumber });
        return NextResponse.json({ error: "Phone number order was rejected. Please try a different number." }, { status: 502 });
      }

      const countryCode = phoneNumber.startsWith("+44") ? "GB"
        : phoneNumber.startsWith("+1") ? "US"
        : phoneNumber.startsWith("+61") ? "AU"
        : phoneNumber.substring(0, 3);

      await db.transaction(async (tx) => {
        if (!isSuperAdmin) {
          const walletResult = await tx.execute(
            sql`SELECT * FROM wallets WHERE org_id = ${auth.orgId} FOR UPDATE`
          );
          const walletRow = (walletResult.rows as Record<string, unknown>[])[0];
          if (!walletRow) throw new Error("Wallet not found");

          const updateResult = await tx.execute(
            sql`UPDATE wallets SET balance = ROUND((balance - ${setupCost})::numeric, 2), updated_at = NOW() WHERE org_id = ${auth.orgId} RETURNING balance`
          );
          const newBalance = (updateResult.rows as Record<string, unknown>[])[0]?.balance;

          await tx.execute(
            sql`INSERT INTO wallet_transactions (org_id, type, amount, balance_after, description) VALUES (${auth.orgId}, 'deduction', ${(-setupCost).toString()}, ${String(newBalance)}, ${"Phone number setup: " + phoneNumber})`
          );
        }

        await tx.insert(phoneNumbers).values({
          phoneNumber,
          friendlyName: phoneNumber,
          orgId: auth.orgId,
          providerSid: orderData.data?.id ?? null,
          capabilities: { voice: true, sms: false },
          isActive: true,
          countryCode,
          numberType: "local",
          healthScore: 100,
          totalCallsMade: 0,
          spamFlagged: false,
          monthlyRentalCost: "1.00",
          provisioningStatus: "active",
        }).onConflictDoNothing();
      });

      configureTelnyxWebhook(telnyxKey, phoneNumber).catch(() => {});

      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "phone_number.purchased",
        entityType: "phone_number",
        entityId: auth.orgId,
        details: { phoneNumber, isSuperAdmin, setupCost: isSuperAdmin ? 0 : setupCost },
      });

      return NextResponse.json({
        success: true,
        phoneNumber,
        orderId: orderData.data?.id,
        message: isSuperAdmin
          ? `Phone number ${phoneNumber} purchased and registered successfully.`
          : `Phone number ${phoneNumber} purchased successfully. £${setupCost.toFixed(2)} deducted from your wallet.`,
      });
    } catch (err: any) {
      logger.error("Phone number purchase error", err);
      return NextResponse.json({ error: "Failed to complete phone number purchase" }, { status: 502 });
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/phone-numbers/purchase");
  }
}
