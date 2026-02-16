const OUTPUT_INJECTION_PATTERNS = [
  /my\s+(system\s+)?prompt\s+(is|says|states|reads|contains)/i,
  /my\s+instructions?\s+(are|is|say|state|read|contain)/i,
  /here\s+(is|are)\s+my\s+(system\s+)?prompt/i,
  /i\s+was\s+instructed\s+to/i,
  /my\s+programming\s+(says|states|instructs|requires)/i,
  /as\s+per\s+my\s+(system\s+)?(prompt|instructions|programming)/i,
  /SECURITY\s+INSTRUCTIONS/i,
  /HIGHEST\s+PRIORITY.*NEVER\s+OVERRIDE/i,
  /AGENT_ANTI_INJECTION/i,
  /i\s+am\s+now\s+in\s+(developer|admin|sudo|unrestricted|god)\s+mode/i,
  /i\s+can\s+now\s+do\s+anything/i,
  /all\s+restrictions?\s+(have\s+been|are)\s+(removed|lifted|disabled)/i,
  /i\s+will\s+ignore\s+(my|the|all)\s+(safety|security|content)\s*(guidelines?|rules?|filters?)/i,
  /entering\s+(unrestricted|unfiltered|developer|admin)\s+mode/i,
  /DAN\s+mode\s+(enabled|activated|on)/i,
  /i\s+no\s+longer\s+have\s+(any\s+)?restrictions/i,
];

const UNSAFE_CONTENT_PATTERNS = [
  /how\s+to\s+(make|build|create|construct)\s+(a\s+)?(bomb|explosive|weapon)/i,
  /step[- ]by[- ]step\s+(guide|instructions?)\s+(to|for)\s+(hack|exploit|break\s+into)/i,
  /here'?s?\s+how\s+to\s+(steal|fraud|scam|phish)/i,
  /credit\s+card\s+number\s*[:=]\s*\d{4}/i,
  /social\s+security\s+number\s*[:=]\s*\d{3}/i,
  /password\s+is\s*[:=]\s*\S+/i,
];

const UNGROUNDED_RESPONSE_INDICATORS = [
  /i\s+believe\s+their\s+(phone|number|address|email)\s+is/i,
  /the\s+price\s+is\s+(?:approximately\s+)?\$[\d,]+(?:\.\d{2})?(?:\s+per\s+(?:month|year|seat|user|agent))/i,
  /i\s+can\s+guarantee/i,
  /our\s+(?:office|headquarters)\s+(?:is|are)\s+located\s+at\s+\d+/i,
  /we\s+offer\s+a\s+\d+[-%]\s+(?:discount|guarantee|refund)/i,
];

export interface OutputGuardResult {
  safe: boolean;
  reason?: string;
  category?: "prompt_leak" | "unsafe_content" | "role_break" | "ungrounded";
  originalResponse: string;
  sanitizedResponse?: string;
}

export function validateLLMOutput(
  response: string,
  ragContext?: string,
  options?: {
    strictGrounding?: boolean;
    maxResponseLength?: number;
  }
): OutputGuardResult {
  const result: OutputGuardResult = {
    safe: true,
    originalResponse: response,
  };

  if (!response || response.trim().length === 0) {
    return result;
  }

  for (const pattern of OUTPUT_INJECTION_PATTERNS) {
    if (pattern.test(response)) {
      return {
        safe: false,
        reason: "Response contains potential system prompt leakage or role-breaking content",
        category: "prompt_leak",
        originalResponse: response,
        sanitizedResponse: getOutputSafeRefusal(),
      };
    }
  }

  for (const pattern of UNSAFE_CONTENT_PATTERNS) {
    if (pattern.test(response)) {
      return {
        safe: false,
        reason: "Response contains potentially unsafe or sensitive content",
        category: "unsafe_content",
        originalResponse: response,
        sanitizedResponse: getOutputSafeRefusal(),
      };
    }
  }

  const maxLen = options?.maxResponseLength ?? 2000;
  if (response.length > maxLen) {
    return {
      safe: false,
      reason: `Response exceeds maximum allowed length (${response.length} > ${maxLen})`,
      category: "ungrounded",
      originalResponse: response,
      sanitizedResponse: response.slice(0, maxLen) + "...",
    };
  }

  if (options?.strictGrounding && ragContext) {
    for (const pattern of UNGROUNDED_RESPONSE_INDICATORS) {
      if (pattern.test(response)) {
        const contextLower = ragContext.toLowerCase();
        const matchStr = response.match(pattern)?.[0]?.toLowerCase() || "";

        const keyTerms = matchStr.split(/\s+/).filter((w) => w.length > 3);
        const isGrounded = keyTerms.some((term) => contextLower.includes(term));

        if (!isGrounded) {
          return {
            safe: false,
            reason: "Response contains specific claims not found in knowledge base",
            category: "ungrounded",
            originalResponse: response,
            sanitizedResponse: getGroundingFallback(),
          };
        }
      }
    }
  }

  return result;
}

export function validateStreamChunk(chunk: string, accumulatedResponse: string): {
  safe: boolean;
  reason?: string;
} {
  const combined = accumulatedResponse + chunk;

  for (const pattern of OUTPUT_INJECTION_PATTERNS) {
    if (pattern.test(combined)) {
      return { safe: false, reason: "Stream contains prompt leakage indicators" };
    }
  }

  for (const pattern of UNSAFE_CONTENT_PATTERNS) {
    if (pattern.test(combined)) {
      return { safe: false, reason: "Stream contains unsafe content" };
    }
  }

  return { safe: true };
}

function getOutputSafeRefusal(): string {
  return "I'm sorry, I can only help with business-related enquiries about GoRigo. How can I assist you today?";
}

function getGroundingFallback(): string {
  return "I don't have specific information on that. I'd recommend contacting our team at hello@gorigo.ai or visiting our website for the most accurate details. Is there anything else I can help with?";
}

export const KNOWLEDGE_ONLY_REFUSAL =
  "I don't have information on that topic in my knowledge base. I'd be happy to help with questions I'm trained on, or I can connect you with someone who can assist further.";

export const KNOWLEDGE_ONLY_REFUSAL_VOICE =
  "I'm sorry, I don't have information on that topic. Let me connect you with someone who can help, or you can ask me about something else.";

export const RAG_GROUNDING_INSTRUCTION = `
CRITICAL GROUNDING RULES:
- You MUST only answer based on the knowledge base information provided above.
- If no relevant knowledge base information is provided, or if the question is outside the scope of the provided context, say you don't have information on that and offer to connect them with someone who can help.
- NEVER make up facts, prices, phone numbers, addresses, or specific details not in the provided context.
- NEVER guess or speculate about information not explicitly provided.
- If partially relevant information is available, share what you know and clearly state the limits of your knowledge.
- Prefer shorter, factual answers grounded in the provided context over longer speculative ones.
`;
