# GoRigo - AI Call Center Platform

## Overview
GoRigo is an AI-powered call center platform designed to automate call center operations, provide comprehensive analytics, and manage a three-tier business hierarchy (Business Partners, Direct-to-Consumer, Affiliate Partners). The platform streamlines partner management via a SuperAdmin Console, automates commission processing, and offers capabilities like multi-agent management, visual automation flow building, knowledge management, and robust call management with real-time monitoring. Its ambition is to be a fully automated, scalable solution for AI-driven call centers.

## Strategic Positioning: Mobile-First
Primary model: "Run Your AI Call Center From Your Phone" — a React Native/Expo mobile app with AI voice control (Rigo assistant) as the main interface. Secondary model: Web SaaS platform for desktop users. Both connect to the same backend APIs.

## User Preferences
- Default to light mode (day vision), with dark mode (night vision) toggle available.
- Talk-time only billing model.
- AI disclosure on calls (compliance).
- Solo founder - automate everything, SuperAdmin Console for all analytics and operations.

## System Architecture

### UI/UX Decisions
The platform uses Next.js 14 (App Router) with Tailwind CSS and Shadcn/ui for components, and Recharts for data visualization. Dark mode is the default, inspired by Azure Portal/Fluent Design. The dashboard features a collapsible left sidebar, a sticky top command bar, and a content workspace, emphasizing flat design, compact spacing, and table-first data views.

### Mobile App (React Native / Expo)
Located in `/mobile/` directory. Uses Expo Router for navigation with 5 main tabs:
- **Dashboard** (`mobile/app/(tabs)/index.tsx`): Stats cards, wallet balance, voice CTA, quick actions
- **Voice** (`mobile/app/(tabs)/voice.tsx`): Primary interface - chat-like UI with mic button, sends commands to `/api/rigo`
- **Calls** (`mobile/app/(tabs)/calls.tsx`): Call list with direction, status, duration
- **Agents** (`mobile/app/(tabs)/agents.tsx`): Agent list with status badges
- **Settings** (`mobile/app/(tabs)/settings.tsx`): Account, call center config, app settings

Theme: Green #189553 primary, white background (matches web). API client in `mobile/lib/api.ts` uses AsyncStorage for auth tokens and hits same backend endpoints.

### Technical Implementations
GoRigo uses PostgreSQL with Drizzle ORM and `pgvector` for embeddings. Authentication is session-based. AI functionalities leverage OpenAI via Replit AI Integrations, enhanced by a RAG system. A prepaid wallet system with atomic operations and row-level locks manages billing and commissions. Multi-tenancy is enforced via `orgId`, and Role-Based Access Control (`globalRole`) manages permissions. A 7-state Call State Machine handles call flows, integrated with Twilio Programmable Voice. Background jobs process document chunking, embedding, and audio transcription. Security features include prompt injection detection and input validation. A distribution engine manages commissions and revenue sharing. A multi-agent system supports various AI agent types and visual flow diagram building. Compliance features include TCPA/FCC DNC management, PII auto-redaction, sentiment analysis, and call quality scoring. The system supports AI model fallback, multilingual capabilities, concurrent call limits, business hours, and outgoing webhooks.

The platform includes a Unit Economics System for real-time cost tracking and margin analysis across all service categories, with a pricing simulator. An optional Rigo Voice Assistant provides AI voice control over the SaaS dashboard, handling commands for call statistics, wallet balance, and campaign status. Security hardening includes audit logging for critical events, robust session management, tiered rate limiting across all API endpoints, and comprehensive input validation using Zod schemas.

Deployment utilizes Docker containers on Azure Container Apps in the UK South region, with Azure PostgreSQL Flexible Server and Azure Key Vault. CI/CD is managed via GitHub Actions.

### Feature Specifications
- **Deployment Packages**: Four commercial packages (Managed, BYOK, Self-Hosted, Custom) selected during onboarding, affecting billing rates. The mobile app is available for Managed and BYOK packages only; Self-Hosted and Custom are web-only.
- **Agent Configuration**: Customizable AI agents with roles, FAQs, knowledge bases, and language/voice selection.
- **Knowledge Management**: Supports document upload, chunking, embedding, and audio transcription.
- **Multi-Tier Partner Management**: Business Partners can create resellers, D2C clients, and affiliate partners.
- **Affiliate Management**: Full CRUD for affiliate links, click tracking, and commission calculation.
- **Multi-Tier Distribution Engine**: Manages a commission waterfall from customer payment to platform remainder.
- **Billing & Usage**: Talk-time only pricing, real-time wallet deductions, billing ledger, spending caps, and Stripe for top-ups.
- **Analytics Deep-Dive**: A 6-tab dashboard with global date range picker for detailed insights into calls, trends, activity, sentiment, quality, and agents.
- **International Calling System**: Includes country management with compliance profiles and rate cards, Twilio sub-account isolation for clients, a compliance engine for DNC and calling hours, fraud detection, and currency conversion. Campaign management supports contact import with E.164 validation and DNC pre-screening. An operations dashboard provides real-time call monitoring with fraud alerts.

## External Dependencies
- **AI Services**: OpenAI, Anthropic, OpenRouter (via Replit AI Integrations).
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **UI Components**: Shadcn/ui.
- **Charting Library**: Recharts.
- **Telephony**: Twilio Programmable Voice.
- **Payments**: Stripe.
- **Mobile**: Expo SDK 54, expo-router, expo-speech, expo-av, expo-haptics.

## Recent Changes
- 2026-02-16: Redesigned hero section — removed intro video, added prominent "Talk to Our AI" CTA with phone number and "Available 24/7" indicator
- 2026-02-16: Removed bottom ribbon (CallCtaBar) and capabilities ribbon from landing page
- 2026-02-16: Added floating GoRigo chatbot icon on all public pages (opens existing ChatWidget)
- 2026-02-16: Updated Rigo agent system prompt with 5-stage end-to-end strategy: First Call → Onboarding → Training → Support → Wallet Recharge
- 2026-02-16: Updated public chatbot system prompt to align with Rigo brand and drive voice/mobile conversion
- 2026-02-16: Created mobile app foundation with Expo Router, 5-tab navigation, voice command interface, and login screen
- 2026-02-16: Updated web landing page hero to mobile-first messaging ("Run Your AI Call Center From Your Phone")
- 2026-02-16: Implemented white-label mobile app branding system — partners table extended with partnerCode, brandingLogo, mobileAppEnabled fields
- 2026-02-16: Created public branding API (GET /api/branding/:partnerCode) for mobile app to fetch partner branding without auth
- 2026-02-16: Added Mobile App Branding config section to admin partner detail page
- 2026-02-16: Mobile login screen now supports partner code entry with dynamic branding via BrandingProvider context
- 2026-02-16: All 5 mobile tabs use dynamic branding (brand name, color, logo) from useBranding hook
- 2026-02-16: Updated white-label partner page with branded mobile app feature card and FAQ
- 2026-02-16: Implemented multi-business architecture — one user can own/manage multiple businesses, each with its own agents, calls, wallet, and billing
- 2026-02-16: Added `activeOrgId` to sessions table for tracking current business context; auth layer resolves orgId from session with fallback
- 2026-02-16: Created business management APIs: GET/POST /api/businesses, POST /api/businesses/switch
- 2026-02-16: /api/auth/me now returns `businesses` array with id, name, role, deploymentModel, isActive flags
- 2026-02-16: Built BusinessSwitcher component in dashboard header — dropdown shows user's businesses with switch and "Add New Business" options
- 2026-02-16: Created /dashboard/businesses/new page with name input and deployment package selection (Managed, BYOK, Self-Hosted)
- 2026-02-16: Added mobile API client functions for business listing, switching, and creation
