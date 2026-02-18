import { db } from "@/lib/db";
import { omnichannelConversations } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const { id } = await params;
    const [updated] = await db
      .update(omnichannelConversations)
      .set({ status: "resolved" })
      .where(eq(omnichannelConversations.id, parseInt(id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "ConversationResolve");
  }
}
