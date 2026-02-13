import Anthropic from "@anthropic-ai/sdk";

if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || !process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
  console.warn("Anthropic AI Integrations env vars not set. Anthropic provider will not be available.");
}

export const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});
