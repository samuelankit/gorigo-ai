import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wallets } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

const settingsSchema = z.object({
  lowBalanceThreshold: z.number().min(0).max(10000).optional(),
  lowBalanceEmailEnabled: z.boolean().optional(),
}).strict();

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

    const [wallet] = await db
      .select({
        lowBalanceThreshold: wallets.lowBalanceThreshold,
        lowBalanceEmailEnabled: wallets.lowBalanceEmailEnabled,
      })
      .from(wallets)
      .where(eq(wallets.orgId, auth.orgId))
      .limit(1);

    return NextResponse.json({
      lowBalanceThreshold: Number(wallet?.lowBalanceThreshold ?? 10),
      lowBalanceEmailEnabled: wallet?.lowBalanceEmailEnabled ?? true,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/wallet/settings");
  }
}

export async function PUT(request: NextRequest) {
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
    const parsed = settingsSchema.parse(body);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.lowBalanceThreshold !== undefined) {
      updates.lowBalanceThreshold = String(parsed.lowBalanceThreshold);
    }
    if (parsed.lowBalanceEmailEnabled !== undefined) {
      updates.lowBalanceEmailEnabled = parsed.lowBalanceEmailEnabled;
    }

    await db.update(wallets).set(updates).where(eq(wallets.orgId, auth.orgId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "PUT /api/wallet/settings");
  }
}
