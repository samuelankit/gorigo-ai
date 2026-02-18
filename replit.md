# GoRigo - AI Call Center Platform

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
Located in `/mobile/` directory, using Expo Router for file-based navigation with 3 main tabs: Rigo (AI assistant home with dashboard cards + dual-input chat + quick action chips), Activity (unified feed of calls, alerts, wallet transactions with filter chips), and Settings (profile, wallet, business switcher, biometric lock toggle, push notification toggle). The theme uses Green #189553 as primary and a white background.

Key mobile features:
- **Dual-Input Design**: Voice (speech-to-text via Web Speech API / device STT) + text chat + touch UI, all feeding into the same Rigo command handler
- **TTS Toggle**: Mute/unmute Rigo's spoken responses (expo-speech)
- **Biometric Lock**: Face ID / fingerprint via expo-local-authentication, auto-lock after 5 min inactivity, re-auth required for sensitive actions (wallet access)
- **Offline Support**: Command queue (AsyncStorage), cached dashboard stats, connection status indicator ("Offline" badge), sync on reconnect
- **Push Notifications**: expo-notifications setup with token registration to server, channels for low wallet/fraud/agent offline/quality drops
- **Haptic Feedback**: expo-haptics wrapper for mic tap (medium), stat card tap (selection), chip tap (selection)
- **Detail Screens**: Call Detail (transcript, sentiment, quality, duration, cost), Wallet (balance card, transactions), Business Switcher
- **White-label Branding**: Dynamic brand name/color via BrandingProvider

### Technical Implementations
GoRigo uses PostgreSQL with Drizzle ORM and `pgvector` for embeddings. Authentication is session-based. AI functionalities leverage OpenAI via Replit AI Integrations, enhanced by a RAG system. A prepaid wallet system with atomic operations and row-level locks manages billing and commissions. Multi-tenancy is enforced via `orgId`, and Role-Based Access Control (`globalRole`) manages permissions. A 7-state Call State Machine handles call flows, integrated with Twilio Programmable Voice. Background jobs process document chunking, embedding, and audio transcription. Security features include prompt injection detection and input validation. A distribution engine manages commissions and revenue sharing. A multi-agent system supports various AI agent types and visual flow diagram building. Compliance features include TCPA/FCC DNC management, PII auto-redaction, sentiment analysis, and call quality scoring. The system supports AI model fallback, multilingual capabilities, concurrent call limits, business hours, and outgoing webhooks.

The platform includes a Unit Economics System for real-time cost tracking and margin analysis, with a pricing simulator. An optional Rigo Voice Assistant provides AI voice control over the SaaS dashboard. Security hardening includes audit logging, robust session management, tiered rate limiting, and comprehensive input validation using Zod schemas. Deployment utilizes Docker containers on Azure Container Apps with Azure PostgreSQL Flexible Server and Azure Key Vault. CI/CD is managed via GitHub Actions.

Key features include:
- **Deployment Packages**: Four commercial packages (Managed, BYOK, Self-Hosted, Custom) selected during onboarding.
- **Agent Configuration**: Customizable AI agents with roles, FAQs, knowledge bases, and language/voice selection.
- **Knowledge Management**: Supports document upload, chunking, embedding, and audio transcription.
- **Multi-Tier Partner Management**: Business Partners can create resellers, D2C clients, and affiliate partners.
- **Affiliate Management**: Full CRUD for affiliate links, click tracking, and commission calculation.
- **Multi-Tier Distribution Engine**: Manages a commission waterfall.
- **Billing & Usage**: Talk-time only pricing, real-time wallet deductions, billing ledger, spending caps, and Stripe for top-ups.
- **Analytics Deep-Dive**: A 6-tab dashboard with global date range picker for detailed insights.
- **Web Traffic Intelligence (Section 1 of Decision Intelligence)**: Custom-built analytics tracking system with client-side tracker (pageviews, clicks, scroll depth, time on page, device/browser/OS, UTM params, search keywords, conversions). Three dashboard pages: Overview (KPIs, charts, tables), User Journeys & Funnels (conversion funnel, entry/exit pages, page flows, drop-off analysis), and AI Insights (health scores, anomaly detection, trend identification, recommendations, blind spot detection). PII auto-redaction in tracker. Located at `/admin/web-traffic/`.
- **International Calling System**: Includes country management, Twilio sub-account isolation, compliance engine, fraud detection, and currency conversion.
- **Smart Drafts AI Content Studio**: Draft generation for call scripts, email templates, SMS templates, and FAQ answers with version history, tone, and language options.
- **Business Continuity System**: Partner lifecycle management with states (pending, active, suspended, terminated, archived). Partner agreements table tracks contract terms, notice periods, data retention, clawback rules. Cascade engine recursively suspends/terminates downstream entities (clients, wallets, Twilio accounts, affiliates, commissions, campaigns, resellers) with cycle detection and max-depth guard. Client reassignment workflow transfers clients between partners or to D2C with rate migration strategies. Commission settlement with configurable clawback periods. Data export with legal hold protection. Automated partner health monitoring with scoring. BYOK credential validation with auto-fallback to platform keys. Orphan detection for resellers with missing parents, affiliates with dead owners, and clients under suspended partners.
- **Lead Management System**: Full pipeline management (new/contacted/qualified/proposal/won/lost) with built-in enrichment engine (no external paid services). Auto-extracts company from email domain, analyzes conversation for intent signals (pricing/demo/integration/timeline keywords), calculates lead score 0-100. Email dedup on capture. Multi-tenant org-scoped access. CSV export. Activity timeline with notes. Located at `/admin/leads/`.
- **Conversation Analytics (Enterprise)**: Deep call analytics with 5-tab dashboard: overview KPIs, sentiment trends (positive/negative/neutral over time), quality scores (top/bottom calls), agent scorecards (per-agent performance metrics), and topics/alerts (keyword-based topic extraction — NO LLM). Includes analytics rollup engine, customer journey tracking, and configurable alert system. 11 API endpoints. Located at `/admin/conversation-analytics/`. Schema: callAnalyticsRollups, agentScorecards, callTopics, analyticsAlerts.
- **Agent Assist (Enterprise)**: Real-time agent assist system with 5-tab dashboard: live call monitoring, human agent management (status/skills/capacity), assist sessions (suggestion tracking), coaching rules engine (trigger-based coaching messages), and canned responses library. Features include supervisor listen/whisper/barge modes, intelligent handoff (skill-based routing), knowledge search (ILIKE text matching — NO LLM), and performance analytics. 18 API endpoints. Located at `/admin/agent-assist/`. Schema: humanAgents, agentAssistSessions, assistSuggestions, coachingRules, cannedResponses, supervisorSessions.
- **Voice Biometrics (Enterprise)**: Voice biometric authentication with 4-tab dashboard: overview analytics, voiceprint management (enrollment/verification/GDPR deletion), fraud detection (cross-account checks, spoofing detection, severity-based alerts), and configuration (thresholds, anti-spoofing toggles, fallback methods). Consent-first enrollment with audit trail. Input validation on config updates. 10 API endpoints. Located at `/admin/voice-biometrics/`. Schema: voiceprints, voiceBiometricAttempts, biometricConfig, biometricFraudAlerts.
- **Omnichannel Messaging (Enterprise)**: Unified messaging across WhatsApp, SMS, email, and web chat with 5-tab dashboard: unified inbox (filterable conversations with SLA tracking), contacts (unified identity, merge capability), channel management (health monitoring, enable/disable), message templates (approval workflow), and billing rules (per-channel talk-time equivalents). Features include conversation resolution workflow, channel health checks, and per-channel billing metering. 16 API endpoints. Located at `/admin/omnichannel/`. Schema: unifiedContacts, channelConfigurations, omnichannelConversations, omnichannelMessages, messageTemplates, channelBillingRules, channelHealthLog.
- **Department & Team Management**: Organizational hierarchy with departments, role-based permissions (OWNER > ADMIN > MANAGER > AGENT > VIEWER), and employee invitation system. Department management at `/admin/departments/` with create/edit/archive departments, assign managers, add/remove members. Team management at `/admin/team/` with org member listing, role changes, and invitation management. Employee invitation flow with token-based email invites, auto-assignment to departments/roles on registration, 7-day expiry. Accept-invite landing page at `/invite/[token]`. Permission middleware (`lib/permissions.ts`) enforces org-level and department-level access controls. Schema: departments, departmentMembers, invitations.

- **System Monitoring**: Admin monitoring dashboard at `/admin/monitoring` with real-time health metrics (CPU, memory, DB latency, uptime), Recharts time-series charts, auto-refresh toggle. Health check API at `/api/health` (public) and `/api/health/metrics` (SUPERADMIN-only with 60-point in-memory history). Azure monitoring alerts setup script at `scripts/setup-azure-monitoring.sh` (CPU, memory, HTTP 5xx, latency, container restart alerts with email notifications).

## CI/CD & Deployment
- **Development**: Replit (gorigo.replit.app)
- **Production**: Azure Container Apps (UK South) at gorigo.ai
- **Domain**: gorigo.ai (Namecheap DNS, SSL via Azure Managed Certificate)
- **Container Registry**: gorigoacr.azurecr.io (Azure Container Registry, Basic SKU)
- **Production Database**: Azure PostgreSQL Flexible Server (gorigo-pgserver.postgres.database.azure.com)
- **CI/CD Pipeline**: GitHub Actions (`.github/workflows/deploy.yml`) — auto-builds Docker image and deploys to Azure Container Apps on push to `main`
- **GitHub Secrets Required**:
  - `AZURE_CREDENTIALS` — Service principal JSON (`az ad sp create-for-rbac --sdk-auth`)
  - `ACR_USERNAME` — Azure Container Registry username
  - `ACR_PASSWORD` — Azure Container Registry password

## External Dependencies
- **AI Services**: OpenAI, Anthropic, OpenRouter (via Replit AI Integrations).
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **UI Components**: Shadcn/ui.
- **Charting Library**: Recharts.
- **Telephony**: Twilio Programmable Voice.
- **Payments**: Stripe.
- **Mobile**: Expo SDK 54, expo-router, expo-speech, expo-av, expo-haptics.