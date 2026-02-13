import OpenAI from "openai";

if (!process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY || !process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL) {
  console.warn("OpenRouter AI Integrations env vars not set. OpenRouter provider will not be available.");
}

export const openrouter = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
});
