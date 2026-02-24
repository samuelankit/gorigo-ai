import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialStrategies, socialPosts } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const strategyId = parseInt(id);
    if (isNaN(strategyId)) {
      return NextResponse.json({ error: "Invalid strategy ID" }, { status: 400 });
    }

    const [strategy] = await db.select().from(socialStrategies)
      .where(and(eq(socialStrategies.id, strategyId), eq(socialStrategies.orgId, auth.orgId)))
      .limit(1);

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const content = strategy.strategyContent as any;
    const calendar = content?.contentCalendar;
    if (!calendar || !Array.isArray(calendar) || calendar.length === 0) {
      return NextResponse.json({ error: "No content calendar found in strategy" }, { status: 400 });
    }

    const posts = [];
    for (const item of calendar) {
      const caption = item.captionDraft || item.topic || "";
      const hashtags = Array.isArray(item.hashtags) ? item.hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ") : "";
      const fullContent = `${caption}${hashtags ? "\n\n" + hashtags : ""}`;
      const platform = item.platform?.toLowerCase().replace(/\s+/g, "_") || strategy.platforms[0];

      const [post] = await db.insert(socialPosts).values({
        orgId: auth.orgId,
        userId: auth.user.id,
        strategyId: strategy.id,
        content: fullContent,
        platforms: [platform],
        status: "draft",
      }).returning();

      posts.push(post);
    }

    return NextResponse.json({ posts, count: posts.length }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "Failed to convert strategy to posts");
  }
}
