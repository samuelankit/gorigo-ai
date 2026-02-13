import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finAuditLog, finWorkspaces } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, Number(workspaceId)), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const logs = await db.select().from(finAuditLog)
      .where(eq(finAuditLog.workspaceId, Number(workspaceId)))
      .orderBy(desc(finAuditLog.createdAt));

    return NextResponse.json(logs);
  } catch (error) {
    console.error("List audit log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
