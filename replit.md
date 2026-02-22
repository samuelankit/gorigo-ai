# GoRigo - AI Call Center Platform

## Company Details
- **Company Name**: International Business Exchange Limited
- **Companies House Number**: 15985956
- **Registered Address**: Cotton Court Business Centre, Preston, PR1 3BY, England
- **Website**: https://gorigo.ai

## Overview
GoRigo is an AI-powered call center platform designed to automate call center operations, provide comprehensive analytics, and manage a three-tier business hierarchy (Business Partners, Direct-to-Consumer, Affiliate Partners). The platform streamlines partner management via a SuperAdmin Console, automates commission processing, and offers capabilities like multi-agent management, visual automation flow building, knowledge management, and robust call management with real-time monitoring. Its ambition is to be a fully automated, scalable solution for AI-driven call centers, with a strategic mobile-first approach.

## User Preferences
- Default to light mode (day vision), with dark mode (night vision) toggle available.
- Talk-time only billing model. Talk time = ALL platform usage (calls, AI content generation, assistant queries, knowledge processing). Server infrastructure is GoRigo's cost, not the customer's. Customer's prepaid wallet is deducted per operation. Margin is built into every transaction rate.
- AI disclosure on calls (compliance).
- Solo founder - automate everything, SuperAdmin Console for all analytics and operations.

## System Architecture

### UI/UX Decisions
The platform uses Next.js 14 (App Router) with Tailwind CSS and Shadcn/ui for components, and Recharts for data visualization. Dark mode is the default, inspired by Azure Portal/Fluent Design. The dashboard features a collapsible left sidebar, a sticky top command bar, and a content workspace, emphasizing flat design, compact spacing, and table-first data views. The primary model is a React Native/Expo mobile app with AI voice control, complemented by a Web SaaS platform.

### Mobile App (React Native / Expo)
The mobile app, located in `/mobile/`, uses Expo Router and features a dual-input design (voice and text), TTS toggle, biometric lock, offline support, push notifications, and haptic feedback. It supports white-label branding and includes detail screens for calls, wallet, and business switching. Authentication uses Bearer tokens stored via expo-secure-store (with AsyncStorage fallback). The mobile API client (`mobile/lib/api.ts`) shares the same backend as the web app. Backend middleware bypasses CSRF for Bearer token mobile requests.

**Mobile Screens (5 visible tabs + 2 hidden):**
- Dashboard: Metrics cards (calls, agents, balance, revenue), quick actions, recent activity
- Calls: Search, paginated FlatList, call detail navigation, pull-to-refresh
- Agents: Agent list with status toggles, expandable detail, avatar initials
- Wallet: Balance hero card, monthly usage breakdown, transaction history
- Settings (More): Profile, account, business switching, theme, sign out
- Rigo (hidden): AI voice/text assistant
- Activity (hidden): Activity feed

### Technical Implementations
GoRigo uses PostgreSQL with Drizzle ORM and `pgvector` for embeddings. Authentication is session-based. AI functionalities leverage OpenAI via Replit AI Integrations, enhanced by a RAG system. A prepaid wallet system with atomic operations and row-level locks manages billing and commissions. Multi-tenancy is enforced via `orgId`, and Role-Based Access Control (`globalRole`) manages permissions. A 7-state Call State Machine handles call flows, integrated with Telnyx (primary) and Vonage (fallback) via `lib/voice-provider.ts`. Background jobs process document chunking, embedding, and audio transcription. Security features include prompt injection detection and input validation. A distribution engine manages commissions and revenue sharing. A multi-agent system supports various AI agent types and visual flow diagram building. Compliance features include TCPA/FCC DNC management, PII auto-redaction, sentiment analysis, and call quality scoring. The system supports AI model fallback, multilingual capabilities, concurrent call limits, business hours, and outgoing webhooks.

The platform includes a Unit Economics System for real-time cost tracking and margin analysis, with a pricing simulator. An optional Rigo Voice Assistant provides AI voice control over the SaaS dashboard. Security hardening includes audit logging, robust session management, database-backed rate limiting, CSRF protection, email verification, account lockout, and comprehensive input validation using Zod schemas. Deployment utilizes Docker containers on Azure Container Apps with Azure PostgreSQL Flexible Server and Azure Key Vault. CI/CD is managed via GitHub Actions.

Key features include:
- **Deployment Packages**: Four commercial packages (Managed, BYOK, Self-Hosted, Custom) selected during onboarding.
- **Agent Configuration**: Customizable AI agents with roles, FAQs, knowledge bases, and language/voice selection.
- **Knowledge Management**: Supports document upload, chunking, embedding, and audio transcription.
- **Multi-Tier Partner Management**: Business Partners can create resellers, D2C clients, and affiliate partners.
- **Affiliate Management**: Full CRUD for affiliate links, click tracking, and commission calculation.
- **Multi-Tier Distribution Engine**: Manages a commission waterfall.
- **Billing & Usage**: Talk-time only pricing, real-time wallet deductions, billing ledger, spending caps, and Stripe for top-ups.
- **Analytics Deep-Dive**: A 6-tab dashboard with global date range picker for detailed insights.
- **Web Traffic Intelligence**: Custom-built analytics tracking system with PII auto-redaction, dashboards for overview, user journeys, and AI insights.
- **International Calling System**: Includes country management, per-org telephony isolation, compliance engine, fraud detection, and currency conversion.
- **Smart Drafts AI Content Studio**: Draft generation for call scripts, email templates, SMS templates, and FAQ answers with version history, tone, and language options.
- **Business Continuity System**: Partner lifecycle management with states, agreements tracking, cascade engine for entity suspension/termination, client reassignment, commission settlement, data export, partner health monitoring, and orphan detection.
- **Lead Management System**: Full pipeline management with built-in enrichment engine, lead scoring, email dedup, and multi-tenant access.
- **Conversation Analytics (Enterprise)**: Deep call analytics with a 5-tab dashboard covering KPIs, sentiment, quality scores, agent scorecards, and topics/alerts.
- **Agent Assist (Enterprise)**: Real-time agent assist system with a 5-tab dashboard for live call monitoring, human agent management, assist sessions, coaching rules, and canned responses. Features supervisor modes, intelligent handoff, and knowledge search.
- **Voice Biometrics (Enterprise)**: Voice biometric authentication with a 4-tab dashboard for analytics, voiceprint management, fraud detection, and configuration.
- **Omnichannel Messaging (Enterprise)**: Unified messaging across WhatsApp, SMS, email, and web chat with a 5-tab dashboard for unified inbox, contacts, channel management, message templates, and billing rules.
- **Department & Team Management**: Organizational hierarchy with departments, role-based permissions, and employee invitation system.
- **System Monitoring**: Admin monitoring dashboard with real-time health metrics, Recharts, and Azure monitoring alerts.
- **Blog Section**: Public blog at `/blog` with categories, articles, and SEO-friendly features.
- **AI Transparency & Education**: Comprehensive public page at `/ai-transparency` covering benefits, limitations, architecture, safety, human-in-the-loop design, data privacy, and best practices.
- **Cost Accounting Dashboard**: SuperAdmin 5-tab dashboard at `/admin/cost-accounting` with real-time P&L (revenue, COGS, gross/operating/net profit), COGS breakdown by provider with daily trends, pricing advisor with per-customer-type recommendations and break-even analysis, fixed costs tracker (Azure, Telnyx, Vonage, Namecheap, Replit), and UK tax compliance (Corporation Tax with marginal relief, HMRC expense categorisation, VAT threshold monitoring at £85,000). No VAT registration yet — prices are VAT-exclusive, future-proofed. Core engine: `lib/cost-accounting.ts`.
- **Content Studio**: Admin 3-tab dashboard at `/admin/content-studio` with Industry Templates (150 templates across 15 industries, 10 types: inbound/outbound call scripts, email, SMS, FAQ, voicemail, hold, IVR, escalation, follow-up), Voice Profiles (5 presets: soft, straight, professional, warm, urgent with TTS parameters), and Case Studies management. Industry compliance disclaimers for regulated sectors (NHS/CQC, SRA, FCA, Ofcom). All templates include AI disclosure statements.
- **Public Case Studies**: SEO-optimised pages at `/case-studies` and `/case-studies/{slug}` with ROI statistics, structured data (JSON-LD), industry badges, testimonials, and CTA sections. 15 industries covered with specific case studies for healthcare, legal, real estate, financial services, and e-commerce/retail.
- **Rigo Jarvis Features**: Voice assistant enhanced with personal productivity tools — all FREE (no wallet deduction). Tables: `rigo_reminders`, `rigo_notes`, `rigo_follow_ups`, `rigo_conversations`. Features: set/list/complete reminders, take/list notes with auto-tagging, schedule/list/complete follow-ups, daily briefings (calls, follow-ups, wallet, agents), conversation memory persistence across sessions, after-call AI summaries. Core library: `lib/rigo-jarvis.ts`. REST APIs: `/api/rigo/reminders`, `/api/rigo/notes`, `/api/rigo/follow-ups`, `/api/calls/summary`. Intents detected via regex in `detectJarvisIntent()` and handled before wallet deduction.
- **Transcript Archive**: SuperAdmin searchable transcript archive at `/admin/transcripts`. PostgreSQL full-text search (tsvector/GIN index) on `call_logs.transcript` column. Features: keyword search with `ts_headline` highlighting, date range/agent/direction filters, paginated results, transcript detail modal with metadata (sentiment, quality score, duration, summary). API: `/api/admin/transcripts`. Server-side HTML sanitisation on highlighted snippets to prevent XSS. SuperAdmin-only access enforced.

## Integration Status (Updated Feb 2026)
- **Stripe**: Fully connected via Replit connector + STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET env secrets as backup. Wallet top-ups, webhooks, and withdrawals operational. Code: `lib/stripe-client.ts`, `lib/stripe-connect.ts`.
- **Email (SendGrid)**: Fully connected. SENDGRID_API_KEY stored as secret. Sender verified (hello@gorigo.ai) with domain authentication. Code: `lib/email.ts`. Templates: verification, password reset, welcome, invitation.
- **Telnyx (Primary Voice)**: Locked in as primary voice provider. SDK: `telnyx` npm package. Code: `lib/telnyx.ts`. Env vars: TELNYX_API_KEY, TELNYX_CONNECTION_ID, TELNYX_PHONE_NUMBER, TELNYX_PUBLIC_KEY. Features: outbound/inbound calls, call control (answer, hangup, speak, gather, transfer, bridge), number search/ordering, webhook validation. Cost: ~£0.007/min UK. Per-second billing. Own private IP network for lower latency. EU data centres for GDPR compliance. **Pending: API key from user.**
- **Vonage (Fallback Voice)**: Fallback voice provider. UK-based company (Ericsson, London HQ) — all voice data stays in UK. SDK: `@vonage/server-sdk` + `@vonage/voice` npm packages. Code: `lib/vonage.ts`. Webhook: `app/api/vonage/voice/route.ts`. Env vars: VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_APPLICATION_ID, VONAGE_PRIVATE_KEY, VONAGE_PHONE_NUMBER, VONAGE_SIGNATURE_SECRET. Features: outbound/inbound calls, NCCO-based call control (talk, input, connect, record, stream), TTS, DTMF, transfer, webhook JWT+SHA256 validation. Cost: ~£0.008/min UK (per-second billing). **Pending: API credentials from user.**
- **Voice Provider Manager**: `lib/voice-provider.ts` manages provider selection. PRIMARY_VOICE_PROVIDER env var controls routing (default: telnyx). Providers: Telnyx (primary, £0.007/min) + Vonage (fallback, £0.008/min). Automatic failover: if primary fails, routes to fallback. Outbound calls in `app/api/calls/outbound/route.ts` use provider-agnostic `makeOutboundCall()` from voice-provider.ts. Both providers are UK/EU data-resident. Twilio fully removed from codebase.
- **AI Services**: OpenAI, Anthropic, OpenRouter connected via Replit AI Integrations. RAG grounding enforced — no raw LLM queries without knowledge base context.
- **Hydration Fix**: ROI calculator page uses deterministic formatters (formatGBP, formatPercent, formatNumber) instead of locale-dependent Intl APIs to prevent SSR/client mismatch.

## External Dependencies
- **AI Services**: OpenAI, Anthropic, OpenRouter (via Replit AI Integrations).
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **UI Components**: Shadcn/ui.
- **Charting Library**: Recharts.
- **Telephony**: Telnyx (primary, `telnyx` npm) + Vonage (fallback, `@vonage/server-sdk` + `@vonage/voice` npm). Twilio fully removed.
- **Payments**: Stripe.
- **Email**: SendGrid (@sendgrid/mail).
- **Mobile**: Expo SDK 54, expo-router, expo-speech, expo-av, expo-haptics.