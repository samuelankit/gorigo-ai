import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateCards } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { adminLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { handleRouteError } from "@/lib/api-error";

const VALID_DEPLOYMENT_MODELS = ["managed", "self_hosted", "custom"] as const;
const VALID_CATEGORIES = ["voice_inbound", "voice_outbound", "ai_chat"] as const;

async function requireSuperAdmin() {
  const auth = await getAuthenticatedUser();
  if (!auth || auth.globalRole !== "SUPERADMIN") return null;
  return auth;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allRateCards = await db.select().from(rateCards);

    // Group by deployment model
    const grouped = allRateCards.reduce(
      (acc: Record<string, typeof allRateCards>, card) => {
        const model = card.deploymentModel;
        if (!acc[model]) acc[model] = [];
        acc[model].push(card);
        return acc;
      },
      {}
    );

    // Generate summary showing deployment models and their rates
    const summary = Object.entries(grouped).map(([deploymentModel, cards]) => ({
      deploymentModel,
      cardCount: cards.length,
      rateRange: {
        min: Math.min(...cards.map((c) => Number(c.ratePerMinute))),
        max: Math.max(...cards.map((c) => Number(c.ratePerMinute))),
      },
      platformFeeRange: {
        min: Math.min(...cards.map((c) => Number(c.platformFeePerMinute))),
        max: Math.max(...cards.map((c) => Number(c.platformFeePerMinute))),
      },
    }));

    return NextResponse.json({ rateCards: allRateCards, grouped, summary });
  } catch (error) {
    return handleRouteError(error, "AdminRateCards");
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      deploymentModel,
      category,
      label,
      ratePerMinute,
      platformFeePerMinute,
      includesAiCost,
      includesTelephonyCost,
      isActive,
    } = body;

    if (!deploymentModel || !category || !label || ratePerMinute === undefined || platformFeePerMinute === undefined) {
      return NextResponse.json(
        { error: "deploymentModel, category, label, ratePerMinute, and platformFeePerMinute are required" },
        { status: 400 }
      );
    }

    if (!VALID_DEPLOYMENT_MODELS.includes(deploymentModel)) {
      return NextResponse.json(
        { error: `Invalid deploymentModel. Must be one of: ${VALID_DEPLOYMENT_MODELS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (typeof ratePerMinute !== "number" || ratePerMinute < 0) {
      return NextResponse.json(
        { error: "ratePerMinute must be a non-negative number" },
        { status: 400 }
      );
    }

    if (typeof platformFeePerMinute !== "number" || platformFeePerMinute < 0) {
      return NextResponse.json(
        { error: "platformFeePerMinute must be a non-negative number" },
        { status: 400 }
      );
    }

    const [card] = await db
      .insert(rateCards)
      .values({
        deploymentModel,
        category,
        label,
        ratePerMinute: String(ratePerMinute),
        platformFeePerMinute: String(platformFeePerMinute),
        includesAiCost: includesAiCost !== false,
        includesTelephonyCost: includesTelephonyCost !== false,
        isActive: isActive !== false,
      })
      .returning();

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "rate_card.created",
      entityType: "rate_card",
      entityId: card.id,
      details: {
        deploymentModel,
        category,
        label,
        ratePerMinute,
        platformFeePerMinute,
      },
    });

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "AdminRateCards");
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Rate card ID is required" }, { status: 400 });
    }

    if (updates.deploymentModel && !VALID_DEPLOYMENT_MODELS.includes(updates.deploymentModel)) {
      return NextResponse.json({ error: `Invalid deploymentModel. Must be one of: ${VALID_DEPLOYMENT_MODELS.join(", ")}` }, { status: 400 });
    }

    if (updates.category && !VALID_CATEGORIES.includes(updates.category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
    }

    if (updates.ratePerMinute !== undefined) {
      if (typeof updates.ratePerMinute !== "number" || updates.ratePerMinute < 0) {
        return NextResponse.json(
          { error: "ratePerMinute must be a non-negative number" },
          { status: 400 }
        );
      }
      updates.ratePerMinute = String(updates.ratePerMinute);
    }

    if (updates.platformFeePerMinute !== undefined) {
      if (typeof updates.platformFeePerMinute !== "number" || updates.platformFeePerMinute < 0) {
        return NextResponse.json(
          { error: "platformFeePerMinute must be a non-negative number" },
          { status: 400 }
        );
      }
      updates.platformFeePerMinute = String(updates.platformFeePerMinute);
    }

    const [updated] = await db
      .update(rateCards)
      .set(updates)
      .where(eq(rateCards.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Rate card not found" }, { status: 404 });
    }

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "rate_card.updated",
      entityType: "rate_card",
      entityId: id,
      details: updates,
    });

    return NextResponse.json({ card: updated });
  } catch (error) {
    return handleRouteError(error, "AdminRateCards");
  }
}
