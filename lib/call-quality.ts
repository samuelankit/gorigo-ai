import { callLLM } from "@/lib/llm-router";

export interface QualityBreakdown {
  greeting: number;
  understanding: number;
  accuracy: number;
  professionalism: number;
  resolution: number;
  efficiency: number;
}

export interface QualityResult {
  overallScore: number;
  breakdown: QualityBreakdown;
  csatPrediction: number;
  resolutionStatus: "resolved" | "partially_resolved" | "unresolved" | "escalated" | "unknown";
  improvements: string[];
}

export function calculateBasicQuality(
  turnCount: number,
  maxTurns: number,
  sentimentScore: number | null,
  handoffTriggered: boolean,
  finalOutcome: string | null,
  duration: number | null
): QualityResult {
  let efficiency = 10;
  if (turnCount > maxTurns * 0.8) efficiency = 4;
  else if (turnCount > maxTurns * 0.6) efficiency = 6;
  else if (turnCount > maxTurns * 0.4) efficiency = 8;

  let resolution = 5;
  if (finalOutcome === "completed_normally") resolution = 8;
  else if (finalOutcome === "handoff_to_human") resolution = 6;
  else if (finalOutcome === "max_turns_exceeded") resolution = 3;
  else if (finalOutcome === "dial_failed") resolution = 2;

  let professionalism = 7;
  const sentimentAdjust = sentimentScore !== null ? Math.max(0, Math.min(3, (sentimentScore + 1) * 1.5)) : 1.5;
  professionalism = Math.min(10, professionalism + sentimentAdjust);

  const breakdown: QualityBreakdown = {
    greeting: 7,
    understanding: 6,
    accuracy: 6,
    professionalism: Math.round(professionalism),
    resolution,
    efficiency,
  };

  const weights = { greeting: 0.1, understanding: 0.2, accuracy: 0.25, professionalism: 0.15, resolution: 0.2, efficiency: 0.1 };
  const overallScore = Math.round(
    (breakdown.greeting * weights.greeting +
      breakdown.understanding * weights.understanding +
      breakdown.accuracy * weights.accuracy +
      breakdown.professionalism * weights.professionalism +
      breakdown.resolution * weights.resolution +
      breakdown.efficiency * weights.efficiency) * 10
  );

  let csatPrediction = 3;
  if (overallScore >= 80) csatPrediction = 5;
  else if (overallScore >= 65) csatPrediction = 4;
  else if (overallScore >= 50) csatPrediction = 3;
  else if (overallScore >= 35) csatPrediction = 2;
  else csatPrediction = 1;

  let resolutionStatus: QualityResult["resolutionStatus"] = "unknown";
  if (finalOutcome === "completed_normally") resolutionStatus = "resolved";
  else if (handoffTriggered) resolutionStatus = "escalated";
  else if (finalOutcome === "max_turns_exceeded") resolutionStatus = "unresolved";

  return { overallScore, breakdown, csatPrediction, resolutionStatus, improvements: [] };
}

export async function scoreCallQualityAI(transcript: string, agentName: string, orgId?: number): Promise<QualityResult> {
  try {
    const result = await callLLM(
      [
        {
          role: "system",
          content: `You are a call center QA analyst. Score this call transcript. Return JSON only:
{
  "breakdown": {
    "greeting": <0-10>,
    "understanding": <0-10>,
    "accuracy": <0-10>,
    "professionalism": <0-10>,
    "resolution": <0-10>,
    "efficiency": <0-10>
  },
  "csatPrediction": <1-5>,
  "resolutionStatus": "<resolved|partially_resolved|unresolved|escalated|unknown>",
  "improvements": ["<suggestion1>", "<suggestion2>"]
}
Scoring guide:
- greeting: Did the agent (${agentName}) introduce themselves and set expectations?
- understanding: Did the agent correctly understand the caller's needs?
- accuracy: Were the agent's responses accurate and helpful?
- professionalism: Was the tone appropriate and professional?
- resolution: Was the caller's issue resolved?
- efficiency: Was the call handled efficiently without unnecessary turns?
Max 3 improvement suggestions.`
        },
        { role: "user", content: `Score this call:\n\n${transcript}` }
      ],
      { maxTokens: 300, temperature: 0, orgId }
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const breakdown = parsed.breakdown || {};
      const weights = { greeting: 0.1, understanding: 0.2, accuracy: 0.25, professionalism: 0.15, resolution: 0.2, efficiency: 0.1 };
      const overallScore = Math.round(
        ((breakdown.greeting || 5) * weights.greeting +
          (breakdown.understanding || 5) * weights.understanding +
          (breakdown.accuracy || 5) * weights.accuracy +
          (breakdown.professionalism || 5) * weights.professionalism +
          (breakdown.resolution || 5) * weights.resolution +
          (breakdown.efficiency || 5) * weights.efficiency) * 10
      );
      return {
        overallScore,
        breakdown: {
          greeting: breakdown.greeting || 5,
          understanding: breakdown.understanding || 5,
          accuracy: breakdown.accuracy || 5,
          professionalism: breakdown.professionalism || 5,
          resolution: breakdown.resolution || 5,
          efficiency: breakdown.efficiency || 5,
        },
        csatPrediction: parsed.csatPrediction || 3,
        resolutionStatus: parsed.resolutionStatus || "unknown",
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : [],
      };
    }
  } catch (err) {
    console.error("AI quality scoring failed:", err);
  }
  return calculateBasicQuality(0, 10, null, false, null, null);
}
