import { db } from "@/lib/db";
import { cannedResponses } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const { id } = await params;
    const responseId = parseInt(id, 10);
    const body = await request.json();
    const [updated] = await db.update(cannedResponses).set(body).where(eq(cannedResponses.id, responseId)).returning();
    if (!updated) return NextResponse.json({ error: "Canned response not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating canned response:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const { id } = await params;
    const responseId = parseInt(id, 10);
    const [deleted] = await db.delete(cannedResponses).where(eq(cannedResponses.id, responseId)).returning();
    if (!deleted) return NextResponse.json({ error: "Canned response not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting canned response:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
