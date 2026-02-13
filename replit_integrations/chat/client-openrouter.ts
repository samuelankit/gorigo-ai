import OpenAI from "openai";

const apiKey = process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY || "placeholder-key";
const baseURL = process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL;

if (!process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY && typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  console.warn("OpenRouter AI Integrations env vars not set. OpenRouter provider will not be available.");
}

export const openrouter = new OpenAI({ apiKey, baseURL });
