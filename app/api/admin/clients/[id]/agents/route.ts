import { db } from "@/lib/db";
import { agents } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { id } = await params;
    const orgId = parseInt(id, 10);
    if (isNaN(orgId) || orgId < 1) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    const agentsList = await db
      .select({
        id: agents.id,
        name: agents.name,
        agentType: agents.agentType,
        language: agents.language,
        inboundEnabled: agents.inboundEnabled,
        outboundEnabled: agents.outboundEnabled,
      })
      .from(agents)
      .where(eq(agents.orgId, orgId));

    return NextResponse.json({ agents: agentsList });
  } catch (error) {
    console.error("Admin client agents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
