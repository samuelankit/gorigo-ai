# GoRigo - AI Business Platform

## Overview
GoRigo is an AI voice platform designed to streamline AI-driven business operations. It centralizes six product pillars: AI Voice Agents, Campaigns & Leads, Team Collaboration, Finance & Billing, Knowledge & AI, and Compliance & Analytics. The platform manages a multi-tier business hierarchy (Business Partners, Direct-to-Consumer, Affiliate Partners), automates commission processing, and offers features like multi-agent management, visual automation flow building, knowledge management, and real-time call monitoring. The vision is to provide a fully automated, scalable solution with a mobile-first approach, encapsulating the motto: "AI Voice. Real Business. Run From Your Phone."

## User Preferences
- Default to light mode (day vision), with dark mode (night vision) toggle available.
- Talk-time only billing model. Talk time = ALL platform usage (calls, AI content generation, assistant queries, knowledge processing). Server infrastructure is GoRigo's cost, not the customer's. Customer's prepaid wallet is deducted per operation. Margin is built into every transaction rate.
- AI disclosure on calls (compliance).
- Solo founder - automate everything, SuperAdmin Console for all analytics and operations.

## System Architecture

### UI/UX Decisions
The platform's UI is built with Next.js 16 (App Router), Tailwind CSS, and Shadcn/ui. Data visualization uses Recharts. The design emphasizes a flat aesthetic, compact spacing, and table-first data views within a dashboard layout featuring a collapsible left sidebar and sticky top command bar. The primary user interface is a React Native/Expo mobile application with AI voice control, complemented by a Web SaaS platform.

### Technical Implementations
GoRigo uses PostgreSQL with Drizzle ORM and `pgvector` for embeddings. Authentication is session-based. AI functionalities are powered by OpenAI and Anthropic via Replit AI Integrations, enhanced by a RAG system. A prepaid wallet system with atomic operations and row-level locks manages billing and commissions. Multi-tenancy is enforced with `orgId`, and Role-Based Access Control (`globalRole`) manages permissions. Call flows are handled by a 7-state Call State Machine integrated with Telnyx (primary) and Vonage (fallback). Background jobs process document chunking, embedding, and audio transcription. Security features include prompt injection detection and input validation. A multi-agent system supports various AI agent types and visual flow diagram building. Compliance features include TCPA/FCC DNC management, PII auto-redaction, sentiment analysis, and call quality scoring. The system supports AI model fallback, multilingual capabilities, concurrent call limits, business hours, and outgoing webhooks.

The platform includes a Unit Economics System for real-time cost tracking and margin analysis, a pricing simulator, and an optional Rigo Voice Assistant for AI voice control. Security hardening includes audit logging, robust session management, database-backed rate limiting, CSRF protection, email verification, account lockout, and comprehensive input validation using Zod schemas. Deployment uses Docker containers on Azure Container Apps with Azure PostgreSQL Flexible Server and Azure Key Vault. CI/CD is managed via GitHub Actions.

Key features include:
- **Deployment Packages**: Three commercial packages (Individual, Team, Custom Enterprise) with a white-label add-on.
- **Agent Configuration**: Customizable AI agents with roles, FAQs, knowledge bases, and language/voice selection. Neural voice quality tier available (AWS Polly Neural voices) with quality labels in UI.
- **Seamless Voice Experience**: Natural AI disclosure ("Just so you know, I'm an AI assistant..."), barge-in support (Telnyx `speakAndGather`, Vonage `bargeIn: true`), 1-2s silence detection, enhanced conversational LLM prompt with warm filler phrases and caller energy mirroring. Files: `lib/voice-ai.ts`, `lib/telnyx.ts`, `app/api/telnyx/voice/route.ts`, `app/api/vonage/voice/route.ts`, `lib/compliance-engine.ts`.
- **Knowledge Management**: Document upload, chunking, embedding, and audio transcription.
- **Partner Management**: Multi-tier system for Business Partners, resellers, D2C clients, and affiliate partners, including full CRUD for affiliate links and commission calculation.
- **Billing & Usage**: Talk-time pricing, real-time wallet deductions, mid-call balance enforcement, spending caps, Stripe for top-ups, and automated refunds.
- **Analytics Deep-Dive**: A 6-tab dashboard with a global date range picker.
- **Web Traffic Intelligence**: Custom analytics with PII auto-redaction.
- **International Calling System**: Country management, per-org telephony isolation, compliance engine, fraud detection, and currency conversion.
- **Smart Drafts AI Content Studio**: Draft generation for call scripts, email/SMS templates, and FAQ answers.
- **Business Continuity System**: Partner lifecycle management with suspension/termination cascades, client reassignment, and data export.
- **Lead Management System**: Pipeline management with enrichment, scoring, and dedup.
- **Conversation Analytics (Enterprise)**: Deep call analytics with KPIs, sentiment, quality scores, and agent scorecards.
- **Agent Assist (Enterprise)**: Real-time assist with live call monitoring, human agent management, and coaching rules.
- **Omnichannel Messaging (Enterprise)**: Unified messaging across WhatsApp, SMS, email, and web chat.
- **Department & Team Management**: Organizational hierarchy with role-based permissions, employee invitations, and per-department spending caps.
- **Cost Accounting Dashboard**: SuperAdmin dashboard for real-time P&L, COGS breakdown, and pricing advisor.
- **Content Studio**: Admin dashboard for Industry Templates, Voice Profiles, and Case Studies.
- **Rigo Jarvis Features**: Free voice assistant with personal productivity tools.
- **Low Balance Alerts**: Configurable wallet threshold alerts via email.
- **Email Deliverability Monitoring**: SendGrid event webhook (`/api/webhooks/sendgrid`) tracks bounces, spam complaints, and delivery events in the `email_events` table. SuperAdmin email health dashboard at `/api/admin/email-health` shows bounce/spam rates with warning thresholds.
- **Invoice/Receipt Generation**: Downloadable HTML receipts with VAT breakdown.
- **Public Status Page**: Real-time system health monitoring for core services. Health endpoints: `/api/health` (detailed), `/api/health/live` (liveness), `/api/health/ready` (readiness).
- **Self-Service Phone Numbers**: Browse and purchase Telnyx numbers.
- **Multi-Currency Support**: GBP/EUR/USD conversion API.
- **GDPR Data Export**: Full Article 15 compliant data export.
- **Data Source Connectors**: OAuth-first, mobile-first system for connecting Google Sheets, HubSpot, CSV, Companies House, etc. Features AES-256 encrypted credentials, automatic OAuth token refresh, and SSRF protection for media sourcing.
- **Wallet Fund Locking**: Atomic fund locking with row-level locks for campaign cost pre-approval, including cost estimation, 80% cost cap enforcement, and periodic fund release.
- **Campaign Wizard (Mobile-First)**: 3-step creation flow for campaigns (Add Contacts, Configure & Estimate, Approve & Start) with state persistence and inline OAuth connection.
- **Campaign Progress & Cost Cap**: Real-time monitoring, cost cap pausing at 80% of locked funds, and stalled campaign detection.
- **Dashboard Onboarding Wizard**: Comprehensive 7-phase, 24-step setup wizard for first-time users. Phases: Foundation, Build Your Agent, Knowledge & Intelligence, Go Live, Communicate, Compliance & Safety, Grow. Features: Essential/Optional step classification, package-aware step filtering (Team/Custom features hidden for Individual), "Why this matters" teaching content per step, time estimates, phase completion celebrations, "Not relevant to me" skip for optional steps, minimize/dismiss with server-side persistence (localStorage + API), and "Setup Guide" restore button. Files: `components/dashboard/setup-wizard.tsx`, `app/api/onboarding/route.ts`, `app/api/onboarding/wizard-state/route.ts`.

### Data Fetching
All dashboard pages use TanStack Query (React Query) v5 for data fetching and mutations, with a `QueryProvider` wrapping the app. `useQuery` handles GET requests with `isLoading` states, and `useMutation` manages POST/PUT/PATCH/DELETE operations, invalidating queries on success and providing `isPending` states for buttons. Custom `queryFn` is used for parameterized GET requests. Blob downloads use raw `fetch`. Reusable hooks are provided for shared CRUD patterns. All mutations include `onError` with toast notifications for consistency.

## External Dependencies
- **AI Services**: OpenAI, Anthropic (via Replit AI Integrations).
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **UI Components**: Shadcn/ui.
- **Charting Library**: Recharts.
- **Telephony**: Telnyx (primary), Vonage (fallback).
- **Payments**: Stripe.
- **Email**: SendGrid.
- **Mobile Development**: Expo SDK 54, expo-router, expo-speech, expo-av, expo-haptics.

## Mobile App (`/mobile`)
The React Native/Expo mobile app is feature-complete in code. Located in `/mobile` directory.
- **Screens**: Rigo AI Assistant (voice commands), Dashboard, Calls, Agents, Wallet, Activity, Settings, Login, Call Detail, Business Switcher
- **Features**: Bearer token auth, biometric lock, push notifications, speech recognition, offline caching, white-label branding, haptic feedback
- **Backend**: All mobile API endpoints exist and work (`/api/mobile/stats`, `/api/mobile/agents`, `/api/mobile/calls`, `/api/rigo`, `/api/wallet`, `/api/notifications`, `/api/calls/today`, `/api/settings/*`, `/api/businesses/*`, `/api/branding/[code]`)
- **Auth**: Mobile login sends `X-Client-Type: mobile` header, receives Bearer token in response body. All subsequent requests use `Authorization: Bearer <token>`. Middleware bypasses CSRF origin check for mobile clients with Bearer tokens.
- **Build**: EAS Build configured for dev, preview, and production profiles. See `mobile/QUICK_START.md` for setup.
- **Status**: Code complete. Needs `npm install`, Expo account linking (`eas init`), and build submission to Play Store/App Store.