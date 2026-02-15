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

Enterprise-grade infrastructure components include: LLM Fallback Router, Database Hardening, Global Error Handler, Autopilot Health Monitor, Rate Limiting, Security Middleware, CI/CD Pipeline, Real-Time Call Monitoring, Infrastructure Dashboard, Notification System, Admin Client Management, Automation Controls, Platform Settings Console, Admin Revenue Dashboard, Admin Notification Center, Admin Audit Log, Admin Wallets, Admin Compliance Centre, Admin Affiliate Management, Admin Knowledge Management, Admin Campaign Management, Admin Call Monitoring, Admin Agent Overview, Admin API Key Management, External API Layer, Finance Module, Getting Started Guide, Feature Detail Pages, Partner Pages, Public Website, and Public AI Chat Widget.

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
- **Campaign Management**: Contact list import with E.164 validation, DNC pre-checking, country detection from phone prefixes. API at `/api/admin/campaigns/international`.
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