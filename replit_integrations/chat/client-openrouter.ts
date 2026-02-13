import OpenAI from "openai";

let _openrouter: OpenAI | null = null;

export function getOpenRouter(): OpenAI {
  if (!_openrouter) {
    if (!process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY || !process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL) {
      console.warn("OpenRouter AI Integrations env vars not set. OpenRouter provider will not be available.");
    }
    _openrouter = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
    });
  }
  return _openrouter;
}

export const openrouter = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenRouter() as any)[prop];
  },
});
