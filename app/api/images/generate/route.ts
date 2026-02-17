import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  prompt: z.string().min(1),
  size: z.enum(["1024x1024", "512x512", "256x256"]).optional().default("1024x1024"),
}).strict();

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "placeholder-key";
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

const openaiClient = new OpenAI({ apiKey, baseURL });

export async function POST(req: NextRequest) {
  const rl = await settingsLimiter(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = bodySchema.parse(body);

  try {
    const response = await openaiClient.images.generate({
      model: "gpt-image-1",
      prompt: parsed.prompt,
      n: 1,
      size: parsed.size,
    });

    if (!response.data || response.data.length === 0) {
      return NextResponse.json({ message: "No image data returned" }, { status: 500 });
    }
    const imageData = response.data[0];
    return NextResponse.json({
      b64_json: imageData?.b64_json,
      revised_prompt: (imageData as any)?.revised_prompt,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: errMsg }, { status: 500 });
  }
}
