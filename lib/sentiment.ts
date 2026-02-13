import { callLLM } from "@/lib/llm-router";

export interface SentimentResult {
  score: number;
  label: "very_negative" | "negative" | "neutral" | "positive" | "very_positive";
  keywords: string[];
}

export function analyzeSentimentLocal(text: string): SentimentResult {
  const lowerText = text.toLowerCase();

  const positiveWords = ["thank", "thanks", "great", "good", "excellent", "perfect", "wonderful", "happy", "pleased", "appreciate", "love", "amazing", "awesome", "helpful", "fantastic", "brilliant"];
  const negativeWords = ["angry", "frustrated", "terrible", "horrible", "worst", "hate", "awful", "disgusting", "unacceptable", "ridiculous", "useless", "pathetic", "stupid", "incompetent", "scam", "never", "complaint", "problem", "issue", "wrong", "mistake", "disappointed", "upset", "furious"];
  const veryNegativeWords = ["sue", "lawyer", "legal", "report", "cancel", "refund", "scam", "fraud", "furious", "outraged"];
  const escalationWords = ["manager", "supervisor", "complaint", "escalate"];

  let score = 0;
  const keywords: string[] = [];

  const words = lowerText.split(/\s+/);
  for (const word of words) {
    if (positiveWords.includes(word)) { score += 0.15; keywords.push(word); }
    if (negativeWords.includes(word)) { score -= 0.2; keywords.push(word); }
    if (veryNegativeWords.includes(word)) { score -= 0.3; keywords.push(word); }
    if (escalationWords.includes(word)) { score -= 0.15; keywords.push(word); }
  }

  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 1) score *= 1.2;

  const capsWords = text.split(/\s+/).filter(w => w.length > 2 && w === w.toUpperCase());
  if (capsWords.length > 1) score -= 0.15;

  score = Math.max(-1, Math.min(1, score));

  let label: SentimentResult["label"];
  if (score <= -0.5) label = "very_negative";
  else if (score <= -0.15) label = "negative";
  else if (score <= 0.15) label = "neutral";
  else if (score <= 0.5) label = "positive";
  else label = "very_positive";

  return { score: Math.round(score * 100) / 100, label, keywords: Array.from(new Set(keywords)).slice(0, 5) };
}

export async function analyzeSentimentAI(text: string, orgId?: number): Promise<SentimentResult> {
  try {
    const result = await callLLM(
      [
        {
          role: "system",
          content: `Analyze the sentiment of the caller's message. Return JSON only:
{"score": <-1 to 1>, "label": "<very_negative|negative|neutral|positive|very_positive>", "keywords": ["<emotion words>"]}
Score: -1=very negative, 0=neutral, 1=very positive. Max 5 keywords.`
        },
        { role: "user", content: text }
      ],
      { maxTokens: 100, temperature: 0, orgId }
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.max(-1, Math.min(1, parsed.score || 0)),
        label: parsed.label || "neutral",
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
      };
    }
  } catch (err) {
    console.error("AI sentiment analysis failed:", err);
  }
  return analyzeSentimentLocal(text);
}
