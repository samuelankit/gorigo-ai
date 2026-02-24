import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { callLLM } from "@/lib/llm-router";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const captionSchema = z.object({
  topic: z.string().min(1).max(1000),
  platform: z.enum(["facebook_instagram", "linkedin", "twitter", "tiktok", "youtube"]),
  tone: z.enum(["professional", "friendly", "casual", "bold", "empathetic", "humorous"]).default("professional"),
  includeHashtags: z.boolean().default(true),
  includeCTA: z.boolean().default(true),
  language: z.string().default("en"),
});

const PLATFORM_LIMITS: Record<string, { name: string; maxChars: number }> = {
  facebook_instagram: { name: "Instagram", maxChars: 2200 },
  linkedin: { name: "LinkedIn", maxChars: 3000 },
  twitter: { name: "X (Twitter)", maxChars: 280 },
  tiktok: { name: "TikTok", maxChars: 2200 },
  youtube: { name: "YouTube", maxChars: 5000 },
};

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = captionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { topic, platform, tone, includeHashtags, includeCTA, language } = parsed.data;
    const platformInfo = PLATFORM_LIMITS[platform];

    const systemPrompt = `You are a social media copywriter. Generate a caption optimised for ${platformInfo.name}. Keep it under ${platformInfo.maxChars} characters. Respond with a JSON object:
{
  "caption": "the main caption text",
  "hashtags": ["relevant", "hashtags"],
  "cta": "call to action text",
  "characterCount": number
}
Only respond with valid JSON. No markdown, no code fences.`;

    const userPrompt = `Write a ${tone} caption about: ${topic}
Platform: ${platformInfo.name} (max ${platformInfo.maxChars} chars)
${includeHashtags ? "Include 5-10 relevant hashtags" : "No hashtags"}
${includeCTA ? "Include a clear call-to-action" : "No CTA needed"}
Language: ${language === "en" ? "English" : language}`;

    const result = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { maxTokens: 1000, temperature: 0.8, orgId: auth.orgId });

    let captionData;
    try {
      const cleanContent = result.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      captionData = JSON.parse(cleanContent);
    } catch {
      captionData = { caption: result.content, hashtags: [], cta: "", characterCount: result.content.length };
    }

    return NextResponse.json({
      ...captionData,
      platform,
      platformName: platformInfo.name,
      maxCharacters: platformInfo.maxChars,
    });
  } catch (err) {
    return handleRouteError(err, "Failed to generate caption");
  }
}
