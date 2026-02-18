import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finAccounts, finWorkspaces, finAuditLog } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getClientIp } from "@/lib/finance-validation";
import { settingsLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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

    const accounts = await db.select().from(finAccounts)
      .where(eq(finAccounts.workspaceId, Number(workspaceId)));
    return NextResponse.json(accounts);
  } catch (error) {
    return handleRouteError(error, "FinanceAccounts");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, code, name, type, subtype, description, isSystem } = body;

    if (!workspaceId || !code || !name || !type) {
      return NextResponse.json({ error: "workspaceId, code, name, and type are required" }, { status: 400 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const [account] = await db.insert(finAccounts).values({
      workspaceId,
      code,
      name,
      type,
      subtype: subtype || null,
      description: description || null,
      isSystem: isSystem || false,
    }).returning();

    const ipAddress = getClientIp(request);
    await db.insert(finAuditLog).values({
      workspaceId,
      userId: auth.user.id,
      action: "create",
      entityType: "account",
      entityId: account.id,
      changes: { code, name, type },
      ipAddress,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "FinanceAccounts");
  }
}
