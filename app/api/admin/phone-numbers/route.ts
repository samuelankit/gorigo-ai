import { db } from "@/lib/db";
import { twilioPhoneNumbers, orgs } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const results = await db
      .select({
        id: twilioPhoneNumbers.id,
        phoneNumber: twilioPhoneNumbers.phoneNumber,
        friendlyName: twilioPhoneNumbers.friendlyName,
        orgId: twilioPhoneNumbers.orgId,
        twilioSid: twilioPhoneNumbers.twilioSid,
        capabilities: twilioPhoneNumbers.capabilities,
        isActive: twilioPhoneNumbers.isActive,
        assignedAt: twilioPhoneNumbers.assignedAt,
        createdAt: twilioPhoneNumbers.createdAt,
        orgName: orgs.name,
      })
      .from(twilioPhoneNumbers)
      .leftJoin(orgs, eq(twilioPhoneNumbers.orgId, orgs.id))
      .orderBy(desc(twilioPhoneNumbers.createdAt));

    return NextResponse.json({ phoneNumbers: results });
  } catch (error) {
    return handleRouteError(error, "AdminPhoneNumbers");
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

    if (!body.phoneNumber) {
      return NextResponse.json({ error: "phoneNumber is required" }, { status: 400 });
    }

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(body.phoneNumber)) {
      return NextResponse.json({ error: "Invalid phone number format. Must be E.164 format (e.g. +14155551234)" }, { status: 400 });
    }

    const [phoneNumber] = await db
      .insert(twilioPhoneNumbers)
      .values({
        phoneNumber: body.phoneNumber,
        friendlyName: body.friendlyName ?? null,
        twilioSid: body.twilioSid ?? null,
        countryCode: body.countryCode ?? null,
        subAccountId: body.subAccountId ?? null,
      })
      .returning();

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "phone_number.create",
      entityType: "phone_number",
      entityId: phoneNumber.id,
      details: { phoneNumber: phoneNumber.phoneNumber, friendlyName: phoneNumber.friendlyName },
    });

    return NextResponse.json({ phoneNumber }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("unique")) {
      return NextResponse.json({ error: "This phone number already exists" }, { status: 409 });
    }
    return handleRouteError(error, "AdminPhoneNumbers");
  }
}

export async function PUT(request: NextRequest) {
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

    const updateData: Record<string, unknown> = {};
    if (body.orgId !== undefined) {
      updateData.orgId = body.orgId;
      updateData.assignedAt = body.orgId ? new Date() : null;
    }

    const [updated] = await db
      .update(twilioPhoneNumbers)
      .set(updateData)
      .where(eq(twilioPhoneNumbers.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: body.orgId ? "phone_number.assign" : "phone_number.unassign",
      entityType: "phone_number",
      entityId: updated.id,
      details: { phoneNumber: updated.phoneNumber, orgId: body.orgId },
    });

    return NextResponse.json({ phoneNumber: updated });
  } catch (error) {
    return handleRouteError(error, "AdminPhoneNumbers");
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

    const [deactivated] = await db
      .update(twilioPhoneNumbers)
      .set({ isActive: false })
      .where(eq(twilioPhoneNumbers.id, id))
      .returning();

    if (!deactivated) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "phone_number.deactivate",
      entityType: "phone_number",
      entityId: deactivated.id,
      details: { phoneNumber: deactivated.phoneNumber },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "AdminPhoneNumbers");
  }
}
