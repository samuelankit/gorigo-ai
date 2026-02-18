import { db } from "@/lib/db";
import { assistSuggestions } from "@/shared/schema";
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
    const suggestionId = parseInt(id, 10);
    const body = await request.json();
    if (body.status && !["used", "dismissed", "modified"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.modifiedContent) updateData.modifiedContent = body.modifiedContent;
    const [updated] = await db.update(assistSuggestions).set(updateData).where(eq(assistSuggestions.id, suggestionId)).returning();
    if (!updated) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating suggestion:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
