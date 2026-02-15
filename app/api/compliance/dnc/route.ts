import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doNotCallList } from "@/shared/schema";
import { eq, and, desc, like, or, isNull, gt } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAudit } from "@/lib/audit";
import { addToDNCList, removeFromDNCList, normalizePhoneNumber } from "@/lib/dnc";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const dncAddSchema = z.object({
  phoneNumber: z.string().min(1).max(20).regex(/^\+?[0-9\s\-()]*$/),
  reason: z.string().max(500).optional(),
  source: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
}).strict();

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const search = searchParams.get("search");

    const conditions = [eq(doNotCallList.orgId, auth.orgId)];

    if (search) {
      const normalized = normalizePhoneNumber(search);
      const escaped = normalized.replace(/[%_\\]/g, "\\$&");
      conditions.push(like(doNotCallList.phoneNumber, `%${escaped}%`));
    }

    const entries = await db
      .select()
      .from(doNotCallList)
      .where(and(...conditions))
      .orderBy(desc(doNotCallList.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ entries });
  } catch (error) {
    return handleRouteError(error, "DNCGet");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.settings);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.isDemo) {
      return NextResponse.json({ error: "Demo accounts cannot modify the DNC list" }, { status: 403 });
    }

    const body = await request.json();
    const { phoneNumber, reason, source, notes } = dncAddSchema.parse(body);

    await addToDNCList(
      auth.orgId,
      phoneNumber,
      reason || "manual",
      source || "manual_add",
      auth.user.id,
      notes
    );

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "dnc_add",
      entityType: "do_not_call_list",
      details: { phoneNumber: normalizePhoneNumber(phoneNumber), reason, source },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "DNCAdd");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.isDemo) {
      return NextResponse.json({ error: "Demo accounts cannot modify the DNC list" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    await removeFromDNCList(auth.orgId, phoneNumber);

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "dnc_remove",
      entityType: "do_not_call_list",
      details: { phoneNumber: normalizePhoneNumber(phoneNumber) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DNCDelete");
  }
}
