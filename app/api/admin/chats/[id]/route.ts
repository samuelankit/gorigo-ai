import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { chatLeads, chatMessages } from "@/shared/schema";
import { eq, asc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await adminLimiter(req);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id);
    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const [lead] = await db
      .select()
      .from(chatLeads)
      .where(eq(chatLeads.id, leadId));

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const msgs = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.leadId, leadId))
      .orderBy(asc(chatMessages.createdAt));

    return NextResponse.json({ lead, messages: msgs });
  } catch (error) {
    console.error("[AdminChatDetail] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
