import { callLLM, callLLMStream, type ConversationMessage, type LLMCallResult } from "@/lib/llm-router";
import { AGENT_ANTI_INJECTION_PREAMBLE } from "@/lib/prompt-guard";
export type { ConversationMessage };

export interface AIResponse {
  content: string;
  model: string;
  usedFallback: boolean;
  keySource?: "org" | "platform";
  inputTokens?: number;
  outputTokens?: number;
  provider?: string;
}

function buildSystemPrompt(agentConfig: {
  name: string;
  greeting: string;
  businessDescription?: string | null;
  roles: string;
  faqEntries: Array<{ question: string; answer: string }> | null;
  complianceDisclosure: boolean;
  negotiationEnabled: boolean;
  negotiationGuardrails?: {
    minPrice?: number;
    maxPrice?: number;
    approvalThreshold?: number;
  } | null;
}): string {
  let prompt = AGENT_ANTI_INJECTION_PREAMBLE;
  prompt += `\nYou are ${agentConfig.name}, an AI voice agent for a business.`;

  if (agentConfig.businessDescription) {
    prompt += `\n\nBusiness Description: ${agentConfig.businessDescription}`;
  }

  prompt += `\n\nYour role: ${agentConfig.roles === "both" ? "receptionist and sales agent" : agentConfig.roles}`;

  if (agentConfig.complianceDisclosure) {
    prompt += `\n\nIMPORTANT: You must disclose that you are an AI assistant at the beginning of each conversation. Say something like "I'm ${agentConfig.name}, an AI assistant for this business."`;
  }

  prompt += `\n\nGreeting: ${agentConfig.greeting}`;

  if (agentConfig.faqEntries && agentConfig.faqEntries.length > 0) {
    prompt += `\n\nFrequently Asked Questions:`;
    agentConfig.faqEntries.forEach((faq, i) => {
      prompt += `\n${i + 1}. Q: ${faq.question}\n   A: ${faq.answer}`;
    });
  }

  if (agentConfig.roles === "sales" || agentConfig.roles === "both") {
    prompt += `\n\nSales Guidelines:
- Qualify leads by understanding their needs
- Collect contact information when appropriate
- Be helpful and consultative, never aggressive
- If the caller wants to speak to a human, immediately offer to transfer`;
  }

  if (agentConfig.negotiationEnabled && agentConfig.negotiationGuardrails) {
    const g = agentConfig.negotiationGuardrails;
    prompt += `\n\nNegotiation Rules:`;
    if (g.minPrice) prompt += `\n- Minimum acceptable price: $${g.minPrice}`;
    if (g.maxPrice) prompt += `\n- Maximum offer price: $${g.maxPrice}`;
    if (g.approvalThreshold) prompt += `\n- Requires human approval for amounts above: $${g.approvalThreshold}`;
    prompt += `\n- Stay within these guardrails. If terms fall outside range, say you need to check with a manager.`;
  }

  prompt += `\n\nBehavior Rules:
- Be professional, warm, and concise
- Always offer human handoff when requested
- Never make promises the business cannot keep
- Capture lead information (name, phone, email) when naturally appropriate
- If you cannot answer a question, say you'll have someone get back to them
- Keep responses conversational and natural, as if speaking on a phone call`;

  return prompt;
}

export async function generateAgentResponse(
  agentConfig: {
    name: string;
    greeting: string;
    businessDescription?: string | null;
    roles: string;
    faqEntries: Array<{ question: string; answer: string }> | null;
    complianceDisclosure: boolean;
    negotiationEnabled: boolean;
    negotiationGuardrails?: any;
  },
  conversationHistory: ConversationMessage[],
  userMessage: string,
  orgId?: number
): Promise<AIResponse> {
  const systemPrompt = buildSystemPrompt(agentConfig);
  const messages: ConversationMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const result = await callLLM(messages, { orgId });
  return {
    content: result.content,
    model: result.model,
    usedFallback: result.usedFallback,
    keySource: result.keySource,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    provider: result.provider,
  };
}

export async function generateCallSummary(transcript: string, orgId?: number): Promise<string> {
  const messages: ConversationMessage[] = [
    {
      role: "system",
      content: `You are a call summary assistant. Analyze the call transcript and provide a brief, structured summary including:
- Purpose of the call
- Key points discussed
- Any action items or follow-ups needed
- Whether a lead was captured (name, contact info if mentioned)
- Whether an appointment was booked
- Overall sentiment (positive/neutral/negative)
Keep the summary concise, under 200 words.`,
    },
    { role: "user", content: `Summarize this call transcript:\n\n${transcript}` },
  ];

  try {
    const result = await callLLM(messages, { maxTokens: 512, orgId });
    return result.content;
  } catch {
    return "Unable to generate summary at this time.";
  }
}

export async function streamAgentResponse(
  agentConfig: {
    name: string;
    greeting: string;
    businessDescription?: string | null;
    roles: string;
    faqEntries: Array<{ question: string; answer: string }> | null;
    complianceDisclosure: boolean;
    negotiationEnabled: boolean;
    negotiationGuardrails?: any;
  },
  conversationHistory: ConversationMessage[],
  userMessage: string,
  model?: string,
  orgId?: number
) {
  const systemPrompt = buildSystemPrompt(agentConfig);
  const messages: ConversationMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  return callLLMStream(messages, {
    preferredModel: model,
    orgId,
  });
}
