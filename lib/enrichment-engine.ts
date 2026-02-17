import { db } from "@/lib/db";
import { chatLeads, chatMessages, leadActivities } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";

export async function enrichLead(leadId: number): Promise<{ enriched: boolean; data: Record<string, unknown> }> {
  try {
    const [lead] = await db
      .select()
      .from(chatLeads)
      .where(eq(chatLeads.id, leadId))
      .limit(1);

    if (!lead) {
      return { enriched: false, data: {} };
    }

    const enrichmentData: Record<string, unknown> = {};

    const emailDomain = extractDomainFromEmail(lead.email);
    if (emailDomain) {
      enrichmentData.companyDomain = emailDomain;
      enrichmentData.isPersonalEmail = isPersonalEmail(emailDomain);
      enrichmentData.company = !isPersonalEmail(emailDomain) ? domainToCompany(emailDomain) : null;
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.leadId, leadId))
      .orderBy(desc(chatMessages.createdAt));

    const conversationInsights = analyzeConversation(messages);
    enrichmentData.conversationInsights = conversationInsights;

    const score = calculateLeadScore(lead, messages, enrichmentData);

    const updateData: Record<string, unknown> = {
      leadScore: score,
      enrichedAt: new Date(),
      enrichmentData,
    };

    if (emailDomain && !isPersonalEmail(emailDomain)) {
      updateData.companyDomain = emailDomain;
      updateData.company = domainToCompany(emailDomain);
    }

    await db
      .update(chatLeads)
      .set(updateData)
      .where(eq(chatLeads.id, leadId));

    await db.insert(leadActivities).values({
      leadId,
      type: "enrichment",
      description: `Lead auto-enriched. Score: ${score}/100`,
      metadata: { score, enrichmentData },
    });

    return { enriched: true, data: enrichmentData };
  } catch (error) {
    console.error("[Enrichment] Failed to enrich lead:", error);
    return { enriched: false, data: {} };
  }
}

function extractDomainFromEmail(email: string): string | null {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "mail.com", "protonmail.com", "zoho.com", "yandex.com",
  "live.com", "msn.com", "me.com", "gmx.com", "fastmail.com",
  "tutanota.com", "pm.me", "hey.com",
]);

function isPersonalEmail(domain: string): boolean {
  return PERSONAL_DOMAINS.has(domain);
}

function domainToCompany(domain: string): string {
  const name = domain.split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

interface ConversationInsights {
  messageCount: number;
  userMessageCount: number;
  avgMessageLength: number;
  mentionedPricing: boolean;
  mentionedDemo: boolean;
  mentionedIntegration: boolean;
  mentionedTimeline: boolean;
  sentiment: "positive" | "neutral" | "negative";
  engagementLevel: "high" | "medium" | "low";
  topTopics: string[];
}

function analyzeConversation(messages: { role: string; content: string; rating: number | null }[]): ConversationInsights {
  const userMessages = messages.filter((m) => m.role === "user");
  const allContent = userMessages.map((m) => m.content.toLowerCase()).join(" ");

  const pricingKeywords = ["price", "pricing", "cost", "budget", "afford", "plan", "subscription", "rate"];
  const demoKeywords = ["demo", "trial", "test", "try", "preview", "sample"];
  const integrationKeywords = ["integrate", "api", "connect", "setup", "implement", "configure"];
  const timelineKeywords = ["when", "timeline", "deadline", "urgent", "asap", "soon", "launch"];

  const mentionedPricing = pricingKeywords.some((k) => allContent.includes(k));
  const mentionedDemo = demoKeywords.some((k) => allContent.includes(k));
  const mentionedIntegration = integrationKeywords.some((k) => allContent.includes(k));
  const mentionedTimeline = timelineKeywords.some((k) => allContent.includes(k));

  const positiveWords = ["great", "excellent", "perfect", "love", "amazing", "fantastic", "awesome", "thanks", "helpful"];
  const negativeWords = ["bad", "terrible", "awful", "hate", "worst", "useless", "annoying", "frustrated"];

  const posCount = positiveWords.filter((w) => allContent.includes(w)).length;
  const negCount = negativeWords.filter((w) => allContent.includes(w)).length;
  const sentiment = posCount > negCount ? "positive" : negCount > posCount ? "negative" : "neutral";

  const avgLen = userMessages.length > 0 ? userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length : 0;
  const engagementLevel = userMessages.length >= 5 || avgLen > 100 ? "high" : userMessages.length >= 2 ? "medium" : "low";

  const topics: string[] = [];
  if (mentionedPricing) topics.push("pricing");
  if (mentionedDemo) topics.push("demo");
  if (mentionedIntegration) topics.push("integration");
  if (mentionedTimeline) topics.push("timeline");

  return {
    messageCount: messages.length,
    userMessageCount: userMessages.length,
    avgMessageLength: Math.round(avgLen),
    mentionedPricing,
    mentionedDemo,
    mentionedIntegration,
    mentionedTimeline,
    sentiment,
    engagementLevel,
    topTopics: topics,
  };
}

function calculateLeadScore(
  lead: { phone?: string | null; company?: string | null; email: string },
  messages: { role: string; content: string; rating: number | null }[],
  enrichment: Record<string, unknown>
): number {
  let score = 10;

  if (lead.phone) score += 15;
  if (lead.company) score += 10;
  if (!isPersonalEmail(lead.email.split("@")[1] || "")) score += 15;

  const userMsgs = messages.filter((m) => m.role === "user");
  if (userMsgs.length >= 5) score += 15;
  else if (userMsgs.length >= 3) score += 10;
  else if (userMsgs.length >= 1) score += 5;

  const positiveRatings = messages.filter((m) => m.rating && m.rating >= 4).length;
  if (positiveRatings > 0) score += 10;

  const insights = enrichment.conversationInsights as ConversationInsights | undefined;
  if (insights) {
    if (insights.mentionedPricing) score += 10;
    if (insights.mentionedDemo) score += 5;
    if (insights.mentionedTimeline) score += 5;
    if (insights.sentiment === "positive") score += 5;
    if (insights.engagementLevel === "high") score += 5;
  }

  return Math.min(100, Math.max(0, score));
}
