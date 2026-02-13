import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_anthropic) {
    if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || !process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
      console.warn("Anthropic AI Integrations env vars not set. Anthropic provider will not be available.");
    }
    _anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
  }
  return _anthropic;
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    return (getAnthropic() as any)[prop];
  },
});
