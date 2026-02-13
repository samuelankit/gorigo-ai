import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || "placeholder-key";
const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  console.warn("Anthropic AI Integrations env vars not set. Anthropic provider will not be available.");
}

export const anthropic = new Anthropic({ apiKey, baseURL });
