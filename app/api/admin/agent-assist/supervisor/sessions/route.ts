import { db } from "@/lib/db";
import { supervisorSessions } from "@/shared/schema";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const body = await request.json();
    if (!["listen", "whisper", "barge"].includes(body.mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    const [session] = await db.insert(supervisorSessions).values({
      supervisorUserId: body.supervisorUserId,
      callLogId: body.callLogId,
      orgId: body.orgId,
      mode: body.mode,
    }).returning();
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "SupervisorSessions");
  }
}
