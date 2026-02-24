import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialStrategies, orgs } from "@/shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { callLLM } from "@/lib/llm-router";
import { getSocialTierLimits } from "@/lib/social-connector-config";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const createStrategySchema = z.object({
  title: z.string().min(1).max(200),
  businessType: z.string().min(1).max(200),
  goals: z.string().min(1).max(2000),
  platforms: z.array(z.string()).min(1),
  budget: z.string().max(200).optional(),
  timeframe: z.string().max(200).optional(),
  tone: z.enum(["professional", "friendly", "casual", "bold", "empathetic"]).default("professional"),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = (page - 1) * limit;

    const conditions = [eq(socialStrategies.orgId, auth.orgId)];
    if (status) {
      conditions.push(eq(socialStrategies.status, status));
    }

    const [strategies, countResult] = await Promise.all([
      db.select().from(socialStrategies)
        .where(and(...conditions))
        .orderBy(desc(socialStrategies.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(socialStrategies)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({
      strategies,
      total: Number(countResult[0]?.count || 0),
      page,
      limit,
    });
  } catch (err) {
    return handleRouteError(err, "Failed to fetch strategies");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createStrategySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [org] = await db.select().from(orgs).where(eq(orgs.id, auth.orgId)).limit(1);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const tierLimits = getSocialTierLimits(org.deploymentModel || "individual");
    if (tierLimits.maxStrategiesPerMonth !== -1) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const [monthCount] = await db.select({ count: sql<number>`count(*)` })
        .from(socialStrategies)
        .where(and(
          eq(socialStrategies.orgId, auth.orgId),
          sql`${socialStrategies.createdAt} >= ${startOfMonth}`
        ));
      if (Number(monthCount?.count || 0) >= tierLimits.maxStrategiesPerMonth) {
        return NextResponse.json({
          error: `Monthly strategy limit reached (${tierLimits.maxStrategiesPerMonth}). Upgrade your package for more.`,
        }, { status: 429 });
      }
    }

    const { title, businessType, goals, platforms, budget, timeframe, tone } = parsed.data;

    const systemPrompt = `You are a senior social media marketing strategist. Generate a comprehensive marketing strategy as a JSON object with these exact keys:
{
  "executiveSummary": "2-3 paragraph overview of the strategy",
  "targetAudience": {
    "demographics": "age, location, interests",
    "personas": [{"name": "string", "description": "string", "platforms": ["string"]}],
    "painPoints": ["string"]
  },
  "platformPlans": [
    {
      "platform": "string",
      "postingFrequency": "string",
      "bestTimes": ["string"],
      "contentTypes": ["string"],
      "toneGuidance": "string",
      "creativeBrief": "what type of visuals to create in design tools"
    }
  ],
  "contentCalendar": [
    {
      "day": "string",
      "platform": "string",
      "contentType": "string",
      "topic": "string",
      "captionDraft": "string",
      "creativeBrief": "description of what visual/video to create",
      "hashtags": ["string"]
    }
  ],
  "hashtagBanks": {
    "primary": ["string"],
    "secondary": ["string"],
    "branded": ["string"]
  },
  "kpiTargets": {
    "reach": "string",
    "engagement": "string",
    "clicks": "string",
    "followers": "string",
    "budgetAllocation": "string"
  }
}
Only respond with valid JSON. No markdown, no code fences.`;

    const userPrompt = `Create a social media marketing strategy with these details:
- Business Type: ${businessType}
- Goals: ${goals}
- Target Platforms: ${platforms.join(", ")}
- Budget: ${budget || "Not specified"}
- Timeframe: ${timeframe || "1 month"}
- Tone: ${tone}

Generate a detailed, actionable strategy with specific content calendar items. For each calendar item, include a creative brief describing what visual or video the user should create in their design tool (e.g., Canva, CapCut). Do not generate images — only describe what to create.`;

    const result = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { maxTokens: 4000, temperature: 0.7, orgId: auth.orgId });

    let strategyContent;
    try {
      const cleanContent = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      strategyContent = JSON.parse(cleanContent);
    } catch {
      strategyContent = { rawContent: result.content };
    }

    const [strategy] = await db.insert(socialStrategies).values({
      orgId: auth.orgId,
      userId: auth.user.id,
      title,
      businessType,
      goals,
      platforms,
      budget: budget || null,
      timeframe: timeframe || null,
      tone,
      strategyContent,
      estimatedCost: "0.05",
      status: "active",
    }).returning();

    return NextResponse.json({ strategy }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "Failed to create strategy");
  }
}
