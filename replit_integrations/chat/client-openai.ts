import OpenAI from "openai";

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "placeholder-key";
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY && typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  console.warn("OpenAI AI Integrations env vars not set. OpenAI provider will not be available.");
}

export const openai = new OpenAI({ apiKey, baseURL });
