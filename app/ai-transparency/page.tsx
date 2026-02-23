import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  TrendingDown,
  Clock,
  CheckCircle2,
  Layers,
  Globe,
  BarChart3,
  Zap,
  UserCheck,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldBan,
  ShieldQuestion,
  Eye,
  EyeOff,
  Lock,
  Scale,
  MapPin,
  FileCheck,
  ScrollText,
  Users,
  Headphones,
  PhoneForwarded,
  Mic,
  MessageSquare,
  Timer,
  Volume2,
  AudioLines,
  Wallet,
  CreditCard,
  PiggyBank,
  ArrowRight,
  BookOpen,
  Lightbulb,
  Target,
  Activity,
  TrendingUp,
  CircleDot,
  Phone,
  Bot,
  ClipboardList,
  ArrowLeftRight,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "AI Transparency & Education | GoRigo",
  description:
    "Honest AI for honest business. Learn how GoRigo handles hallucination, RAG grounding, guardrails, data privacy, and the real benefits and limitations of AI call centres.",
  openGraph: {
    title: "AI Transparency & Education | GoRigo",
    description:
      "Honest AI for honest business. Learn how GoRigo handles hallucination, RAG grounding, guardrails, data privacy, and the real benefits and limitations of AI call centres.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Transparency & Education | GoRigo",
    description:
      "Honest AI for honest business. Learn how GoRigo handles hallucination, RAG grounding, guardrails, data privacy, and the real benefits and limitations of AI call centres.",
  },
  alternates: {
    canonical: "/ai-transparency",
  },
};

const benefitColors = [
  { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: "text-teal-500", bg: "bg-teal-500/10" },
  { icon: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
];

const benefits = [
  {
    icon: TrendingDown,
    title: "Cost Reduction",
    description:
      "Up to 80% cost reduction vs traditional call centres. No recruitment, training, sick days, or shift premiums. Pay only for the minutes your AI agents spend talking.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description:
      "Your AI agents never sleep. Every call answered in under 2 seconds, around the clock, 365 days a year. No night shifts, no holiday cover gaps.",
  },
  {
    icon: CheckCircle2,
    title: "Perfect Consistency",
    description:
      "Every caller gets the same professional experience. No bad days, no mood swings, no variation in script delivery. Your brand voice stays consistent across 10,000 calls.",
  },
  {
    icon: Layers,
    title: "Instant Scalability",
    description:
      "Handle 1 call or 10,000 simultaneously. Scale up for seasonal demand without hiring campaigns. Scale down without redundancy costs.",
  },
  {
    icon: Globe,
    title: "Multilingual Support",
    description:
      "Serve customers in 12+ languages with native-quality voice agents. No need to hire specialist language teams or outsource to offshore centres.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Every call is analysed for sentiment, quality, resolution status, and topic extraction. Dashboards update in real time \u2014 no waiting for weekly reports.",
  },
  {
    icon: Zap,
    title: "Speed to Deploy",
    description:
      "Go from sign-up to live AI agent in under an hour. Upload your knowledge base, configure your agent, and start taking calls. No 6-month implementation projects.",
  },
  {
    icon: UserCheck,
    title: "Personalisation at Scale",
    description:
      "AI agents access caller history, previous interactions, and knowledge bases to deliver personalised responses \u2014 something impossible with scripted human agents handling 100+ calls per day.",
  },
];

const limitations = [
  {
    title: "Emotional Complexity",
    description:
      "AI can detect sentiment (positive, negative, neutral) and escalate accordingly, but it cannot truly empathise. Grief, anger that needs de-escalation, or highly emotional situations are better handled by trained humans. GoRigo automatically detects these and triggers handoff.",
  },
  {
    title: "Hallucination Risk",
    description:
      "All large language models can generate plausible-sounding but incorrect information. This is not a bug \u2014 it is a fundamental property of how these models work. Without safeguards, an AI agent could confidently give wrong answers. (See our section on how we handle this.)",
  },
  {
    title: "Accent & Dialect Edge Cases",
    description:
      "Speech recognition has improved dramatically, but heavy regional accents, code-switching between languages mid-sentence, and very noisy environments can still cause misunderstandings. GoRigo uses confidence scoring to detect when it is struggling and prompts clarification.",
  },
  {
    title: "Novel Situations",
    description:
      "AI agents excel at handling scenarios they have been trained for. Truly novel, one-off situations that fall outside the knowledge base may require human judgement. This is why human handoff is not optional \u2014 it is essential.",
  },
  {
    title: "Regulatory Grey Areas",
    description:
      "AI can follow compliance rules precisely (DNC lists, disclosure requirements, data handling). But interpreting ambiguous regulatory situations or making judgement calls about legal edge cases requires human oversight.",
  },
  {
    title: "No Genuine Understanding",
    description:
      "AI processes patterns in language. It does not \"understand\" your business the way a veteran employee does. The quality of AI output is directly proportional to the quality of knowledge you provide it. Garbage in, garbage out.",
  },
];

const hallucinationColors = [
  { text: "text-emerald-500", bg: "bg-emerald-500/10" },
  { text: "text-blue-500", bg: "bg-blue-500/10" },
  { text: "text-violet-500", bg: "bg-violet-500/10" },
  { text: "text-rose-500", bg: "bg-rose-500/10" },
  { text: "text-amber-500", bg: "bg-amber-500/10" },
  { text: "text-teal-500", bg: "bg-teal-500/10" },
];

const hallucinationSteps = [
  {
    step: 1,
    title: "RAG-Only Grounding",
    description:
      "GoRigo AI agents are NOT permitted to answer from general knowledge. Every response must be grounded in your uploaded knowledge base, FAQs, or configured scripts. If the AI cannot find relevant information in your knowledge base, it will say so honestly rather than fabricate an answer.",
  },
  {
    step: 2,
    title: "Strict Knowledge Mode",
    description:
      "When enabled, the AI will ONLY respond using content from your knowledge base. If a caller asks something outside your documented information, the agent responds with: \"I don't have that information available, but I can connect you with someone who can help.\" No guessing. No improvisation.",
  },
  {
    step: 3,
    title: "Output Guard Validation",
    description:
      "Every AI response passes through our output guard before being spoken to the caller. This checks for: grounding violations (claims not supported by the knowledge base), response length limits, content safety, and format compliance. Responses that fail validation are replaced with safe fallbacks.",
  },
  {
    step: 4,
    title: "Prompt Injection Detection",
    description:
      "35+ attack patterns are screened before any input reaches the AI model. Jailbreak attempts, system prompt extraction, role manipulation, and social engineering attacks are blocked. Detected attacks are logged for security review.",
  },
  {
    step: 5,
    title: "PII Auto-Redaction",
    description:
      "Personal information (phone numbers, emails, addresses, National Insurance numbers) is automatically detected and redacted from transcripts and logs. Your callers' data is protected even from internal review.",
  },
  {
    step: 6,
    title: "Human Handoff as Safety Net",
    description:
      "When confidence drops below threshold, when sentiment turns negative, or when the caller explicitly requests a human, the AI hands off seamlessly. Handoff is not failure \u2014 it is the system working exactly as designed.",
  },
];

const ragCards = [
  {
    title: "Without RAG (Dangerous)",
    description:
      "The AI uses its general training data to answer questions. It may produce confident-sounding answers that are completely wrong for your business. It might quote the wrong prices, invent policies that don't exist, or give medical/legal advice it has no business giving.",
  },
  {
    title: "With RAG (GoRigo's Approach)",
    description:
      "Before answering, the AI searches YOUR knowledge base \u2014 your documents, FAQs, scripts, and policies. It constructs its response using only information it found in your materials. If nothing relevant exists, it says so.",
  },
  {
    title: "Why This is the 2026 Standard",
    description:
      "Every major enterprise AI deployment in 2026 uses RAG or equivalent grounding. Ungrounded AI in customer-facing applications is now considered negligent by industry bodies and increasingly by regulators. GoRigo was built RAG-first from day one.",
  },
];

const guardrailColors = [
  { icon: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: "text-teal-500", bg: "bg-teal-500/10" },
  { icon: "text-blue-500", bg: "bg-blue-500/10" },
];

const guardrails = [
  {
    icon: Shield,
    title: "Input Validation",
    description:
      "All inputs sanitised and validated before processing. SQL injection, XSS, and malformed data blocked at the edge.",
  },
  {
    icon: ShieldAlert,
    title: "Prompt Injection Detection",
    description:
      "Multi-pattern screening with 35+ attack signatures. Blocks jailbreaks, system prompt extraction, and role manipulation.",
  },
  {
    icon: ShieldCheck,
    title: "RAG Grounding",
    description:
      "Responses anchored to your knowledge base. No ungrounded claims permitted.",
  },
  {
    icon: ShieldBan,
    title: "Output Guard",
    description:
      "Post-generation validation checks grounding, length, safety, and format before any response reaches the caller.",
  },
  {
    icon: EyeOff,
    title: "PII Redaction",
    description:
      "Automatic detection and redaction of personal data from transcripts, logs, and analytics. Covers phone numbers, emails, addresses, NI numbers, and more.",
  },
  {
    icon: Activity,
    title: "Sentiment-Triggered Escalation",
    description:
      "Real-time sentiment analysis on every turn. Negative sentiment trends automatically trigger human handoff before situations escalate.",
  },
  {
    icon: ShieldQuestion,
    title: "Opt-Out Compliance",
    description:
      "Caller says \"stop calling me\" or similar phrases? Automatic DNC registration, call termination, and compliance logging. No human intervention needed.",
  },
];

const humanLoopColors = [
  { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: "text-violet-500", bg: "bg-violet-500/10" },
];

const humanLoopCards = [
  {
    icon: Bot,
    title: "When AI Handles It",
    description:
      "Routine enquiries, appointment scheduling, FAQ answers, order status checks, basic troubleshooting, callback scheduling, information collection. These represent 60-80% of call centre volume and are ideal for AI.",
  },
  {
    icon: Users,
    title: "When Humans Take Over",
    description:
      "Complex complaints, emotional situations, high-value negotiations, regulatory edge cases, multi-department coordination, and any scenario where the AI's confidence drops below threshold. GoRigo's handoff includes a context summary so the human agent doesn't start from scratch.",
  },
  {
    icon: Eye,
    title: "The Supervisor Model",
    description:
      "Managers can listen in to live AI calls, whisper coaching suggestions, or barge in to take over. This isn't surveillance \u2014 it's quality assurance and continuous improvement. AI handles volume; humans handle complexity.",
  },
];

const agentColors = [
  { icon: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: "text-violet-500", bg: "bg-violet-500/10" },
];

const agentTypes = [
  {
    icon: Phone,
    title: "Receptionist Agent",
    description:
      "Answers calls, routes enquiries, schedules appointments, takes messages. Warm, professional, efficient.",
  },
  {
    icon: Target,
    title: "Sales Agent",
    description:
      "Qualifies leads, presents offers, handles objections (within guardrails), books demos. Goal-oriented with configurable negotiation boundaries.",
  },
  {
    icon: Headphones,
    title: "Support Agent",
    description:
      "Troubleshoots issues, walks callers through solutions, logs tickets, escalates when stuck. Patient, thorough, resolution-focused.",
  },
  {
    icon: ClipboardList,
    title: "Survey Agent",
    description:
      "Conducts post-interaction surveys, collects feedback, measures CSAT. Neutral, consistent, non-leading.",
  },
];

const voiceColors = [
  { icon: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: "text-teal-500", bg: "bg-teal-500/10" },
];

const voiceComparisons = [
  {
    title: "Latency",
    text: "Users tolerate 2-3 second delays.",
    voice: "Anything over 500ms feels unnatural. GoRigo optimises for sub-second response times.",
    icon: Timer,
  },
  {
    title: "Interruption Handling",
    text: "Users wait for response.",
    voice: "Callers interrupt, speak over the AI, or change mid-sentence. GoRigo handles barge-in gracefully.",
    icon: MessageSquare,
  },
  {
    title: "Tone & Inflection",
    text: "Conveyed through punctuation and formatting.",
    voice: "Requires careful voice selection, pacing, and emphasis. GoRigo supports multiple voice profiles with natural prosody.",
    icon: Volume2,
  },
  {
    title: "Error Recovery",
    text: "Users can re-read and correct.",
    voice: "Misheard words are gone. GoRigo uses confidence scoring and asks for clarification when uncertain.",
    icon: ArrowLeftRight,
  },
  {
    title: "Ambient Noise",
    text: "Not a factor.",
    voice: "Background noise, speaker volume, phone quality all affect recognition. GoRigo adjusts sensitivity based on signal quality.",
    icon: AudioLines,
  },
];

const costColors = [
  { icon: "text-teal-500", bg: "bg-teal-500/10" },
  { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: "text-blue-500", bg: "bg-blue-500/10" },
];

const costItems = [
  {
    icon: Mic,
    title: "What \"Talk Time\" Means",
    description:
      "Every platform operation \u2014 calls, AI content generation, assistant queries, knowledge processing \u2014 is measured in talk-time equivalent minutes. This is what gets deducted from your prepaid wallet.",
  },
  {
    icon: CreditCard,
    title: "What You DON'T Pay For",
    description:
      "Server infrastructure, platform maintenance, software updates, security patches, compliance updates. These are GoRigo's costs, not yours.",
  },
  {
    icon: Wallet,
    title: "The Prepaid Wallet",
    description:
      "Top up your wallet, and usage is deducted automatically per operation. Real-time balance visible in your dashboard. Low-balance alerts before you run out.",
  },
];

const privacyColors = [
  { icon: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: "text-teal-500", bg: "bg-teal-500/10" },
];

const privacyCards = [
  {
    icon: MapPin,
    title: "UK Data Residency",
    description:
      "All data processed and stored in Azure UK South (London). Your data never leaves UK jurisdiction.",
  },
  {
    icon: Scale,
    title: "GDPR Ready",
    description:
      "Data minimisation, purpose limitation, right to erasure, consent management. Built into the platform architecture, not bolted on.",
  },
  {
    icon: EyeOff,
    title: "PII Auto-Redaction",
    description:
      "Personal information automatically redacted from transcripts before storage. Even internal reviews see redacted versions.",
  },
  {
    icon: FileCheck,
    title: "Consent-First",
    description:
      "AI disclosure at the start of every call. Callers always know they're speaking with an AI. This isn't just compliance \u2014 it's respect.",
  },
  {
    icon: ScrollText,
    title: "Audit Trails",
    description:
      "Every access, every change, every deletion logged with timestamps and user IDs. Complete accountability.",
  },
  {
    icon: Lock,
    title: "Multi-Tenant Isolation",
    description:
      "Your data is isolated from every other customer. Organisation-level access controls enforce strict boundaries.",
  },
];

const knowledgeColors = [
  { text: "text-emerald-500", bg: "bg-emerald-500/10" },
  { text: "text-blue-500", bg: "bg-blue-500/10" },
  { text: "text-violet-500", bg: "bg-violet-500/10" },
  { text: "text-amber-500", bg: "bg-amber-500/10" },
  { text: "text-rose-500", bg: "bg-rose-500/10" },
  { text: "text-teal-500", bg: "bg-teal-500/10" },
];

const knowledgeSteps = [
  {
    step: 1,
    title: "Gather Your Materials",
    description:
      "Collect everything your human agents use today: scripts, FAQ documents, product sheets, pricing guides, policy documents, training manuals. If a human agent would reference it, your AI agent needs it too.",
  },
  {
    step: 2,
    title: "Write Like You Talk",
    description:
      "AI agents speak your content out loud. Write FAQs in conversational tone, not corporate jargon. Instead of \"The organisation maintains a 30-day remittance policy\", write \"You can return items within 30 days for a full refund.\"",
  },
  {
    step: 3,
    title: "Cover the Common Questions",
    description:
      "List the top 20 questions your team gets asked. Write clear, concise answers for each. These become your FAQ entries \u2014 the fastest way to improve AI performance immediately.",
  },
  {
    step: 4,
    title: "Define Boundaries",
    description:
      "Tell the AI what NOT to do. \"Never quote prices above a certain amount without transferring to sales.\" \"Never give medical advice.\" \"Always offer to transfer for complaints.\" These boundaries prevent the AI from overstepping.",
  },
  {
    step: 5,
    title: "Include Your Pitch",
    description:
      "Your elevator pitch, value propositions, and key selling points should be in the knowledge base. When a caller asks \"Why should I choose you?\", the AI needs a compelling answer grounded in your actual differentiators.",
  },
  {
    step: 6,
    title: "Update Regularly",
    description:
      "Your knowledge base is a living document. When prices change, policies update, or new products launch, update the knowledge base. Stale information is worse than no information.",
  },
];

const practiceColors = [
  { icon: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: "text-teal-500", bg: "bg-teal-500/10" },
];

const bestPractices = [
  {
    icon: Target,
    title: "Start Small, Scale Fast",
    description:
      "Deploy one agent for one use case. Master it. Then expand. Don't try to replace your entire call centre on day one.",
  },
  {
    icon: BookOpen,
    title: "Monitor the First 100 Calls",
    description:
      "Review transcripts, check quality scores, identify gaps in knowledge base. The first 100 calls are your training data for improvement.",
  },
  {
    icon: Lock,
    title: "Use Strict Knowledge Mode Initially",
    description:
      "Start with strict mode on. It's better for the AI to say \"I don't know\" than to improvise. Loosen restrictions as your knowledge base matures.",
  },
  {
    icon: PhoneForwarded,
    title: "Set Up Human Handoff From Day One",
    description:
      "Don't go live without a handoff number. AI should always have a human safety net available. This isn't about distrust \u2014 it's about professionalism.",
  },
  {
    icon: Activity,
    title: "Review Sentiment Trends Weekly",
    description:
      "Falling sentiment scores are an early warning. They tell you where the AI is struggling before customers complain.",
  },
  {
    icon: Shield,
    title: "Keep Compliance Disclosure On",
    description:
      "It's tempting to hide the AI disclosure for a \"smoother\" experience. Don't. It's legally required in most jurisdictions and builds trust.",
  },
];

const metricColors = [
  { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: "text-teal-500", bg: "bg-teal-500/10" },
];

const metrics = [
  {
    icon: CheckCircle2,
    title: "Resolution Rate",
    description:
      "Percentage of calls resolved without human handoff. Target: 70-85% for mature deployments. Below 60% = knowledge base gaps.",
  },
  {
    icon: TrendingUp,
    title: "CSAT Prediction",
    description:
      "AI-predicted customer satisfaction score based on sentiment analysis and conversation flow. Correlates with actual CSAT surveys at 85%+ accuracy.",
  },
  {
    icon: BarChart3,
    title: "Quality Score",
    description:
      "Composite score (0-100) based on response accuracy, conversation flow, sentiment trajectory, and outcome. GoRigo breaks this into sub-components so you know exactly what to improve.",
  },
  {
    icon: Timer,
    title: "Average Handle Time",
    description:
      "How long calls last. Too short = AI may be dismissing callers. Too long = AI may be struggling with the query. Optimal range depends on your use case.",
  },
  {
    icon: PhoneForwarded,
    title: "Handoff Rate",
    description:
      "Percentage of calls transferred to humans. Zero handoff is NOT the goal \u2014 appropriate handoff is. Target depends on call complexity.",
  },
  {
    icon: Activity,
    title: "Sentiment Trajectory",
    description:
      "How sentiment changes during the call. Ideally neutral or positive trend. Consistent negative trajectories indicate systemic issues.",
  },
];

const myths = [
  {
    myth: "AI will say anything to callers",
    reality:
      "With RAG grounding and output guard, GoRigo AI can only say what's in your knowledge base. Ungrounded responses are architecturally blocked.",
  },
  {
    myth: "AI replaces all call centre jobs",
    reality:
      "AI handles routine volume (60-80% of calls). Humans handle complex, emotional, and high-value interactions. Most businesses redeploy staff to higher-value roles, not redundancy.",
  },
  {
    myth: "Callers hate talking to AI",
    reality:
      "2026 research shows 73% of callers prefer AI for simple queries (faster resolution, no hold times). Resistance is primarily for complex issues \u2014 which is exactly where human handoff activates.",
  },
  {
    myth: "AI can't handle accents",
    reality:
      "Modern speech recognition handles most accents well. GoRigo uses confidence scoring \u2014 when uncertain, it asks for clarification rather than guessing. Accuracy improves with each interaction.",
  },
  {
    myth: "AI is too expensive for small businesses",
    reality:
      "Talk-time billing means you only pay for usage. A business taking 50 calls a day can deploy AI for less than the cost of a part-time receptionist.",
  },
  {
    myth: "Setting up AI takes months",
    reality:
      "Upload your FAQs, configure your agent, assign a phone number. Most businesses go live in under an hour. Enterprise deployments with custom integrations take 1-2 weeks, not months.",
  },
  {
    myth: "AI data isn't secure",
    reality:
      "UK data residency, encryption at rest and in transit, PII auto-redaction, multi-tenant isolation, and audit trails. GoRigo's security posture exceeds most traditional call centres.",
  },
  {
    myth: "You need technical expertise to manage AI agents",
    reality:
      "GoRigo's dashboard is designed for business operators, not engineers. Upload documents, configure settings, review analytics \u2014 all through a visual interface. No coding required.",
  },
];

const sectionAnchors = [
  { id: "benefits", label: "Benefits" },
  { id: "limitations", label: "Limitations" },
  { id: "hallucination", label: "Hallucination" },
  { id: "rag-explained", label: "RAG Explained" },
  { id: "guardrails", label: "Guardrails" },
  { id: "human-in-the-loop", label: "Human-in-the-Loop" },
  { id: "multi-agent", label: "Multi-Agent" },
  { id: "voice-vs-text", label: "Voice vs Text" },
  { id: "cost-transparency", label: "Cost Transparency" },
  { id: "data-privacy", label: "Data Privacy" },
  { id: "knowledge-base", label: "Knowledge Base" },
  { id: "best-practices", label: "Best Practices" },
  { id: "measuring-performance", label: "Performance" },
  { id: "myths", label: "Myths" },
];

export default function AITransparencyPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-ai-transparency">
      <WebPageJsonLd
        title="AI Transparency & Education | GoRigo"
        description="Honest AI for honest business. Learn how GoRigo handles hallucination, RAG grounding, guardrails, data privacy, and the real benefits and limitations of AI call centres."
        url="/ai-transparency"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "AI Transparency", url: "/ai-transparency" },
        ]}
      />
      <Navbar />
      <Breadcrumbs items={[{ label: "AI Transparency" }]} />

      <section className="relative overflow-hidden" data-testid="section-transparency-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-teal-500/8 dark:from-emerald-500/5 dark:to-teal-500/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.10),transparent_65%)]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.06),transparent_70%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium tracking-wide border-emerald-500/30 text-emerald-600 dark:text-emerald-400" data-testid="badge-transparency">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            AI Transparency & Education
          </Badge>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            data-testid="text-transparency-hero-title"
          >
            Honest AI for honest business
            <br />
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-clip-text text-transparent">What we do, what we don&apos;t, and why it matters</span>
          </h1>
          <p
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
            data-testid="text-transparency-hero-subtitle"
          >
            GoRigo is committed to radical transparency about how our AI works, what it can and cannot do, and how we protect your business and your callers. This page is our open declaration.
          </p>
        </div>
      </section>

      <nav
        className="sticky top-14 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40"
        data-testid="nav-section-anchors"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {sectionAnchors.map((anchor) => (
              <a
                key={anchor.id}
                href={`#${anchor.id}`}
                className="text-xs text-muted-foreground whitespace-nowrap px-3 py-1.5 rounded-md transition-colors hover:text-foreground hover:bg-muted/50 shrink-0"
                data-testid={`anchor-${anchor.id}`}
              >
                {anchor.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <section id="benefits" className="py-24" data-testid="section-benefits">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Why AI Call Centres
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-benefits-title">
              Benefits of AI Call Centres
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card
                key={benefit.title}
                data-testid={`card-benefit-${benefit.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-md ${benefitColors[index].bg} mb-5`}>
                    <benefit.icon className={`h-5 w-5 ${benefitColors[index].icon}`} />
                  </span>
                  <h3 className="font-medium text-lg mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="limitations" className="relative py-24" data-testid="section-limitations">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.03] to-transparent dark:from-amber-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Honest Realities
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-limitations-title">
              What AI Cannot Do (Yet)
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
              We believe in setting proper expectations. AI call agents are powerful, but they are not magic. Here are the honest limitations you should know about before deploying any AI voice solution &mdash; ours or anyone else&apos;s.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {limitations.map((limitation, index) => (
              <Card
                key={limitation.title}
                data-testid={`card-limitation-${limitation.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-amber-500/10 mb-5">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </span>
                  <h3 className="font-medium text-lg mb-2">{limitation.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {limitation.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="hallucination" className="relative py-24" data-testid="section-hallucination">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] to-transparent dark:from-emerald-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Anti-Hallucination
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-hallucination-title">
              Our Anti-Hallucination Architecture
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
              This section serves as both an educational guide and our formal declaration of how GoRigo prevents AI fabrication.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hallucinationSteps.map((item, index) => (
              <Card
                key={item.step}
                data-testid={`card-hallucination-step-${item.step}`}
              >
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${hallucinationColors[index].bg} ${hallucinationColors[index].text} text-sm font-bold`}>
                      {item.step}
                    </span>
                    <h3 className="font-medium text-lg">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8">
            <Card data-testid="card-hallucination-declaration">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-emerald-500/10 shrink-0">
                    <Shield className="h-5 w-5 text-emerald-500" />
                  </span>
                  <div>
                    <Badge variant="outline" className="mb-3 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" data-testid="badge-declaration">
                      Declaration
                    </Badge>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      GoRigo commits to never deploying AI agents that operate without RAG grounding. General-purpose LLM responses without knowledge base anchoring are architecturally prevented at the platform level.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="rag-explained" className="relative py-24" data-testid="section-rag-explained">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] to-transparent dark:from-blue-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              RAG Explained
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-rag-title">
              What is RAG? (And Why It Matters for Your Business)
            </h2>
          </div>
          <Card className="mb-8" data-testid="card-rag-analogy">
            <CardContent className="p-8">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-amber-500/10 mb-5">
                <Lightbulb className="h-5 w-5 text-amber-500" />
              </span>
              <h3 className="font-medium text-lg mb-3">The Library Analogy</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Imagine you hire a new receptionist. They&apos;re intelligent, articulate, and great on the phone. But they know nothing about your business. If a customer calls and asks about your return policy, this receptionist has two choices: make something up that sounds plausible, or check the policy document first. RAG is the &ldquo;check the document first&rdquo; approach.
              </p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {ragCards.map((card, index) => {
              const ragCardColors = [
                { icon: "text-rose-500", bg: "bg-rose-500/10" },
                { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
                { icon: "text-blue-500", bg: "bg-blue-500/10" },
              ];
              return (
                <Card
                  key={card.title}
                  data-testid={`card-rag-${card.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`}
                >
                  <CardContent className="p-8">
                    <h3 className="font-medium text-lg mb-3">{card.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {card.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="guardrails" className="relative py-24" data-testid="section-guardrails">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.03] to-transparent dark:from-violet-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Safety Architecture
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-guardrails-title">
              Seven Layers of Protection
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {guardrails.map((item, index) => (
              <Card
                key={item.title}
                data-testid={`card-guardrail-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${guardrailColors[index].bg} ${guardrailColors[index].icon} text-sm font-bold`}>
                      {index + 1}
                    </span>
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${guardrailColors[index].bg}`}>
                      <item.icon className={`h-5 w-5 ${guardrailColors[index].icon}`} />
                    </span>
                  </div>
                  <h3 className="font-medium text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="human-in-the-loop" className="relative py-24" data-testid="section-human-in-the-loop">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/[0.03] to-transparent dark:from-teal-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Human-in-the-Loop
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-human-loop-title">
              AI + Humans: Better Together
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
              The 2026 standard is not &ldquo;replace humans with AI&rdquo;. It is &ldquo;augment humans with AI so they can focus on what humans do best&rdquo;.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {humanLoopCards.map((card, index) => (
              <Card
                key={card.title}
                data-testid={`card-human-loop-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-md ${humanLoopColors[index].bg} mb-5`}>
                    <card.icon className={`h-5 w-5 ${humanLoopColors[index].icon}`} />
                  </span>
                  <h3 className="font-medium text-lg mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="multi-agent" className="relative py-24" data-testid="section-multi-agent">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] to-transparent dark:from-blue-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Multi-Agent Orchestration
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-multi-agent-title">
              Specialised Agents, Not One Generic Bot
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
              GoRigo supports multiple agent types, each configured for specific roles with their own personality, knowledge base, and compliance rules.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {agentTypes.map((agent, index) => (
              <Card
                key={agent.title}
                data-testid={`card-agent-${agent.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-md ${agentColors[index].bg} mb-5`}>
                    <agent.icon className={`h-5 w-5 ${agentColors[index].icon}`} />
                  </span>
                  <h3 className="font-medium text-lg mb-2">{agent.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {agent.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground leading-relaxed max-w-3xl" data-testid="text-multi-agent-note">
            Each agent has its own personality, voice, language, knowledge base, and compliance rules. They&apos;re not generic chatbots with different names &mdash; they&apos;re purpose-built AI specialists.
          </p>
        </div>
      </section>

      <section id="voice-vs-text" className="relative py-24" data-testid="section-voice-vs-text">
        <div className="absolute inset-0 bg-gradient-to-b from-rose-500/[0.03] to-transparent dark:from-rose-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Voice AI Challenges
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-voice-title">
              Why Voice AI is Harder (And What We Do About It)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {voiceComparisons.map((item, index) => (
              <Card
                key={item.title}
                data-testid={`card-voice-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-md ${voiceColors[index].bg} mb-5`}>
                    <item.icon className={`h-5 w-5 ${voiceColors[index].icon}`} />
                  </span>
                  <h3 className="font-medium text-lg mb-3">{item.title}</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Text</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Voice</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.voice}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="cost-transparency" className="relative py-24" data-testid="section-cost-transparency">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/[0.03] to-transparent dark:from-teal-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Pricing Model
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-cost-title">
              How Our Pricing Actually Works
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {costItems.map((item, index) => (
              <Card
                key={item.title}
                data-testid={`card-cost-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`}
              >
                <CardContent className="p-8">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-md ${costColors[index].bg} mb-5`}>
                    <item.icon className={`h-5 w-5 ${costColors[index].icon}`} />
                  </span>
                  <h3 className="font-medium text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-8" data-testid="card-cost-comparison">
            <CardContent className="p-8">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-emerald-500/10 mb-5">
                <PiggyBank className="h-5 w-5 text-emerald-500" />
              </span>
              <h3 className="font-medium text-lg mb-3">Cost Comparison</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Traditional Call Centre</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    &pound;15-25 per agent per hour
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Offshore Outsourcing</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    &pound;5-12 per agent per hour
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">GoRigo AI</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Pennies per minute of actual conversation time
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="data-privacy" className="relative py-24" data-testid="section-data-privacy">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.03] to-transparent dark:from-violet-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Data Protection
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-privacy-title">
              Your Data, Protected
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {privacyCards.map((card, index) => (
              <Card
                key={card.title}
                data-testid={`card-privacy-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-md ${privacyColors[index].bg} mb-5`}>
                    <card.icon className={`h-5 w-5 ${privacyColors[index].icon}`} />
                  </span>
                  <h3 className="font-medium text-lg mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="knowledge-base" className="relative py-24" data-testid="section-knowledge-base">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] to-transparent dark:from-emerald-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Knowledge Base Guide
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-knowledge-title">
              Preparing Your AI Agent: A Non-Technical Guide
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
              The single biggest factor in AI agent performance is the quality of information you give it. Here&apos;s how to prepare yours.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {knowledgeSteps.map((item, index) => (
              <Card
                key={item.step}
                data-testid={`card-knowledge-step-${item.step}`}
              >
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${knowledgeColors[index].bg} ${knowledgeColors[index].text} text-sm font-bold`}>
                      {item.step}
                    </span>
                    <h3 className="font-medium text-lg">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-8" data-testid="card-knowledge-pro-tips">
            <CardContent className="p-8">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-amber-500/10 mb-5">
                <Lightbulb className="h-5 w-5 text-amber-500" />
              </span>
              <h3 className="font-medium text-lg mb-3">Pro Tips</h3>
              <ul className="space-y-2">
                <li className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                  <CircleDot className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-1" />
                  Keep answers under 3 sentences for voice delivery
                </li>
                <li className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                  <CircleDot className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-1" />
                  Include common misspellings and alternative phrasings
                </li>
                <li className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                  <CircleDot className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-1" />
                  Add context: &ldquo;If the caller asks about X, they usually also want to know about Y&rdquo;
                </li>
                <li className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                  <CircleDot className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-1" />
                  Test by calling your own AI agent and trying to break it
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="best-practices" className="relative py-24" data-testid="section-best-practices">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.03] to-transparent dark:from-amber-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Practical Guidance
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-best-practices-title">
              Getting the Most from Your AI Agents
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bestPractices.map((practice, index) => (
              <Card
                key={practice.title}
                data-testid={`card-practice-${practice.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-md ${practiceColors[index].bg} mb-5`}>
                    <practice.icon className={`h-5 w-5 ${practiceColors[index].icon}`} />
                  </span>
                  <h3 className="font-medium text-lg mb-2">{practice.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {practice.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="measuring-performance" className="relative py-24" data-testid="section-measuring-performance">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] to-transparent dark:from-blue-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              AI Metrics
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-metrics-title">
              What to Measure (And What It Means)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics.map((metric, index) => (
              <Card
                key={metric.title}
                data-testid={`card-metric-${metric.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-md ${metricColors[index].bg} mb-5`}>
                    <metric.icon className={`h-5 w-5 ${metricColors[index].icon}`} />
                  </span>
                  <h3 className="font-medium text-lg mb-2">{metric.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="myths" className="relative py-24" data-testid="section-myths">
        <div className="absolute inset-0 bg-gradient-to-b from-rose-500/[0.03] to-transparent dark:from-rose-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Setting the Record Straight
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-myths-title">
              Myths vs Reality
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {myths.map((item, index) => (
              <Card
                key={index}
                data-testid={`card-myth-${index + 1}`}
              >
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div>
                      <Badge variant="outline" className="mb-2 text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">Myth</Badge>
                      <p className="font-medium text-sm leading-relaxed">
                        &ldquo;{item.myth}&rdquo;
                      </p>
                    </div>
                    <div className="border-t border-border/50 pt-4">
                      <Badge variant="outline" className="mb-2 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Reality</Badge>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.reality}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-transparency-cta">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="text-3xl font-light tracking-tight mb-4"
            data-testid="text-transparency-cta-title"
          >
            Questions about our AI?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            We are happy to answer any questions about how our AI works, discuss specific use cases, or walk through our safety architecture in detail.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/contact">
              <Button size="lg" data-testid="button-transparency-contact">
                Talk to Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/trust">
              <Button variant="outline" size="lg" data-testid="button-transparency-trust">
                Trust Centre
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ConversionCta
        headline="Ready to See Honest AI in Action?"
        subheadline="Deploy AI voice agents grounded in your knowledge base, protected by seven layers of guardrails, and backed by transparent pricing. No surprises."
        primaryAction={{ label: "Get Started", href: "/register" }}
        secondaryAction={{ label: "View Pricing", href: "/pricing" }}
        talkToAiMessage="Talk to Our AI About Transparency"
      />
      <Footer />
    </div>
    </PublicLayout>
  );
}
