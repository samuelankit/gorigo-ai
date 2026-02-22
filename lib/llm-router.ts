import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type LLMProvider = "openai" | "anthropic";

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  halfOpenAt: number;
}

interface ProviderHealth {
  provider: LLMProvider;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  lastCheck: number;
  successRate: number;
  totalRequests: number;
  totalFailures: number;
}

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 30_000;
const CIRCUIT_HALF_OPEN_MS = 15_000;
const REQUEST_TIMEOUT_MS = 30_000;
const LATENCY_WINDOW_SIZE = 20;

const circuitStates = new Map<string, CircuitState>();
const providerLatencies = new Map<string, number[]>();
const providerHealth = new Map<string, ProviderHealth>();

function getCircuitState(key: string): CircuitState {
  if (!circuitStates.has(key)) {
    circuitStates.set(key, { failures: 0, lastFailure: 0, isOpen: false, halfOpenAt: 0 });
  }
  return circuitStates.get(key)!;
}

function recordSuccess(key: string, latencyMs: number): void {
  const state = getCircuitState(key);
  state.failures = 0;
  state.isOpen = false;
  state.halfOpenAt = 0;

  const latencies = providerLatencies.get(key) || [];
  latencies.push(latencyMs);
  if (latencies.length > LATENCY_WINDOW_SIZE) latencies.shift();
  providerLatencies.set(key, latencies);

  const health = providerHealth.get(key) || { provider: key as LLMProvider, status: "healthy", latencyMs: 0, lastCheck: 0, successRate: 100, totalRequests: 0, totalFailures: 0 };
  health.totalRequests++;
  health.latencyMs = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  health.successRate = Math.round(((health.totalRequests - health.totalFailures) / health.totalRequests) * 100);
  health.status = health.successRate >= 95 ? "healthy" : health.successRate >= 70 ? "degraded" : "down";
  health.lastCheck = Date.now();
  providerHealth.set(key, health);
}

function recordFailure(key: string): void {
  const state = getCircuitState(key);
  state.failures++;
  state.lastFailure = Date.now();

  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.isOpen = true;
    state.halfOpenAt = Date.now() + CIRCUIT_HALF_OPEN_MS;
    console.warn(`[LLM Router] Circuit OPEN for ${key} after ${state.failures} failures`);
  }

  const health = providerHealth.get(key) || { provider: key as LLMProvider, status: "healthy", latencyMs: 0, lastCheck: 0, successRate: 100, totalRequests: 0, totalFailures: 0 };
  health.totalRequests++;
  health.totalFailures++;
  health.successRate = Math.round(((health.totalRequests - health.totalFailures) / health.totalRequests) * 100);
  health.status = state.isOpen ? "down" : health.successRate >= 70 ? "degraded" : "down";
  health.lastCheck = Date.now();
  providerHealth.set(key, health);
}

function isCircuitAllowing(key: string): boolean {
  const state = getCircuitState(key);
  if (!state.isOpen) return true;

  const now = Date.now();
  if (now >= state.halfOpenAt && state.halfOpenAt > 0) {
    console.info(`[LLM Router] Circuit HALF-OPEN for ${key}, allowing test request`);
    return true;
  }

  if (now - state.lastFailure > CIRCUIT_BREAKER_RESET_MS) {
    state.isOpen = false;
    state.failures = 0;
    console.info(`[LLM Router] Circuit RESET for ${key} after cooldown`);
    return true;
  }

  return false;
}

const OPENAI_MODELS = {
  primary: "gpt-4o-mini",
  fallback: "gpt-4o",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-5";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
    timeout: REQUEST_TIMEOUT_MS,
  });
}

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  });
}

export interface LLMCallResult {
  content: string;
  model: string;
  provider: LLMProvider;
  usedFallback: boolean;
  latencyMs: number;
  keySource: "platform";
  tier: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function extractSystemPrompt(messages: ConversationMessage[]): { system: string | undefined; userMessages: ConversationMessage[] } {
  const systemMsgs = messages.filter(m => m.role === "system");
  const userMessages = messages.filter(m => m.role !== "system");
  const system = systemMsgs.length > 0 ? systemMsgs.map(m => m.content).join("\n\n") : undefined;
  return { system, userMessages };
}

async function callOpenAI(
  client: OpenAI,
  model: string,
  messages: ConversationMessage[],
  maxTokens: number,
  temperature: number,
): Promise<{ content: string; latencyMs: number; inputTokens?: number; outputTokens?: number }> {
  const start = Date.now();
  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  });
  return {
    content: response.choices[0]?.message?.content || "",
    latencyMs: Date.now() - start,
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
  };
}

async function callAnthropic(
  client: Anthropic,
  model: string,
  messages: ConversationMessage[],
  maxTokens: number,
  temperature: number,
): Promise<{ content: string; latencyMs: number; inputTokens?: number; outputTokens?: number }> {
  const { system, userMessages } = extractSystemPrompt(messages);
  const anthropicMessages = userMessages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const start = Date.now();
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: anthropicMessages,
  });
  const textBlock = response.content.find(b => b.type === "text");
  return {
    content: textBlock?.text || "",
    latencyMs: Date.now() - start,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  };
}

export async function callLLM(
  messages: ConversationMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    orgId?: number;
    preferredModel?: string;
  }
): Promise<LLMCallResult> {
  const maxTokens = options?.maxTokens ?? 1024;
  const temperature = options?.temperature ?? 0.7;

  const errors: { provider: string; error: string; tier: number }[] = [];

  // === TIER 1: OpenAI (gpt-4o-mini primary, gpt-4o fallback) ===
  if (isCircuitAllowing("openai")) {
    const client = getOpenAIClient();
    if (client) {
      const model = options?.preferredModel || OPENAI_MODELS.primary;
      try {
        const result = await callOpenAI(client, model, messages, maxTokens, temperature);
        recordSuccess("openai", result.latencyMs);
        return { content: result.content, model, provider: "openai", usedFallback: false, latencyMs: result.latencyMs, keySource: "platform", tier: 1, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[LLM Router] Tier 1 OpenAI (${model}) failed:`, errMsg);
        recordFailure("openai");
        errors.push({ provider: "openai", error: errMsg, tier: 1 });

        if (OPENAI_MODELS.fallback !== model) {
          try {
            const simplifiedMessages = messages.length > 4 ? [messages[0], ...messages.slice(-3)] : messages;
            const result = await callOpenAI(client, OPENAI_MODELS.fallback, simplifiedMessages, Math.min(maxTokens, 512), temperature);
            recordSuccess("openai", result.latencyMs);
            return { content: result.content, model: OPENAI_MODELS.fallback, provider: "openai", usedFallback: true, latencyMs: result.latencyMs, keySource: "platform", tier: 1, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
          } catch (fallbackErr) {
            const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
            console.error(`[LLM Router] Tier 1 OpenAI fallback (${OPENAI_MODELS.fallback}) also failed:`, fbMsg);
            recordFailure("openai");
            errors.push({ provider: "openai:fallback", error: fbMsg, tier: 1 });
          }
        }
      }
    } else {
      errors.push({ provider: "openai", error: "Not configured", tier: 1 });
    }
  } else {
    errors.push({ provider: "openai", error: "Circuit breaker open", tier: 1 });
  }

  // === TIER 2: Anthropic Claude (independent provider fallback) ===
  if (isCircuitAllowing("anthropic")) {
    const client = getAnthropicClient();
    if (client) {
      try {
        const result = await callAnthropic(client, ANTHROPIC_MODEL, messages, maxTokens, temperature);
        recordSuccess("anthropic", result.latencyMs);
        return { content: result.content, model: ANTHROPIC_MODEL, provider: "anthropic", usedFallback: true, latencyMs: result.latencyMs, keySource: "platform", tier: 2, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[LLM Router] Tier 2 Anthropic (${ANTHROPIC_MODEL}) failed:`, errMsg);
        recordFailure("anthropic");
        errors.push({ provider: "anthropic", error: errMsg, tier: 2 });
      }
    } else {
      errors.push({ provider: "anthropic", error: "Not configured", tier: 2 });
    }
  } else {
    errors.push({ provider: "anthropic", error: "Circuit breaker open", tier: 2 });
  }

  const errorSummary = errors.map(e => `T${e.tier} ${e.provider}: ${e.error}`).join("; ");
  throw new Error(`All LLM providers failed. ${errorSummary}`);
}

interface NormalizedStreamChunk {
  choices: Array<{ delta: { content?: string | null }; index: number }>;
}

async function* wrapAnthropicStream(
  stream: ReturnType<Anthropic["messages"]["stream"]>
): AsyncIterable<NormalizedStreamChunk> {
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield { choices: [{ delta: { content: event.delta.text }, index: 0 }] };
    }
  }
}

export async function callLLMStream(
  messages: ConversationMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    orgId?: number;
    preferredModel?: string;
  }
): Promise<AsyncIterable<NormalizedStreamChunk>> {
  const maxTokens = options?.maxTokens ?? 1024;
  const temperature = options?.temperature ?? 0.7;

  // Tier 1: OpenAI streaming
  if (isCircuitAllowing("openai")) {
    const client = getOpenAIClient();
    if (client) {
      try {
        const model = options?.preferredModel || OPENAI_MODELS.primary;
        return await client.chat.completions.create({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: true,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[LLM Router] Stream Tier 1 OpenAI failed:`, errMsg);
        recordFailure("openai");
      }
    }
  }

  // Tier 2: Anthropic streaming (normalized to OpenAI-compatible format)
  if (isCircuitAllowing("anthropic")) {
    const client = getAnthropicClient();
    if (client) {
      try {
        const { system, userMessages } = extractSystemPrompt(messages);
        const anthropicMessages = userMessages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        const stream = client.messages.stream({
          model: ANTHROPIC_MODEL,
          max_tokens: maxTokens,
          temperature,
          ...(system ? { system } : {}),
          messages: anthropicMessages,
        });
        recordSuccess("anthropic", 0);
        return wrapAnthropicStream(stream);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[LLM Router] Stream Tier 2 Anthropic failed:`, errMsg);
        recordFailure("anthropic");
      }
    }
  }

  throw new Error("All LLM providers failed for streaming.");
}

export function getOpenAIClientForEmbeddings(): Promise<OpenAI> {
  return getOpenAIClientDirect();
}

async function getOpenAIClientDirect(): Promise<OpenAI> {
  const openaiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const openaiBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  return new OpenAI({
    apiKey: openaiKey,
    baseURL: openaiBase,
    timeout: REQUEST_TIMEOUT_MS,
  });
}

export function getLLMHealthStatus(): Record<string, ProviderHealth> {
  const result: Record<string, ProviderHealth> = {};
  const providerNames: LLMProvider[] = ["openai", "anthropic"];

  for (const name of providerNames) {
    const health = providerHealth.get(name);
    const circuit = circuitStates.get(name);

    const isConfigured =
      (name === "openai" && !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) ||
      (name === "anthropic" && !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY);

    if (!isConfigured) continue;

    result[name] = health || {
      provider: name,
      status: "healthy",
      latencyMs: 0,
      lastCheck: 0,
      successRate: 100,
      totalRequests: 0,
      totalFailures: 0,
    };

    if (circuit?.isOpen) {
      result[name].status = "down";
    }
  }

  return result;
}

export function resetCircuitBreaker(provider: string): void {
  const state = circuitStates.get(provider);
  if (state) {
    state.failures = 0;
    state.isOpen = false;
    state.halfOpenAt = 0;
    state.lastFailure = 0;
    console.info(`[LLM Router] Circuit manually reset for ${provider}`);
  }
}

export function getLLMRouterStats() {
  const providerNames: LLMProvider[] = ["openai", "anthropic"];
  const configured = providerNames.filter(name =>
    (name === "openai" && !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) ||
    (name === "anthropic" && !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY)
  );

  return {
    configuredProviders: configured,
    fallbackChain: "OpenAI (gpt-4o-mini → gpt-4o) → Anthropic Claude",
    health: getLLMHealthStatus(),
    circuitBreakers: Object.fromEntries(
      Array.from(circuitStates.entries()).map(([k, v]) => [k, {
        failures: v.failures,
        isOpen: v.isOpen,
        lastFailure: v.lastFailure ? new Date(v.lastFailure).toISOString() : null,
      }])
    ),
  };
}
