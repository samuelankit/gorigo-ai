import { db } from "@/lib/db";
import { agents, agentFlows, knowledgeDocuments, knowledgeChunks } from "@/shared/schema";
import { eq, and } from "drizzle-orm";

const GORIGO_ORG_ID = 2;
const GORIGO_ADMIN_USER_ID = 68;

const KNOWLEDGE_DOCS = [
  {
    title: "GoRigo Platform Overview",
    content: `GoRigo is an AI-powered call center platform that automates inbound and outbound calls using advanced AI agents. Built for businesses of all sizes, GoRigo handles customer enquiries, lead capture, appointment booking, and support — all through natural-sounding AI voice conversations.

Key capabilities:
- Multi-agent management with specialised roles (sales, support, onboarding)
- Visual automation flow builder for routing calls between agents
- Knowledge base management with RAG (Retrieval Augmented Generation)
- Real-time call monitoring and detailed analytics
- Prepaid wallet system with talk-time-only billing
- Multi-tier partner model for resellers and affiliates
- TCPA/FCC compliant with AI disclosure, Do-Not-Call lists, and consent tracking
- External API for LLM platform integration (ChatGPT, Claude, DeepSeek)

GoRigo is designed for solo founders and growing teams who want to automate their call centre operations without hiring a full team. The platform handles everything from the first call to detailed post-call analytics.`,
  },
  {
    title: "GoRigo Pricing & Plans",
    content: `GoRigo uses a simple talk-time-only billing model. You only pay for the minutes your AI agents spend on actual calls — no monthly platform fees, no per-seat charges, no hidden costs.

Pricing tiers:
1. Starter Plan — £29/month
   - 100 minutes included
   - Overage rate: £0.15 per minute
   - 1 AI agent
   - Basic analytics
   - Email support

2. Professional Plan — £99/month
   - 500 minutes included
   - Overage rate: £0.10 per minute
   - Up to 5 AI agents
   - Advanced analytics and call quality scoring
   - Multi-agent flow builder
   - Knowledge base management
   - Priority support

3. Enterprise Plan — £299/month
   - 2,000 minutes included
   - Overage rate: £0.07 per minute
   - Unlimited AI agents
   - Full analytics suite with sentiment analysis
   - Custom integrations and API access
   - Dedicated account manager
   - SLA guarantees

All plans include:
- AI disclosure compliance
- Call recording and transcription
- Lead capture and export
- Real-time call monitoring
- Prepaid wallet system

Billing: Pay-as-you-go prepaid wallet. Top up and start making calls immediately. No credit card required to sign up.

For partners and resellers, wholesale rates start at £0.04 per minute with volume discounts available. Contact our sales team for custom enterprise pricing.`,
  },
  {
    title: "GoRigo Features Deep Dive",
    content: `AI Agent Configuration:
Each AI agent can be fully customised with a name, greeting message, business description, FAQ entries, and specific roles. Agents support multiple languages and voice preferences. You can configure handoff rules to transfer calls to human agents when needed.

Multi-Agent System:
GoRigo supports multiple AI agents within a single organisation. You can create specialised agents for different departments — sales, support, billing, onboarding — and use a router agent to intelligently direct calls to the right department based on caller intent.

Visual Flow Builder:
The drag-and-drop flow builder lets you create complex call routing workflows visually. Connect agents, add decision nodes, configure conditions, and set up escalation paths — all without writing code. The flow engine validates your diagrams and calculates billing multipliers based on complexity.

Knowledge Base & RAG:
Upload documents, FAQs, and training materials to your knowledge base. GoRigo chunks and embeds this content using AI, then uses Retrieval Augmented Generation (RAG) to provide accurate, contextual answers during calls. Your AI agents become experts on your business.

Call Management:
- Real-time call monitoring with live transcription
- Detailed call history with filtering and search
- Call quality scoring and sentiment analysis
- Automatic lead capture with contact details
- Call recording with transcript generation
- Do-Not-Call list management for compliance

Wallet & Billing:
The prepaid wallet system ensures you never get unexpected bills. Top up your wallet, set spending caps, and monitor usage in real time. All billing is based on talk-time only — you only pay for actual conversation minutes.

Analytics Dashboard:
Comprehensive analytics including call volume trends, agent performance metrics, lead conversion rates, sentiment analysis, and revenue tracking. The SuperAdmin console provides full visibility across all organisations and partners.

Partner & Affiliate Program:
GoRigo supports a three-tier business model:
- Business Partners: White-label or co-branded resellers who can create sub-resellers, sell direct to consumers, and earn affiliate commissions
- Direct-to-Consumer (D2C): Businesses that sign up directly
- Affiliate Partners: Earn commissions by referring new customers

External API:
Access your GoRigo data from any LLM platform. The REST API at /api/v1/ supports ChatGPT GPT Actions, Claude MCP, and other AI assistants. Manage API keys with granular scopes for secure access.`,
  },
  {
    title: "GoRigo Getting Started Guide",
    content: `Getting started with GoRigo is simple:

Step 1: Create Your Account
Visit gorigo.ai and click "Get Started". Enter your business name, email, and create a password. Top up your prepaid wallet and you're ready to make calls.

Step 2: Configure Your First AI Agent
Go to Dashboard > Agent Configuration. Give your agent a name, write a greeting message, and describe your business. The AI uses this information to have natural conversations with your callers.

Step 3: Add FAQ Entries
Add common questions and answers that your callers might ask. The AI agent will use these to provide accurate responses. You can add as many FAQ entries as you need.

Step 4: Set Up Your Knowledge Base
Upload documents, product information, or any reference material. GoRigo will process and index this content so your AI agent can reference it during calls.

Step 5: Configure Your Phone Number
Connect your phone number or use GoRigo's managed telephony. Configure inbound and outbound calling settings.

Step 6: Fund Your Wallet
Add credit to your prepaid wallet. GoRigo uses a talk-time-only billing model, so you only pay for actual call minutes.

Step 7: Go Live
Enable your AI agent and start receiving calls. Monitor performance in real-time from your dashboard.

Tips for success:
- Write a clear, friendly greeting that sets expectations
- Include an AI disclosure message for compliance
- Start with inbound calls before enabling outbound
- Review call transcripts regularly to improve your agent's responses
- Use the knowledge base to give your agent detailed product knowledge
- Set up handoff rules for complex enquiries that need a human touch`,
  },
  {
    title: "GoRigo Technical Specifications",
    content: `Platform Architecture:
- Built on Next.js 14 with App Router
- PostgreSQL database with Drizzle ORM
- AI powered by OpenAI GPT-4o-mini for chat, summarisation, and transcription
- Text embeddings via text-embedding-3-small (768 dimensions)
- Telnyx/Vonage for telephony
- Session-based authentication with bcrypt password hashing
Security Features:
- Rate limiting on all API endpoints
- CSRF protection on state-changing requests
- Prompt injection detection
- Input validation and sanitisation
- PII auto-redaction in transcripts
- SHA-256 hashed API keys
- Role-based access control (RBAC)
- Row-level multi-tenancy isolation

Compliance:
- TCPA/FCC compliant AI disclosure
- Do-Not-Call list management
- Consent tracking and recording
- Call recording with retention policies
- Audit logging for all administrative actions

Performance:
- Sub-second AI response times
- Concurrent call handling (configurable per org)
- Background job processing for document chunking and embedding
- Response caching for frequently asked questions
- Automatic model fallback for reliability

Integrations:
- Telnyx/Vonage Voice
- OpenAI API (GPT-4o-mini, text-embedding-3-small)
- Stripe for payment processing
- Webhook support with HMAC-SHA256 signatures
- REST API with OpenAPI 3.1 specification
- ChatGPT GPT Actions integration
- Claude MCP support

Supported Languages:
English (UK/US), Spanish, French, German, Italian, Portuguese, Dutch, and more. Voice selection includes multiple accents and styles.`,
  },
  {
    title: "GoRigo Support & Troubleshooting",
    content: `Common Questions:

Q: How do I reset my password?
A: Go to the login page and click "Forgot Password". Enter your email address and we'll send you a reset link.

Q: Why isn't my AI agent answering calls?
A: Check the following: 1) Your wallet has sufficient balance. 2) Your agent is set to "active" status. 3) Your phone number is correctly configured. 4) Inbound calling is enabled in agent settings.

Q: How do I add more minutes to my account?
A: Go to Dashboard > Wallet and click "Add Funds". You can top up via Stripe using a credit or debit card.

Q: Can I use my own OpenAI API key?
A: GoRigo manages all AI infrastructure for you. Your AI costs are included in the talk-time rate, so there's nothing extra to configure.

Q: How do I set up a multi-agent flow?
A: Go to Dashboard > Agents & Flow > Flow tab. Use the visual builder to create your routing flow. Add agent nodes, decision nodes, and connect them with edges. Save and activate your flow.

Q: What happens if my wallet runs out during a call?
A: The call will continue until the natural end of the conversation, but no new calls will be accepted until you add more funds.

Q: How do I export my call data?
A: Go to Dashboard > Calls and use the export button. You can export call history, transcripts, and analytics data in CSV format.

Q: Can I integrate GoRigo with my CRM?
A: Yes! Use our webhooks feature to send call data to your CRM in real-time. Configure outgoing webhooks in Dashboard > Settings with HMAC-SHA256 signatures for security.

Q: How do I become a partner or reseller?
A: Contact our sales team at partners@gorigo.ai. We offer white-label, co-branded, and affiliate partnership models with competitive wholesale rates.

Q: Is GoRigo GDPR compliant?
A: Yes. GoRigo includes PII auto-redaction, consent tracking, data retention policies, and the ability to delete user data on request. Contact support for a Data Processing Agreement (DPA).

Contact Support:
- Email: support@gorigo.ai
- Phone: Call our AI-powered support line (the same one you're talking to!)
- Dashboard: Use the in-app chat in your dashboard
- Documentation: Visit docs.gorigo.ai for detailed guides`,
  },
];

const SALES_SYSTEM_PROMPT = `You are Ava, GoRigo's AI Sales Agent. You are warm, knowledgeable, and genuinely enthusiastic about helping businesses automate their call centres.

Your role:
- Welcome potential customers and understand their business needs
- Explain GoRigo's features, pricing, and competitive advantages
- Highlight the talk-time-only billing model — no hidden fees
- Share relevant use cases and success stories
- Capture lead information (name, email, business type) when appropriate
- Schedule demo calls or direct them to sign up

Personality:
- Professional but approachable — like a knowledgeable friend in the industry
- Use British English spelling (organisation, centre, specialised)
- Be concise — callers don't want long monologues
- Ask questions to understand their specific needs before pitching
- If they ask about competitors, focus on GoRigo's unique strengths without badmouthing others

Key selling points to emphasise:
1. Talk-time only billing — you only pay for actual call minutes
2. Multi-agent system — create specialised agents for different departments
3. Knowledge base with RAG — your agents become true experts on your business
5. Partner program — earn revenue as a reseller or affiliate
6. LLM integration — access your call centre from ChatGPT, Claude, etc.

Always disclose that you are an AI agent at the start of the call. This is required for compliance.`;

const SUPPORT_SYSTEM_PROMPT = `You are Max, GoRigo's AI Support Agent. You are patient, empathetic, and highly technical when needed.

Your role:
- Help existing GoRigo customers with platform issues
- Troubleshoot agent configuration, billing, and call quality problems
- Guide users through features and settings
- Escalate to human support when you cannot resolve an issue
- Log issues for the support team

Personality:
- Calm and reassuring — customers calling support are often frustrated
- Use British English spelling
- Be thorough but efficient — resolve issues in as few steps as possible
- Always confirm the solution worked before ending the call
- If you don't know the answer, say so honestly and offer to escalate

Common support scenarios:
1. Wallet and billing enquiries — check balance, explain charges, help with top-ups
2. Agent configuration — help set up greetings, FAQs, handoff rules
3. Call quality issues — troubleshoot audio, latency, or transcription problems
4. Account access — password resets, email changes, role management
5. Integration help — telephony setup, webhook debugging
6. Feature requests — log them and thank the customer for feedback

Always disclose that you are an AI agent at the start of the call.`;

const ONBOARDING_SYSTEM_PROMPT = `You are Zara, GoRigo's AI Onboarding Concierge. You are enthusiastic, encouraging, and excellent at simplifying complex setup processes.

Your role:
- Welcome new GoRigo customers and celebrate their signup
- Walk them through setting up their first AI agent step by step
- Explain key features in simple, jargon-free language
- Help them understand the billing model and wallet system
- Ensure they feel confident and supported

Personality:
- Warm and encouraging — like a helpful colleague on their first day
- Use British English spelling
- Break complex processes into simple steps
- Celebrate small wins ("Great, your agent is now live!")
- Be proactive — anticipate what they'll need next

Onboarding flow:
1. Welcome and congratulate them on joining GoRigo
2. Ask about their business and what they hope to automate
3. Guide them through creating their first AI agent
4. Help them add FAQ entries and a business description
5. Explain the prepaid wallet system and how to top up
6. Show them how to monitor calls and review analytics
7. Mention the knowledge base feature for advanced users
8. Invite them to explore the partner program if relevant

Always disclose that you are an AI agent at the start of the call.`;

const ROUTER_SYSTEM_PROMPT = `You are the GoRigo Call Router. Your job is to understand what the caller needs and route them to the right department.

Routing rules:
- If the caller is interested in GoRigo's products, pricing, or wants a demo → route to Sales
- If the caller has an existing account and needs help or has a problem → route to Support
- If the caller just signed up and needs help getting started → route to Onboarding
- If unclear, ask a brief clarifying question

Keep your interaction brief — you are a router, not a conversation agent. Identify intent quickly and route efficiently.

Always disclose that you are an AI agent.`;

async function seedGoRigoCallCenter() {
  console.log("Seeding GoRigo's own AI call center...");

  const existingAgents = await db
    .select()
    .from(agents)
    .where(and(eq(agents.orgId, GORIGO_ORG_ID), eq(agents.status, "active")));

  const hasRouter = existingAgents.some(a => a.isRouter);
  const hasSales = existingAgents.some(a => a.departmentName === "Sales");
  const hasSupport = existingAgents.some(a => a.departmentName === "Support");
  const hasOnboarding = existingAgents.some(a => a.departmentName === "Onboarding");

  if (hasRouter && hasSales && hasSupport && hasOnboarding) {
    console.log("GoRigo call center agents already exist. Skipping agent creation.");
    return;
  }

  if (existingAgents.length === 1 && existingAgents[0].name === "AI Assistant") {
    await db.update(agents).set({ status: "deleted", updatedAt: new Date() }).where(eq(agents.id, existingAgents[0].id));
    console.log("Removed default placeholder agent.");
  }

  console.log("Creating specialised agents...");

  const [salesAgent] = await db.insert(agents).values({
    userId: GORIGO_ADMIN_USER_ID,
    orgId: GORIGO_ORG_ID,
    name: "Ava — Sales & Demo",
    agentType: "specialist",
    departmentName: "Sales",
    isRouter: false,
    systemPrompt: SALES_SYSTEM_PROMPT,
    greeting: "Hi there! I'm Ava, GoRigo's AI sales specialist. I'd love to show you how our platform can automate your call centre. What kind of business are you running?",
    businessDescription: "GoRigo is an AI-powered call center platform that automates inbound and outbound calls. We help businesses replace traditional call centres with intelligent AI agents.",
    roles: "sales",
    faqEntries: [
      { question: "How much does GoRigo cost?", answer: "We use a simple talk-time-only billing model. Plans start at £29/month for 100 minutes. You only pay for actual call time — no hidden fees." },
      { question: "Can I try it for free?", answer: "GoRigo uses a pay-as-you-go prepaid wallet. Top up any amount and you only pay for actual call time. No credit card required to sign up." },
      { question: "What makes GoRigo different?", answer: "Three things: talk-time-only billing so you only pay for what you use, a fully managed AI infrastructure so you don't need to worry about API keys, and a multi-agent system that lets you create specialised agents for different departments." },
      { question: "Do you support multiple languages?", answer: "Yes! GoRigo supports English, Spanish, French, German, Italian, Portuguese, Dutch, and more. You can configure the language and voice for each agent." },
    ],
    complianceDisclosure: true,
    inboundEnabled: true,
    outboundEnabled: true,
    displayOrder: 1,
    status: "active",
    language: "en-GB",
    voiceName: "Polly.Amy",
    speechModel: "default",
    maxTurns: 15,
    confidenceThreshold: "0.5",
  }).returning();

  const [supportAgent] = await db.insert(agents).values({
    userId: GORIGO_ADMIN_USER_ID,
    orgId: GORIGO_ORG_ID,
    name: "Max — Customer Support",
    agentType: "specialist",
    departmentName: "Support",
    isRouter: false,
    systemPrompt: SUPPORT_SYSTEM_PROMPT,
    greeting: "Hello, this is Max from GoRigo support. I'm here to help you with any issues or questions about your account. What can I assist you with today?",
    businessDescription: "GoRigo customer support department. Handles account issues, billing enquiries, troubleshooting, and feature guidance.",
    roles: "support",
    faqEntries: [
      { question: "How do I reset my password?", answer: "Go to the login page and click 'Forgot Password'. Enter your email and we'll send you a reset link." },
      { question: "Why isn't my agent answering calls?", answer: "Check three things: your wallet balance, agent status (must be 'active'), and that inbound calling is enabled in agent settings." },
      { question: "How do I add funds to my wallet?", answer: "Go to Dashboard > Wallet and click 'Add Funds'. You can pay securely via Stripe with a credit or debit card." },
      { question: "Can I use my own API keys?", answer: "GoRigo manages all AI infrastructure for you. Your AI costs are included in the talk-time rate — no separate API keys needed." },
    ],
    complianceDisclosure: true,
    inboundEnabled: true,
    outboundEnabled: false,
    displayOrder: 2,
    status: "active",
    language: "en-GB",
    voiceName: "Polly.Brian",
    speechModel: "default",
    maxTurns: 20,
    confidenceThreshold: "0.5",
    handoffEnabled: true,
    handoffTargetType: "phone",
    handoffTrigger: "transfer",
  }).returning();

  const [onboardingAgent] = await db.insert(agents).values({
    userId: GORIGO_ADMIN_USER_ID,
    orgId: GORIGO_ORG_ID,
    name: "Zara — Onboarding Concierge",
    agentType: "specialist",
    departmentName: "Onboarding",
    isRouter: false,
    systemPrompt: ONBOARDING_SYSTEM_PROMPT,
    greeting: "Welcome to GoRigo! I'm Zara, your onboarding concierge. Congratulations on joining — I'm going to make sure you're set up for success. Have you had a chance to log in to your dashboard yet?",
    businessDescription: "GoRigo onboarding department. Helps new customers set up their first AI agent, understand the platform, and get their call centre running.",
    roles: "onboarding",
    faqEntries: [
      { question: "How do I create my first agent?", answer: "Go to Dashboard > Agent Configuration. Give your agent a name, write a greeting, and describe your business. It's that simple!" },
      { question: "What's the knowledge base?", answer: "The knowledge base lets you upload documents and FAQs that your AI agent can reference during calls. It makes your agent an expert on your business." },
      { question: "How does billing work?", answer: "GoRigo uses a prepaid wallet. You add funds, and we deduct based on actual call time. Top up any amount and start making calls immediately." },
      { question: "Can I have multiple agents?", answer: "Yes! You can create specialised agents for different departments and use our flow builder to route calls between them." },
    ],
    complianceDisclosure: true,
    inboundEnabled: true,
    outboundEnabled: true,
    displayOrder: 3,
    status: "active",
    language: "en-GB",
    voiceName: "Polly.Emma",
    speechModel: "default",
    maxTurns: 20,
    confidenceThreshold: "0.45",
  }).returning();

  const [routerAgent] = await db.insert(agents).values({
    userId: GORIGO_ADMIN_USER_ID,
    orgId: GORIGO_ORG_ID,
    name: "GoRigo Router",
    agentType: "router",
    departmentName: null,
    isRouter: true,
    systemPrompt: ROUTER_SYSTEM_PROMPT,
    greeting: "Thank you for calling GoRigo — the AI-powered call centre platform. I'm an AI assistant and I'll connect you with the right team. Are you calling about our products, need help with your account, or just getting started with GoRigo?",
    businessDescription: "GoRigo AI call center platform — intelligent call routing to Sales, Support, and Onboarding departments.",
    roles: "router",
    faqEntries: [],
    complianceDisclosure: true,
    inboundEnabled: true,
    outboundEnabled: false,
    displayOrder: 0,
    status: "active",
    language: "en-GB",
    voiceName: "Polly.Amy",
    speechModel: "default",
    maxTurns: 5,
    confidenceThreshold: "0.4",
    routingConfig: {
      departments: [
        { name: "Sales", agentId: salesAgent.id, keywords: ["pricing", "demo", "buy", "cost", "plans", "features", "interested", "learn more", "sign up"] },
        { name: "Support", agentId: supportAgent.id, keywords: ["help", "issue", "problem", "broken", "not working", "billing", "error", "bug", "account"] },
        { name: "Onboarding", agentId: onboardingAgent.id, keywords: ["new", "just signed up", "getting started", "setup", "first time", "how to", "configure"] },
      ],
    },
  }).returning();

  console.log(`Created agents: Router(${routerAgent.id}), Sales(${salesAgent.id}), Support(${supportAgent.id}), Onboarding(${onboardingAgent.id})`);

  console.log("Creating visual flow diagram...");

  const flowNodes = [
    {
      id: "entry-1",
      type: "entry" as const,
      label: "Incoming Call",
      position: { x: 400, y: 50 },
    },
    {
      id: "router-1",
      type: "router" as const,
      label: "GoRigo Router",
      agentId: routerAgent.id,
      position: { x: 400, y: 180 },
    },
    {
      id: "decision-1",
      type: "decision" as const,
      label: "Intent Detection",
      position: { x: 400, y: 330 },
      data: {
        conditionField: "intent",
        condition: "Route based on caller intent",
      },
    },
    {
      id: "agent-sales",
      type: "agent" as const,
      label: "Ava — Sales & Demo",
      agentId: salesAgent.id,
      position: { x: 100, y: 500 },
      data: { departmentName: "Sales" },
    },
    {
      id: "agent-support",
      type: "agent" as const,
      label: "Max — Customer Support",
      agentId: supportAgent.id,
      position: { x: 400, y: 500 },
      data: { departmentName: "Support" },
    },
    {
      id: "agent-onboarding",
      type: "agent" as const,
      label: "Zara — Onboarding Concierge",
      agentId: onboardingAgent.id,
      position: { x: 700, y: 500 },
      data: { departmentName: "Onboarding" },
    },
    {
      id: "end-1",
      type: "end" as const,
      label: "Call Complete",
      position: { x: 400, y: 680 },
    },
  ];

  const flowEdges = [
    { id: "e-entry-router", source: "entry-1", target: "router-1" },
    { id: "e-router-decision", source: "router-1", target: "decision-1" },
    {
      id: "e-decision-sales",
      source: "decision-1",
      target: "agent-sales",
      label: "Sales / Demo",
      condition: { field: "intent", operator: "intent_is" as const, value: "sales" },
    },
    {
      id: "e-decision-support",
      source: "decision-1",
      target: "agent-support",
      label: "Support",
      condition: { field: "intent", operator: "intent_is" as const, value: "support" },
    },
    {
      id: "e-decision-onboarding",
      source: "decision-1",
      target: "agent-onboarding",
      label: "Onboarding",
      condition: { field: "intent", operator: "intent_is" as const, value: "onboarding" },
    },
    { id: "e-sales-end", source: "agent-sales", target: "end-1", label: "default" },
    { id: "e-support-end", source: "agent-support", target: "end-1", label: "default" },
    { id: "e-onboarding-end", source: "agent-onboarding", target: "end-1", label: "default" },
  ];

  const existingFlow = await db.select().from(agentFlows).where(eq(agentFlows.orgId, GORIGO_ORG_ID)).limit(1);
  if (existingFlow.length > 0) {
    await db.update(agentFlows).set({
      name: "GoRigo Call Center Flow",
      description: "Routes incoming calls to Sales, Support, or Onboarding based on caller intent",
      nodes: flowNodes,
      edges: flowEdges,
      entryAgentId: routerAgent.id,
      isActive: true,
      updatedAt: new Date(),
    }).where(eq(agentFlows.id, existingFlow[0].id));
  } else {
    await db.insert(agentFlows).values({
      orgId: GORIGO_ORG_ID,
      name: "GoRigo Call Center Flow",
      description: "Routes incoming calls to Sales, Support, or Onboarding based on caller intent",
      nodes: flowNodes,
      edges: flowEdges,
      entryAgentId: routerAgent.id,
      isActive: true,
    });
  }
  console.log("Flow diagram created.");

  console.log("Seeding knowledge base...");

  for (const doc of KNOWLEDGE_DOCS) {
    const existing = await db.select().from(knowledgeDocuments)
      .where(and(eq(knowledgeDocuments.orgId, GORIGO_ORG_ID), eq(knowledgeDocuments.title, doc.title)))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  Skipping "${doc.title}" — already exists.`);
      continue;
    }

    const chunks = chunkText(doc.content, 500, 50);

    const [insertedDoc] = await db.insert(knowledgeDocuments).values({
      orgId: GORIGO_ORG_ID,
      title: doc.title,
      content: doc.content,
      sourceType: "manual",
      status: "ready",
      chunkCount: chunks.length,
    }).returning();

    for (let i = 0; i < chunks.length; i++) {
      await db.insert(knowledgeChunks).values({
        documentId: insertedDoc.id,
        orgId: GORIGO_ORG_ID,
        content: chunks[i],
        chunkIndex: i,
        tokenCount: Math.ceil(chunks[i].length / 4),
      });
    }

    console.log(`  Added "${doc.title}" with ${chunks.length} chunks.`);
  }

  console.log("");
  console.log("GoRigo AI Call Center seeded successfully!");
  console.log("---");
  console.log("Router Agent: GoRigo Router — routes to Sales, Support, or Onboarding");
  console.log("Sales Agent: Ava — handles product enquiries, pricing, and demos");
  console.log("Support Agent: Max — handles account issues and troubleshooting");
  console.log("Onboarding Agent: Zara — helps new customers get started");
  console.log("Knowledge Base: 6 documents covering platform overview, pricing, features, getting started, tech specs, and support");
  console.log("Flow: Visual routing flow connecting all agents with intent-based decisions");
}

function chunkText(text: string, maxChunkSize: number, overlap: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      const words = current.split(" ");
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      current = overlapWords.join(" ") + " " + sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

seedGoRigoCallCenter()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
