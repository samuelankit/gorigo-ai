# GoRigo - AI Call Center Platform

## Overview
GoRigo is an AI-powered call center platform designed to automate call center operations, provide comprehensive analytics, and manage a three-tier business hierarchy (Business Partners, Direct-to-Consumer, Affiliate Partners). The platform streamlines partner management, automates commission processing, and offers capabilities like multi-agent management, visual automation flow building, knowledge management, and robust call management with real-time monitoring. Its ambition is to be a fully automated, scalable solution for AI-driven call centers, with a strategic mobile-first approach.

## User Preferences
- Default to light mode (day vision), with dark mode (night vision) toggle available.
- Talk-time only billing model. Talk time = ALL platform usage (calls, AI content generation, assistant queries, knowledge processing). Server infrastructure is GoRigo's cost, not the customer's. Customer's prepaid wallet is deducted per operation. Margin is built into every transaction rate.
- AI disclosure on calls (compliance).
- Solo founder - automate everything, SuperAdmin Console for all analytics and operations.

## System Architecture

### UI/UX Decisions
The platform uses Next.js 16 (App Router) with Tailwind CSS and Shadcn/ui for components, and Recharts for data visualization. The dashboard features a collapsible left sidebar, a sticky top command bar, and a content workspace, emphasizing flat design, compact spacing, and table-first data views. The primary model is a React Native/Expo mobile app with AI voice control, complemented by a Web SaaS platform.

### Data Fetching
All dashboard pages use TanStack Query (React Query) v5 for data fetching and mutations. Key patterns:
- **QueryProvider** in `components/query-provider.tsx` wraps the app with default fetcher (uses queryKey[0] as URL) and `apiRequest` helper for mutations
- **useQuery** for all GET data loading, with `isLoading` for loading states
- **useMutation** with `queryClient.invalidateQueries()` for all POST/PUT/PATCH/DELETE operations, with `isPending` for button states
- **Custom queryFn** required for parameterized GET queries (with query params) using `apiRequest`
- **Blob downloads** (CSV export, PDF) kept as raw fetch since they're not JSON
- **Reusable hooks** in `hooks/use-agents.ts`, `hooks/use-flows.ts`, `hooks/use-knowledge.ts` for shared CRUD patterns
- **Config**: staleTime 30s, retry 1, refetchOnWindowFocus disabled
- All mutations must include `onError` with toast notification for consistency

### Technical Implementations
GoRigo uses PostgreSQL with Drizzle ORM and `pgvector` for embeddings. Authentication is session-based. AI functionalities leverage OpenAI via Replit AI Integrations, enhanced by a RAG system. A prepaid wallet system with atomic operations and row-level locks manages billing and commissions. Multi-tenancy is enforced via `orgId`, and Role-Based Access Control (`globalRole`) manages permissions. A 7-state Call State Machine handles call flows, integrated with Telnyx (primary) and Vonage (fallback). Background jobs process document chunking, embedding, and audio transcription. Security features include prompt injection detection and input validation. A distribution engine manages commissions and revenue sharing. A multi-agent system supports various AI agent types and visual flow diagram building. Compliance features include TCPA/FCC DNC management, PII auto-redaction, sentiment analysis, and call quality scoring. The system supports AI model fallback, multilingual capabilities, concurrent call limits, business hours, and outgoing webhooks.

The platform includes a Unit Economics System for real-time cost tracking and margin analysis, with a pricing simulator. An optional Rigo Voice Assistant provides AI voice control over the SaaS dashboard. Security hardening includes audit logging, robust session management, database-backed rate limiting, CSRF protection, email verification, account lockout, and comprehensive input validation using Zod schemas. Deployment utilizes Docker containers on Azure Container Apps with Azure PostgreSQL Flexible Server and Azure Key Vault. CI/CD is managed via GitHub Actions.

Key features include:
- **Deployment Packages**: Three commercial packages (Managed £0.20/min, White-Label £0.12/min, Custom Enterprise).
- **Agent Configuration**: Customizable AI agents with roles, FAQs, knowledge bases, and language/voice selection.
- **Knowledge Management**: Supports document upload, chunking, embedding, and audio transcription.
- **Multi-Tier Partner Management**: Business Partners can create resellers, D2C clients, and affiliate partners.
- **Affiliate Management**: Full CRUD for affiliate links, click tracking, and commission calculation.
- **Multi-Tier Distribution Engine**: Manages a commission waterfall.
- **Billing & Usage**: Talk-time only pricing, real-time wallet deductions, mid-call balance enforcement with grace periods, billing ledger, spending caps, Stripe for top-ups, automated refunds for platform failures, and hardened Stripe webhooks (failed payments, disputes, refunds).
- **Commission Distribution**: Multi-tier distribution engine with dead-letter handling and admin notifications for exhausted retries.
- **Analytics Deep-Dive**: A 6-tab dashboard with global date range picker for detailed insights.
- **Web Traffic Intelligence**: Custom-built analytics tracking system with PII auto-redaction.
- **International Calling System**: Includes country management, per-org telephony isolation, compliance engine, fraud detection, and currency conversion.
- **Smart Drafts AI Content Studio**: Draft generation for call scripts, email templates, SMS templates, and FAQ answers with version history, tone, and language options.
- **Business Continuity System**: Partner lifecycle management with states, agreements tracking, cascade engine for entity suspension/termination, client reassignment, commission settlement, data export, partner health monitoring, and orphan detection.
- **Lead Management System**: Full pipeline management with built-in enrichment engine, lead scoring, email dedup, and multi-tenant access.
- **Conversation Analytics (Enterprise)**: Deep call analytics with a 5-tab dashboard covering KPIs, sentiment, quality scores, agent scorecards, and topics/alerts.
- **Agent Assist (Enterprise)**: Real-time agent assist system with a 5-tab dashboard for live call monitoring, human agent management, assist sessions, coaching rules, and canned responses. Features supervisor modes, intelligent handoff, and knowledge search.
- **Voice Biometrics (Enterprise)**: Voice biometric authentication with a 4-tab dashboard.
- **Omnichannel Messaging (Enterprise)**: Unified messaging across WhatsApp, SMS, email, and web chat with a 5-tab dashboard.
- **Department & Team Management**: Organizational hierarchy with departments, role-based permissions, and employee invitation system.
- **System Monitoring**: Admin monitoring dashboard with real-time health metrics.
- **Blog Section**: Public blog with categories, articles, and SEO-friendly features.
- **AI Transparency & Education**: Comprehensive public page covering benefits, limitations, architecture, safety, human-in-the-loop design, data privacy, and best practices.
- **Cost Accounting Dashboard**: SuperAdmin 5-tab dashboard with real-time P&L, COGS breakdown, pricing advisor, fixed costs tracker, and UK tax compliance.
- **Content Studio**: Admin 3-tab dashboard with Industry Templates, Voice Profiles, and Case Studies management, including compliance disclaimers.
- **Public Case Studies**: SEO-optimised pages with ROI statistics, structured data, industry badges, testimonials, and CTA sections.
- **Rigo Jarvis Features**: Free voice assistant with personal productivity tools: reminders, notes, follow-ups, daily briefings, conversation memory, after-call AI summaries.
- **Transcript Archive**: SuperAdmin searchable transcript archive using PostgreSQL full-text search.
- **Low Balance Alerts**: Configurable wallet threshold alerts with SendGrid email notifications (6-hour cooldown), amber/red warning tiers.
- **Invoice/Receipt Generation**: Downloadable HTML receipts for wallet transactions with VAT breakdown, company details (International Business Exchange Limited, 15985956).
- **Public Status Page**: Real-time system health at /status with auto-refresh, monitoring Database, API, AI, Payments, Email, and Telephony services.
- **Self-Service Phone Numbers**: Browse and purchase Telnyx phone numbers from /dashboard/phone-numbers with wallet deduction.
- **Interactive Demo**: Public demo at /demo with pre-configured AI responses (no signup required, no LLM queries — compliance safe).
- **Multi-Currency Support**: GBP/EUR/USD conversion API with indicative exchange rates at /api/wallet/currency.
- **GDPR Data Export**: Full GDPR Article 15 compliant data export from Settings, including account, agents, calls, knowledge, billing, and data rights.
- **Data Source Connectors**: OAuth-first, mobile-first data connection system. Users connect data sources (Google Sheets, HubSpot via OAuth; CSV upload; Companies House auto-connected; Manual Entry) to import contacts for campaigns. BYOK (Bring Your Own Key) option for advanced users. Features: AES-256 encrypted credential storage (`lib/encryption.ts`), automatic OAuth token refresh, connector interest tracking for "Coming Soon" sources.
- **Wallet Fund Locking**: Atomic fund locking with row-level locks for campaign cost pre-approval. Available balance = balance - lockedBalance. Features: cost estimation with scaled orchestration fees, 80% cost cap enforcement (auto-pause), periodic excess fund release every 25 contacts, 24-hour lock expiry, fund release on cancellation. Transaction types: fund_lock, fund_charge, fund_release, fund_partial_release.
- **Campaign Wizard (Mobile-First)**: 3-step creation flow — Add Contacts (from any data source) → Configure & Estimate (agent, schedule, cost breakdown) → Approve & Start (consent checkbox required). Wizard state persists in localStorage. Bottom-sticky action bars on mobile. Inline OAuth connection from wizard.
- **Campaign Progress & Cost Cap**: Real-time progress monitoring with 10s polling, circular progress on mobile, stacked stat cards, cost tracker. Cost cap pauses campaign at 80% of locked funds. Stalled campaign detection (1hr auto-pause, 4hr auto-cancel). CSV export with mobile share sheet.

### Data Connector Architecture
- **Tables**: `data_connectors` (encrypted credentials, OAuth tokens, connector config), `connector_interest` (Coming Soon tracking)
- **Extended tables**: `campaigns` (+sourceConnectorId, estimatedCost, lockedAmount, costCapReached, consentConfirmed), `wallets` (+lockedBalance)
- **campaignContacts.campaignId**: Nullable — allows standalone contact imports from Data Sources page without a campaign
- **Encryption**: `lib/encryption.ts` — AES-256-GCM with HKDF key derivation from SESSION_SECRET
- **Phone normalisation**: `lib/phone-normalize.ts` — E.164 normalisation with UK default, column auto-detection
- **OAuth helpers**: `lib/oauth-google.ts`, `lib/oauth-hubspot.ts` — HMAC-signed state parameters, automatic token refresh, graceful revocation handling
- **API Routes** (Next.js App Router, all in `app/api/`):
  - `app/api/connectors/` — CRUD, test, interest tracking
  - `app/api/oauth/google/` and `app/api/oauth/hubspot/` — OAuth authorize/callback flows
  - `app/api/connectors/[id]/google-sheets/` — list, preview, import spreadsheets
  - `app/api/connectors/[id]/hubspot/` — contacts list, import
  - `app/api/connectors/csv/` — upload (parse/preview), confirm (create contacts)
  - `app/api/connectors/manual-entry/` — add contacts manually
  - `app/api/connectors/companies-house/` — search, add to campaign
  - `app/api/campaigns/[id]/` — estimate, approve, pause, resume, extend, progress, export
- **Connector types**: csv, companies_house, google_sheets, hubspot, manual, google_places, yelp, apollo, salesforce, pipedrive, airtable
- **Auth types**: none, api_key, oauth
- **Connector statuses**: active, inactive, error, expired, disconnected, pending_auth
- **Environment secrets needed**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, COMPANIES_HOUSE_API_KEY

## External Dependencies
- **AI Services**: OpenAI, Anthropic (via Replit AI Integrations).
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **UI Components**: Shadcn/ui.
- **Charting Library**: Recharts.
- **Telephony**: Telnyx (primary) + Vonage (fallback).
- **Payments**: Stripe.
- **Email**: SendGrid.
- **Mobile**: Expo SDK 54, expo-router, expo-speech, expo-av, expo-haptics.