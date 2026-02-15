# GoRigo - AI Call Center Platform

## Overview
GoRigo is an AI-powered call center platform designed to automate call center operations, provide comprehensive analytics, and manage a three-tier business hierarchy (Business Partners, Direct-to-Consumer, Affiliate Partners). The platform streamlines partner management via a SuperAdmin Console, automates commission processing, and offers capabilities like multi-agent management, visual automation flow building, knowledge management, and robust call management with real-time monitoring. Its ambition is to be a fully automated, scalable solution for AI-driven call centers.

## User Preferences
- Default to light mode (day vision), with dark mode (night vision) toggle available.
- Talk-time only billing model.
- AI disclosure on calls (compliance).
- Solo founder - automate everything, SuperAdmin Console for all analytics and operations.

## System Architecture

### UI/UX Decisions
The platform uses Next.js 14 (App Router) with Tailwind CSS and Shadcn/ui for components, and Recharts for data visualization. Dark mode is the default, inspired by Azure Portal/Fluent Design, using Segoe UI, Inter, and Cascadia Code typography. The primary color is Microsoft Azure blue. The dashboard features a collapsible left sidebar, a sticky top command bar, and a content workspace, emphasizing flat design, compact spacing, and table-first data views.

### Technical Implementations
GoRigo uses PostgreSQL with Drizzle ORM and `pgvector` for embeddings. Authentication is session-based with `bcryptjs`. AI functionalities leverage OpenAI via Replit AI Integrations, enhanced by a RAG system. A prepaid wallet system with atomic operations and row-level locks manages billing and commissions. Multi-tenancy is enforced via `orgId`, and Role-Based Access Control (`globalRole`) manages permissions. A 7-state Call State Machine handles call flows, integrated with Twilio Programmable Voice. Background jobs process document chunking, embedding, and audio transcription. Security features include prompt injection detection and input validation. A distribution engine manages commissions and revenue sharing. A multi-agent system supports various AI agent types and visual flow diagram building. Compliance features include TCPA/FCC DNC management, PII auto-redaction, sentiment analysis, and call quality scoring. The system supports AI model fallback, multilingual capabilities, concurrent call limits, business hours, and outgoing webhooks.

Enterprise-grade infrastructure components include: LLM Fallback Router, Database Hardening, Global Error Handler, Autopilot Health Monitor, Rate Limiting, Security Middleware, CI/CD Pipeline, Real-Time Call Monitoring, Infrastructure Dashboard, Notification System, Admin Client Management, Automation Controls, Platform Settings Console, Admin Revenue Dashboard, Admin Notification Center, Admin Audit Log, Admin Wallets, Admin Compliance Centre, Admin Affiliate Management, Admin Knowledge Management, Admin Campaign Management, Admin Call Monitoring, Admin Agent Overview, Admin API Key Management, External API Layer, Finance Module, Getting Started Guide, Feature Detail Pages, Partner Pages, Public Website, Public AI Chat Widget, and Rigo Voice Assistant.

### Rigo Voice Assistant (Feb 2026)
- **Concept**: Optional AI voice-controlled layer on top of the SaaS dashboard. Users can manage their call centre entirely by voice from their phone.
- **Architecture**: Floating mic button in dashboard layout (`components/dashboard/rigo-assistant.tsx`), backed by `/api/rigo` endpoint. Uses Web Speech API (SpeechRecognition for input, SpeechSynthesis for output) in the browser, with LLM processing via the existing `callLLM` router.
- **Billing**: Each voice interaction costs £0.01 (1p), deducted atomically from the user's wallet BEFORE LLM processing using `rigo_assistant` reference type. If deduction fails, request is rejected with 402. Logged to billing ledger and distribution engine. First greeting per session is FREE.
- **Auto-Refund**: If the LLM call fails after wallet deduction, the system automatically refunds the user via `refundToWallet` and logs the failure. Users see "Your wallet has been refunded" in the error response.
- **Observability**: Every Rigo interaction is logged to the audit log (`rigo.interaction` action) with intent category, latency, success/failure, model used, and cost. Enables analytics on voice usage patterns.
- **Rate Limiting**: Dedicated `rigoLimiter` at 10 requests/minute (separate from the general AI limiter of 20/min) to protect against wallet drain and AI cost spikes.
- **Browser Support**: Rigo FAB is hidden on browsers that lack Web Speech API support (Firefox, older Safari). Only shows on Chrome, Edge, and compatible browsers.
- **Capabilities**: Rigo can query call statistics (today/all-time), wallet balance, agent configurations, campaign status, and provide general platform guidance. Context is gathered dynamically from the database based on user intent detection.
- **Key Files**: `app/api/rigo/route.ts` (backend), `components/dashboard/rigo-assistant.tsx` (UI component).
- **States**: idle, listening, processing, speaking, error. Visual feedback for each state with colour-coded mic button.
- **Design**: The SaaS dashboard works independently — Rigo is purely additive. Users who prefer the visual dashboard never need to use voice.

### Security Hardening (Feb 2026)
- **Audit Logging**: All auth events (login success/fail, register, logout, password reset request/complete) are logged to the `audit_log` table via `lib/audit.ts`. Wallet and profile changes also logged.
- **Session Management**: 30-day absolute session timeout, 2-hour idle timeout, max 5 concurrent sessions per user with oldest eviction. Sessions endpoint at `/api/auth/sessions` for listing, individual revocation, and "invalidate all" functionality. Background cleanup every 5 minutes.
- **Rate Limiting**: All ~140 API endpoints protected with appropriate rate limiters (auth: 10/min, general: 100/min, admin: 30/min, AI: 20/min, Rigo: 10/min, settings: 5/min, billing: 10/min, exports: 5/min).
- **Microphone Policy**: `Permissions-Policy` header allows `microphone=(self)` for Rigo voice input. Camera and geolocation remain blocked.
- **Admin Refund Interface**: SuperAdmin can issue refunds from `/admin/wallets` page via the Refund button on each wallet row. Refunds are logged to audit trail with actor identity.
- **Input Validation**: Zod schemas enforce strict validation on agent updates, knowledge creation, wallet topups, and profile changes. Sanitization utility at `lib/sanitize.ts`.
- **Password Reset**: Full flow with hashed tokens (SHA-256), 1-hour expiry, rate limiting, and all sessions invalidated on reset. Pages at `/forgot-password` and `/reset-password`.
- **Email Verification**: Required for outbound calls, AI chat, and campaign creation. Hashed tokens, 24-hour expiry.
- **Cookie Consent**: GDPR-compliant banner with Essential/Analytics/Marketing toggles. Script gating via `lib/cookie-scripts.ts` — analytics and marketing scripts only load after user consent.
- **CSRF Protection**: Origin/Referer checking in middleware.
- **API Endpoint Security**: All endpoints require authentication. 4 previously unprotected routes secured.

### Feature Specifications
- **Deployment Packages**: Four commercial packages (Managed, BYOK, Self-Hosted, Custom) selected during onboarding, affecting billing rates.
- **Agent Configuration**: Customizable AI agents with roles, FAQs, knowledge bases, and language/voice selection.
- **Knowledge Management**: Supports document upload, chunking, embedding, and audio transcription.
- **Multi-Tier Partner Management**: Business Partners can create resellers, D2C clients, and affiliate partners.
- **Affiliate Management**: Full CRUD for affiliate links, click tracking, and commission calculation.
- **Multi-Tier Distribution Engine**: Manages a commission waterfall from customer payment to platform remainder.
- **Billing & Usage**: Talk-time only pricing, real-time wallet deductions, billing ledger, spending caps, and Stripe for top-ups.
- **Analytics Deep-Dive**: A 6-tab dashboard with global date range picker for detailed insights into calls, trends, activity, sentiment, quality, and agents.

### International Calling System (Sections B-J)
- **Country Management**: 20 countries seeded (UK, US, FR, DE, IN, CA, AU, ES, IT, NL, JP, BR, MX, AE, SG, ZA, IE, SE, CH, PL) with compliance profiles, rate cards, and holiday calendars. Admin CRUD at `/admin/countries`.
- **Twilio Sub-Account Isolation**: Per-org sub-accounts for client isolation. API at `/api/admin/twilio-sub-accounts`. Sub-account credentials resolved via `getTwilioConfigForSubAccount()` in `lib/twilio.ts`.
- **Compliance Engine** (`lib/compliance-engine.ts`): Country-aware DNC checking, calling hours enforcement by timezone/holidays, AI disclosure in 12 languages, recording consent modes, opt-out detection in 8 languages. Wired into outbound call initiation and Twilio gather/voice flows.
- **Fraud Detection** (`lib/fraud-engine.ts`): Velocity checks (calls/minute/hour/day), failed call pattern detection, destination risk scoring (high-risk countries, premium rate prefixes), daily spend limit monitoring. Integrated into outbound call flow.
- **Currency Conversion** (`lib/currency.ts`): Exchange rates for 15 currencies, formatting, country-to-currency mapping for display.
- **International Analytics**: Admin API at `/api/admin/international` with country-level call stats, compliance metrics, sub-account summaries. Dashboard at `/admin/international` with 5 tabs.
- **Campaign Management**: Full CRUD at `/api/campaigns` and `/api/campaigns/[id]`. Contact import via `/api/campaigns/[id]/contacts/import` with E.164 validation, country auto-detection from phone prefixes (20 countries), DNC pre-screening, and duplicate handling. Status transitions (draft→active→paused→completed) via `/api/campaigns/[id]/status`. Contact list with pagination and status filtering at `/api/campaigns/[id]/contacts`. User dashboard at `/dashboard/campaigns` (list + creation dialog with international fields) and `/dashboard/campaigns/[id]` (detail view with stats, contact table, import flow, start/pause/resume controls). Uses `campaign_contacts` table for per-contact tracking.
- **Client Onboarding**: International setup flow with country selection, deployment model, and provisioning. API at `/api/onboarding/international`.
- **Operations Dashboard**: Real-time call monitoring at `/admin/operations` with 3 tabs (Live Calls, System Health, Alerts). Auto-refresh, country filters, fraud alert display.

### Key International Libraries
- `lib/compliance-engine.ts` — Full pre-call compliance checks, disclosure text, opt-out handling, voice config per country
- `lib/fraud-engine.ts` — Velocity limits, fraud scoring, spend tracking
- `lib/currency.ts` — Multi-currency conversion and formatting
- `lib/twilio.ts` — Extended with `getTwilioConfigForSubAccount()` for sub-account credential resolution

### Deployment Architecture
- **Development**: Replit (Next.js dev server on port 5000, Replit PostgreSQL)
- **Production**: Azure UK South region with Docker containerization, Azure Container Registry, Azure Container Apps with auto-scaling, Azure PostgreSQL Flexible Server, Azure Key Vault for secrets.
- **Monitoring**: Log Analytics workspace.
- **CI/CD**: GitHub Actions for automated deployment to Azure.
- **Infrastructure as Code**: Azure CLI script.
- **Security**: TLS via Container Apps ingress, managed certificates. DDoS/WAF via Azure Front Door.

## External Dependencies
- **AI Services**: OpenAI, Anthropic, OpenRouter (via Replit AI Integrations).
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **UI Components**: Shadcn/ui.
- **Charting Library**: Recharts.
- **Telephony**: Twilio Programmable Voice.
- **Payments**: Stripe.