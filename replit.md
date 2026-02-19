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
The mobile app, located in `/mobile/`, uses Expo Router and features a dual-input design (voice and text), TTS toggle, biometric lock, offline support, push notifications, and haptic feedback. It supports white-label branding and includes detail screens for calls, wallet, and business switching.

### Technical Implementations
GoRigo uses PostgreSQL with Drizzle ORM and `pgvector` for embeddings. Authentication is session-based. AI functionalities leverage OpenAI via Replit AI Integrations, enhanced by a RAG system. A prepaid wallet system with atomic operations and row-level locks manages billing and commissions. Multi-tenancy is enforced via `orgId`, and Role-Based Access Control (`globalRole`) manages permissions. A 7-state Call State Machine handles call flows, integrated with Twilio Programmable Voice. Background jobs process document chunking, embedding, and audio transcription. Security features include prompt injection detection and input validation. A distribution engine manages commissions and revenue sharing. A multi-agent system supports various AI agent types and visual flow diagram building. Compliance features include TCPA/FCC DNC management, PII auto-redaction, sentiment analysis, and call quality scoring. The system supports AI model fallback, multilingual capabilities, concurrent call limits, business hours, and outgoing webhooks.

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
- **International Calling System**: Includes country management, Twilio sub-account isolation, compliance engine, fraud detection, and currency conversion.
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

## External Dependencies
- **AI Services**: OpenAI, Anthropic, OpenRouter (via Replit AI Integrations).
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **UI Components**: Shadcn/ui.
- **Charting Library**: Recharts.
- **Telephony**: Twilio Programmable Voice.
- **Payments**: Stripe.
- **Mobile**: Expo SDK 54, expo-router, expo-speech, expo-av, expo-haptics.