import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { twilioSubAccounts, orgs, insertTwilioSubAccountSchema } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { adminLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import twilio from "twilio";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const results = await db
      .select({
        id: twilioSubAccounts.id,
        orgId: twilioSubAccounts.orgId,
        twilioAccountSid: twilioSubAccounts.twilioAccountSid,
        friendlyName: twilioSubAccounts.friendlyName,
        status: twilioSubAccounts.status,
        concurrentCallLimit: twilioSubAccounts.concurrentCallLimit,
        dailySpendLimit: twilioSubAccounts.dailySpendLimit,
        currentDailySpend: twilioSubAccounts.currentDailySpend,
        lastSpendResetAt: twilioSubAccounts.lastSpendResetAt,
        suspendedReason: twilioSubAccounts.suspendedReason,
        createdAt: twilioSubAccounts.createdAt,
        updatedAt: twilioSubAccounts.updatedAt,
        orgName: orgs.name,
      })
      .from(twilioSubAccounts)
      .leftJoin(orgs, eq(twilioSubAccounts.orgId, orgs.id))
      .orderBy(desc(twilioSubAccounts.createdAt));

    return NextResponse.json({ subAccounts: results });
  } catch (error) {
    console.error("Admin list Twilio sub-accounts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json();

    if (!body.orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    let twilioAccountSid = body.twilioAccountSid ?? null;
    let twilioAuthToken = body.twilioAuthToken ?? null;
    let status = "pending";

    if (!twilioAccountSid) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (accountSid && authToken) {
        try {
          const client = twilio(accountSid, authToken);
          const subAccount = await client.api.accounts.create({
            friendlyName: body.friendlyName || `GoRigo-Org-${body.orgId}`,
          });
          twilioAccountSid = subAccount.sid;
          twilioAuthToken = subAccount.authToken;
          status = "active";
        } catch (err) {
          console.error("Failed to create Twilio sub-account:", err);
          return NextResponse.json(
            { error: "Failed to create Twilio sub-account. Check platform credentials." },
            { status: 502 }
          );
        }
      }
    } else {
      status = "active";
    }

    const [subAccount] = await db
      .insert(twilioSubAccounts)
      .values({
        orgId: body.orgId,
        friendlyName: body.friendlyName ?? null,
        twilioAccountSid,
        twilioAuthToken,
        status,
      })
      .returning();

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "twilio_sub_account.create",
      entityType: "twilio_sub_account",
      entityId: subAccount.id,
      details: { orgId: body.orgId, friendlyName: subAccount.friendlyName, status },
    });

    return NextResponse.json({ subAccount }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("unique")) {
      return NextResponse.json({ error: "A sub-account already exists for this org" }, { status: 409 });
    }
    console.error("Admin create Twilio sub-account error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status !== undefined) updateData.status = body.status;
    if (body.friendlyName !== undefined) updateData.friendlyName = body.friendlyName;
    if (body.concurrentCallLimit !== undefined) updateData.concurrentCallLimit = body.concurrentCallLimit;
    if (body.dailySpendLimit !== undefined) updateData.dailySpendLimit = body.dailySpendLimit;
    if (body.suspendedReason !== undefined) updateData.suspendedReason = body.suspendedReason;

    const [updated] = await db
      .update(twilioSubAccounts)
      .set(updateData)
      .where(eq(twilioSubAccounts.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Sub-account not found" }, { status: 404 });
    }

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "twilio_sub_account.update",
      entityType: "twilio_sub_account",
      entityId: updated.id,
      details: { changes: Object.keys(updateData).filter(k => k !== "updatedAt") },
    });

    return NextResponse.json({ subAccount: updated });
  } catch (error) {
    console.error("Admin update Twilio sub-account error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") ?? "", 10);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Valid id query parameter is required" }, { status: 400 });
    }

    const [suspended] = await db
      .update(twilioSubAccounts)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(twilioSubAccounts.id, id))
      .returning();

    if (!suspended) {
      return NextResponse.json({ error: "Sub-account not found" }, { status: 404 });
    }

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "twilio_sub_account.suspend",
      entityType: "twilio_sub_account",
      entityId: suspended.id,
      details: { orgId: suspended.orgId, friendlyName: suspended.friendlyName },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin suspend Twilio sub-account error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
