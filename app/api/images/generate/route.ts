import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthenticatedUser } from "@/lib/get-user";

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "placeholder-key";
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

const openaiClient = new OpenAI({ apiKey, baseURL });

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const { prompt, size = "1024x1024" } = body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ message: "prompt is required" }, { status: 400 });
  }

  try {
    const response = await openaiClient.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: size as "1024x1024" | "512x512" | "256x256",
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
