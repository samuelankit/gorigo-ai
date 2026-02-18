import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costConfig } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { adminLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { handleRouteError } from "@/lib/api-error";

async function requireSuperAdmin() {
  const auth = await getAuthenticatedUser();
  if (!auth || auth.globalRole !== "SUPERADMIN") return null;
  return auth;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const configs = await db
      .select()
      .from(costConfig)
      .orderBy(desc(costConfig.createdAt));

    const categories = configs.reduce((acc: Record<string, typeof configs>, c) => {
      const cat = c.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(c);
      return acc;
    }, {});

    const marginAnalysis = configs
      .filter(c => c.isActive)
      .map(c => {
        const unitCost = Number(c.unitCostAmount);
        const markup = Number(c.markupPercent ?? "40");
        const selling = Number(c.sellingPrice) || Number((unitCost * (1 + markup / 100)).toFixed(4));
        const margin = selling > 0 ? Number(((selling - unitCost) / selling * 100).toFixed(1)) : 0;
        return {
          category: c.category,
          provider: c.provider,
          unitCost: unitCost,
          markup: markup,
          sellingPrice: selling,
          margin,
          unitType: c.unitType,
        };
      });

    return NextResponse.json({ configs, categories, marginAnalysis });
  } catch (error) {
    return handleRouteError(error, "AdminPricing");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await requireSuperAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { category, provider, unitCostAmount, unitType, markupPercent, sellingPrice } = body;

    if (!category || !unitCostAmount || !unitType) {
      return NextResponse.json({ error: "category, unitCostAmount, and unitType are required" }, { status: 400 });
    }

    if (typeof unitCostAmount !== "number" || unitCostAmount < 0 || unitCostAmount > 1000) {
      return NextResponse.json({ error: "unitCostAmount must be between 0 and 1000" }, { status: 400 });
    }

    if (markupPercent !== undefined && (typeof markupPercent !== "number" || markupPercent < 0 || markupPercent > 500)) {
      return NextResponse.json({ error: "markupPercent must be between 0 and 500" }, { status: 400 });
    }

    if (sellingPrice !== undefined && sellingPrice !== null && (typeof sellingPrice !== "number" || sellingPrice < 0 || sellingPrice > 5000)) {
      return NextResponse.json({ error: "sellingPrice must be between 0 and 5000" }, { status: 400 });
    }

    const [config] = await db
      .insert(costConfig)
      .values({
        category,
        provider: provider || "gorigo",
        unitCostAmount: String(unitCostAmount),
        unitType,
        markupPercent: String(markupPercent ?? 40),
        sellingPrice: sellingPrice != null ? String(sellingPrice) : null,
      })
      .returning();

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "pricing.created",
      entityType: "cost_config",
      entityId: config.id,
      details: { category, unitCostAmount, markupPercent, unitType },
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "AdminPricing");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await requireSuperAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Config ID is required" }, { status: 400 });
    }

    if (updates.unitCostAmount !== undefined && (typeof updates.unitCostAmount !== "number" || updates.unitCostAmount < 0 || updates.unitCostAmount > 1000)) {
      return NextResponse.json({ error: "unitCostAmount must be between 0 and 1000" }, { status: 400 });
    }

    if (updates.markupPercent !== undefined && (typeof updates.markupPercent !== "number" || updates.markupPercent < 0 || updates.markupPercent > 500)) {
      return NextResponse.json({ error: "markupPercent must be between 0 and 500" }, { status: 400 });
    }

    if (updates.sellingPrice !== undefined && updates.sellingPrice !== null && (typeof updates.sellingPrice !== "number" || updates.sellingPrice < 0 || updates.sellingPrice > 5000)) {
      return NextResponse.json({ error: "sellingPrice must be between 0 and 5000" }, { status: 400 });
    }

    const [updated] = await db
      .update(costConfig)
      .set(updates)
      .where(eq(costConfig.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "pricing.updated",
      entityType: "cost_config",
      entityId: id,
      details: updates,
    });

    return NextResponse.json({ config: updated });
  } catch (error) {
    return handleRouteError(error, "AdminPricing");
  }
}
