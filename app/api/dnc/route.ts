import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doNotCallList } from "@/shared/schema";
import { eq, and, desc, like } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { addToDNCList, removeFromDNCList, normalizePhoneNumber } from "@/lib/dnc";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const conditions = [eq(doNotCallList.orgId, auth.orgId)];
    if (search) {
      const normalized = normalizePhoneNumber(search);
      const escaped = normalized.replace(/[%_\\]/g, "\\$&");
      conditions.push(like(doNotCallList.phoneNumber, `%${escaped}%`));
    }

    const result = await db
      .select()
      .from(doNotCallList)
      .where(and(...conditions))
      .orderBy(desc(doNotCallList.createdAt))
      .limit(200);

    return NextResponse.json(result);
  } catch (error) {
    console.error("DNC list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { phoneNumber, reason, source, notes } = body;

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    await addToDNCList(
      auth.orgId,
      phoneNumber,
      reason || "manual",
      source || "api",
      auth.user.id,
      notes
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("already")) {
      return NextResponse.json({ error: "Phone number already on DNC list" }, { status: 409 });
    }
    console.error("DNC add error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phoneNumber = searchParams.get("phoneNumber");
    if (!phoneNumber) return NextResponse.json({ error: "Phone number required" }, { status: 400 });

    await removeFromDNCList(auth.orgId, phoneNumber);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DNC delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
