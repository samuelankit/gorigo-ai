import { db } from "@/lib/db";
import { platformKnowledgeChunks } from "@/shared/schema";
import { sql, eq } from "drizzle-orm";
import { generateEmbeddings } from "@/lib/rag";

const RETRIEVAL_SIMILARITY_THRESHOLD = 0.35;
const MAX_RETRIEVAL_CHUNKS = 5;

const GORIGO_KNOWLEDGE: Array<{ category: string; content: string }> = [
  {
    category: "company",
    content: "GoRigo is an AI-powered call centre platform based in the United Kingdom. The company is operated by International Business Exchange Limited, UK Company Number 15985956. Contact email: hello@gorigo.ai. The platform enables businesses to automate their call centre operations using AI voice agents.",
  },
  {
    category: "product",
    content: "GoRigo provides AI voice agents that answer business calls 24/7 with natural conversation. The platform supports inbound and outbound calling. Users can run their entire AI call centre from their phone using the Rigo voice assistant. The mobile app is available for Managed and BYOK deployment packages.",
  },
  {
    category: "pricing",
    content: "GoRigo uses a talk-time only billing model. Businesses pay only for actual talk time used by AI agents on calls. There are no seat licences, monthly subscriptions, or per-agent fees. Users top up a prepaid wallet and costs are deducted per second of call time. Detailed pricing is available at the /pricing page on the website.",
  },
  {
    category: "deployment",
    content: "GoRigo offers four deployment packages: Managed (GoRigo handles everything, mobile app included), BYOK - Bring Your Own Key (use your own AI API keys, mobile app included), Self-Hosted (deploy on your own infrastructure, web only), and Custom (tailored enterprise solutions, web only). Each package has different levels of control and support.",
  },
  {
    category: "features",
    content: "GoRigo features include: AI voice agents with natural conversation, real-time analytics dashboard with sentiment analysis and quality scoring, knowledge base management for training agents, multi-language support for 30+ languages with automatic detection, call recording and transcription, lead capture during calls, call state machine with 7 states for conversation flow, and visual automation flow building.",
  },
  {
    category: "compliance",
    content: "GoRigo is UK compliant with built-in GDPR support, Do Not Call (DNC) list checking, consent management, PII auto-redaction on transcripts, AI disclosure on calls (the agent identifies itself as AI), TCPA/FCC compliance features, and calling hours enforcement. The platform includes fraud detection for international calls.",
  },
  {
    category: "mobile",
    content: "GoRigo's primary interface is a mobile app with the tagline 'Run Your AI Call Centre From Your Phone'. The app features voice command control through the Rigo assistant, a dashboard with stats and wallet balance, call management, agent management, and settings. The mobile app uses React Native with Expo and supports white-label branding for partners.",
  },
  {
    category: "capabilities",
    content: "GoRigo handles thousands of concurrent calls with consistent quality. AI agents can perform receptionist duties, sales qualification, appointment booking, FAQ answering, and lead capture. Agents support customisable greetings, business descriptions, FAQ entries, negotiation guardrails, and human handoff when callers request to speak with a person.",
  },
  {
    category: "analytics",
    content: "GoRigo provides a comprehensive analytics dashboard with six tabs: call overview, trends, activity, sentiment analysis, quality scoring, and agent performance. Real-time monitoring shows active calls with fraud alerts. The dashboard includes a global date range picker for filtering historical data.",
  },
  {
    category: "partners",
    content: "GoRigo supports a three-tier business hierarchy: Business Partners, Direct-to-Consumer clients, and Affiliate Partners. Business Partners can create resellers and manage their own client base. A multi-tier distribution engine manages commission waterfall from customer payment to platform remainder. White-label branding is available for partners.",
  },
  {
    category: "security",
    content: "GoRigo includes comprehensive security features: prompt injection detection to prevent AI manipulation, anti-jailbreak protections on all AI agents, PII auto-redaction on call transcripts, audit logging for critical events, tiered rate limiting across all API endpoints, input validation using Zod schemas, session management with idle timeout and absolute expiry, and wallet balance checks before AI operations.",
  },
  {
    category: "getting_started",
    content: "To get started with GoRigo: 1) Register an account at /register on the website, 2) Configure your first AI agent with a greeting, business description, and FAQ entries, 3) Upload knowledge base documents to train the agent, 4) Connect your phone number via Twilio integration, 5) Top up your wallet to start receiving calls. For demos or sales enquiries, visit /contact or call the AI line.",
  },
  {
    category: "technical",
    content: "GoRigo uses PostgreSQL with vector embeddings for its RAG (Retrieval-Augmented Generation) system. AI agents are powered by multiple LLM providers with automatic failover. The platform supports Twilio Programmable Voice for telephony. A 7-state call state machine manages conversation flow: GREETING, INTENT_CAPTURE, CONFIRM, EXECUTE, CLOSE, HANDOFF, and FAILSAFE.",
  },
  {
    category: "international",
    content: "GoRigo supports international calling with country-specific compliance profiles and rate cards. The platform includes Twilio sub-account isolation for clients, a compliance engine for DNC checks and calling hours, fraud detection for suspicious patterns, and currency conversion. Campaign management supports contact import with E.164 phone number validation and DNC pre-screening.",
  },
];

export async function seedPlatformKnowledge(): Promise<{ seeded: number; skipped: boolean }> {
  try {
    const [existing] = await db
      .select({ total: sql<number>`count(*)` })
      .from(platformKnowledgeChunks);

    if (Number(existing.total) >= GORIGO_KNOWLEDGE.length) {
      return { seeded: 0, skipped: true };
    }

    await db.delete(platformKnowledgeChunks);

    const contents = GORIGO_KNOWLEDGE.map((k) => k.content);
    let embeddings: number[][] = [];
    try {
      embeddings = await generateEmbeddings(contents);
    } catch (err) {
      console.warn("[Platform Knowledge] Embedding generation failed, seeding without embeddings:", err);
      embeddings = contents.map(() => []);
    }

    let seeded = 0;
    for (let i = 0; i < GORIGO_KNOWLEDGE.length; i++) {
      const entry = GORIGO_KNOWLEDGE[i];
      const embedding = embeddings[i]?.length > 0 ? embeddings[i] : null;
      await db.insert(platformKnowledgeChunks).values({
        category: entry.category,
        content: entry.content,
        embedding,
      });
      seeded++;
    }

    console.log(`[Platform Knowledge] Seeded ${seeded} knowledge chunks`);
    return { seeded, skipped: false };
  } catch (err) {
    console.error("[Platform Knowledge] Seeding failed:", err);
    return { seeded: 0, skipped: false };
  }
}

export async function searchPlatformKnowledge(
  query: string,
  limit: number = MAX_RETRIEVAL_CHUNKS
): Promise<{ content: string; similarity: number; category: string }[]> {
  const { generateEmbedding } = await import("@/lib/rag");
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const results = await db.execute(sql`
    SELECT 
      pkc.content,
      pkc.category,
      1 - (pkc.embedding <=> ${embeddingStr}::vector) as similarity
    FROM platform_knowledge_chunks pkc
    WHERE pkc.embedding IS NOT NULL
      AND 1 - (pkc.embedding <=> ${embeddingStr}::vector) > ${RETRIEVAL_SIMILARITY_THRESHOLD}
    ORDER BY pkc.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  return (results.rows as any[]).map((r) => ({
    content: r.content as string,
    similarity: parseFloat(r.similarity as string),
    category: r.category as string,
  }));
}

export function buildPlatformRAGContext(
  retrievedChunks: { content: string; similarity: number; category: string }[]
): string {
  if (retrievedChunks.length === 0) return "";

  let context = "\n\nRelevant GoRigo Information:";
  retrievedChunks.forEach((chunk, i) => {
    context += `\n[${i + 1}] (${chunk.category}) ${chunk.content}`;
  });

  return context;
}

export function getPlatformKnowledgeFallback(): string {
  return GORIGO_KNOWLEDGE.map((k) => `[${k.category}] ${k.content}`).join("\n\n");
}
