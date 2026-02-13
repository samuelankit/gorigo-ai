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
GoRigo uses PostgreSQL with Drizzle ORM and `pgvector` for embeddings. Authentication is session-based with `bcryptjs`, including rate limiting and CSRF protection. AI functionalities leverage OpenAI via Replit AI Integrations, enhanced by a RAG system. A prepaid wallet system with atomic operations and row-level locks manages billing and commissions. Multi-tenancy is enforced via `orgId`, and Role-Based Access Control (`globalRole`) manages permissions. A 7-state Call State Machine handles call flows, integrated with Twilio Programmable Voice. Background jobs process document chunking, embedding, and audio transcription. Security features include prompt injection detection and input validation. A distribution engine manages commissions and revenue sharing. A multi-agent system supports various AI agent types and visual flow diagram building. Compliance features include TCPA/FCC DNC management, PII auto-redaction, sentiment analysis, and call quality scoring. The system supports AI model fallback, multilingual capabilities, concurrent call limits, business hours, and outgoing webhooks.

Enterprise-grade infrastructure components include:
- **LLM Fallback Router**: A 2-provider routing system (OpenAI, Anthropic) with circuit breakers and health monitoring.
- **Database Hardening**: Connection pooling, query timeouts, and comprehensive FK constraints with indexes.
- **Global Error Handler**: Custom error classes, structured logging, and sanitized responses.
- **Autopilot Health Monitor**: Checks critical systems every 60s.
- **Rate Limiting**: In-memory rate limiters for API categories.
- **Security Middleware**: Comprehensive protection including CSRF, CSP, HSTS, and XSS.
- **CI/CD Pipeline**: GitHub Actions for automated deployment to Azure UK South.
- **Real-Time Call Monitoring**: Provides live call data, recent completions, today's stats, and agent availability.
- **Infrastructure Dashboard**: SuperAdmin view of system health, LLM status, memory usage, and error logs with detailed metrics.
- **Notification System**: Typed notifications for critical events, including Twilio webhook integration for call failures.
- **Admin Client Management**: Comprehensive client detail view, status management, and analytics for SuperAdmins.
- **Automation Controls**: Platform-wide settings for auto-suspension, spending cap alerts, and partner auto-approval, managed by a background engine.
- **Platform Settings Console**: Centralized administration for rate cards, platform defaults, compliance, automation, integrations, and branding.
- **Admin Revenue Dashboard**: Provides key revenue KPIs, trends, client rankings, transactions, and commission breakdowns.
- **Admin Notification Center**: Centralized management and broadcasting of system notifications.
- **Admin Audit Log**: Detailed, searchable log of system events with filtering and summary statistics.
- **Admin Wallets**: Management interface for client wallets with balance monitoring and quick top-up functionality.
- **Admin Compliance Centre**: Tools for managing DNC lists, consent records, and monitoring overall platform compliance.
- **Admin Affiliate Management**: Enhanced `/admin/affiliates` page with 4 KPI cards (Total Affiliates with active count, Clicks/Signups with conversion rate %, Total Earnings with lifetime payouts, Pending Payouts), server-side search by name/email/code, owner type filter (all/platform/partner), status filter (all/active/pending/deactivated), server-side pagination (25/page). Table shows code, name, email, type badge, commission %, clicks, signups, conversion rate, earnings, pending, status badge, created date. Create/Edit/Deactivate dialogs. APIs: `GET/POST/PUT/DELETE /api/admin/affiliates`, payouts at `GET/POST/PUT /api/admin/affiliates/payouts`.
- **Admin Knowledge Management**: Dedicated `/admin/knowledge` page with 4 KPI cards (Total Documents with org count, Processing status with pending/failed counts, Total Chunks, Sources breakdown showing manual/upload/url/audio counts), server-side search by document title/org name, status filter (all/processed/pending/processing/failed), source type filter (all/manual/upload/url/audio), server-side pagination (25/page). Table shows document title, organisation, source type with icon, status badge, chunk count, token count, embedding progress bar (%), updated timestamp. Click row for document detail dialog showing full metadata (org, source, status, chunks, tokens, embedded ratio, dates, source URL). API at `GET /api/admin/knowledge` with chunk stats subquery joining knowledge_chunks for per-document token/embedding counts. Sidebar link added under Management.
- **Admin Campaign Management**: Outbound campaign monitoring at `/admin/campaigns` with 4 KPI cards (Total Campaigns with org count, Status Breakdown showing active/paused/draft/completed counts, Total Contacts with reached/failed, Completion Rate %), server-side search by campaign name/description/org, status filter (all/active/draft/paused/completed/failed), server-side pagination (25/page). Table shows campaign name, organisation, agent, status badge, progress bar (%), contacts completed/total, created timestamp. Click row for campaign detail dialog with full metadata (org, status, agent, call interval, total/completed/failed contacts, max retries, progress bar, description, scheduled/started/completed/created timestamps). API at `GET /api/admin/campaigns` with cross-org joins to agents/orgs, platform-wide stats aggregation. Sidebar link added under Management.
- **Admin Call Monitoring**: Real-time call monitoring at `/admin/calls` with 4 KPI cards (Today's Calls with talk time, Total Calls with inbound/outbound split, Avg Quality with sentiment score, Outcomes with leads/handoffs/failed/active counts), server-side search by caller/agent/org/summary, status filter (all/completed/in-progress/failed/missed/voicemail), direction filter (all/inbound/outbound), server-side pagination (25/page). Table shows direction icon, caller number, agent, organisation, duration, status badge, quality score, outcome badges (Lead/Handoff/Appt), relative timestamp. Click row for comprehensive call detail dialog with full metadata (direction, status, caller, duration, agent, org, quality, sentiment, call state, turns, cost, deployment model, timestamps, AI disclosure, lead info, summary, final outcome). API at `GET /api/admin/calls` with cross-org joins to agents/orgs, platform-wide stats + today's stats aggregation. Sidebar link added under Overview.
- **Admin Agent Overview**: Comprehensive view of all agents across organizations with status, call statistics, and compliance.
- **Admin API Key Management**: Centralized management of API keys, including status, usage, and revocation.
- **External API Layer**: A public REST API for external integrations with OpenAPI 3.1 spec and AI plugin manifest.
- **Finance Module**: Double-entry bookkeeping with transaction safety, `numeric` types, Zod validation, and audit trails.
- **Getting Started Guide**: Public tutorial section at `/guide` with 8 dedicated module pages (overview, agents, knowledge-base, clients, billing, campaigns, monitoring, compliance). Each module includes step-by-step text instructions, generated illustrative images, generated video walkthroughs, tips & best practices, troubleshooting, and key terms glossary. Modules are linked with prev/next navigation. Accessible from admin sidebar under System section. No authentication required.
- **Public Website**: Full marketing website with OpenRouter-inspired design. Homepage (`/`) with dark hero, capability highlights, 6-feature grid, 3-step how-it-works, industry use cases, pricing preview, and CTA sections. Shared Navbar and Footer components across all public pages. Additional pages: Pricing (`/pricing`) with 3 deployment packages and feature comparison table, About (`/about`) with company mission and UK registration details, Contact (`/contact`) with enquiry form and 24/7 AI demo line, Documentation hub (`/docs`) with API reference and integration guides. Four policy pages under `/policies/` (privacy, terms, cookies, acceptable-use) all referencing International Business Exchange Limited, Company No. 15985956. Visual sitemap (`/sitemap`) and XML sitemap (`/sitemap.xml`). SEO: unique metadata, Open Graph tags, robots.txt. Logo at `/logo.png`, favicon at `/favicon.png`. Email: hello@gorigo.ai.

### Feature Specifications
- **Deployment Packages**: Three commercial packages (Managed, BYOK, Self-Hosted) selected during onboarding, affecting billing rates.
- **Agent Configuration**: Customizable AI agents with roles, FAQs, knowledge bases, and language/voice selection.
- **Knowledge Management**: Supports document upload, chunking, embedding, and audio transcription.
- **Multi-Tier Partner Management**: Business Partners can create resellers, D2C clients, and affiliate partners.
- **Affiliate Management**: Full CRUD for affiliate links, click tracking, and commission calculation.
- **Multi-Tier Distribution Engine**: Manages a commission waterfall from customer payment to platform remainder.
- **Billing & Usage**: Talk-time only pricing, real-time wallet deductions, billing ledger, spending caps, and Stripe for top-ups.
- **Analytics Deep-Dive**: A 6-tab dashboard with global date range picker for detailed insights into calls, trends, activity, sentiment, quality, and agents.

## External Dependencies
- **AI Services**: OpenAI (`gpt-5.2`, `gpt-image-1`), Anthropic (`claude-sonnet-4-5`), OpenRouter (multi-model access) via Replit AI Integrations. Client modules in `replit_integrations/chat/` with `client-openai.ts`, `client-anthropic.ts`, `client-openrouter.ts`. Chat routes at `app/api/conversations/` with SSE streaming. Image generation at `app/api/images/generate/`. Batch processing utilities in `replit_integrations/batch/`.
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **UI Components**: Shadcn/ui.
- **Charting Library**: Recharts.
- **Telephony**: Twilio Programmable Voice.
- **Payments**: Stripe.