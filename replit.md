# GoRigo - AI Business Platform

## Overview
GoRigo is an AI voice platform designed to streamline AI-driven business operations. It centralizes six product pillars: AI Voice Agents, Campaigns & Leads, Team Collaboration, Finance & Billing, Knowledge & AI, and Compliance & Analytics. The platform manages a multi-tier business hierarchy, automates commission processing, and offers features like multi-agent management, visual automation flow building, knowledge management, and real-time call monitoring. The vision is to provide a fully automated, scalable solution with a mobile-first approach, encapsulating the motto: "AI Voice. Real Business. Run From Your Phone."

## User Preferences
- Default to light mode (day vision), with dark mode (night vision) toggle available.
- Talk-time only billing model. Talk time = ALL platform usage (calls, AI content generation, assistant queries, knowledge processing). Server infrastructure is GoRigo's cost, not the customer's. Customer's prepaid wallet is deducted per operation. Margin is built into every transaction rate. Minimum wallet recharge: £50. No free trials, no free credits. Wallet top-ups are non-refundable (standard prepaid). Only platform-error refunds (e.g. call failures from system faults) are auto-refunded.
- AI disclosure on calls (compliance).
- Solo founder - automate everything, SuperAdmin Console for all analytics and operations.

## System Architecture
The platform's UI is built with Next.js 16 (App Router), Tailwind CSS, Shadcn/ui, and Recharts, emphasizing a flat aesthetic and dashboard layout. The primary interface is a React Native/Expo mobile application with AI voice control, complemented by a Web SaaS platform.

GoRigo uses PostgreSQL with Drizzle ORM and `pgvector` for embeddings. Authentication is session-based. AI functionalities are powered by OpenAI and Anthropic via Replit AI Integrations, enhanced by a RAG system. A prepaid wallet system with atomic operations and row-level locks manages billing and commissions. Multi-tenancy is enforced with `orgId`, and Role-Based Access Control (`globalRole`) manages permissions. Call flows are handled by a 7-state Call State Machine integrated with Telnyx (primary) and Vonage (fallback). Background jobs process document chunking, embedding, and audio transcription. Security features include prompt injection detection and input validation. A multi-agent system supports various AI agent types and visual flow diagram building. Compliance features include TCPA/FCC DNC management, PII auto-redaction, sentiment analysis, and call quality scoring. The system supports AI model fallback, multilingual capabilities, concurrent call limits, business hours, and outgoing webhooks.

The platform includes a Unit Economics System, pricing simulator, and optional Rigo Voice Assistant. Security hardening involves audit logging, session management, database-backed composite rate limiting (user+IP keys for authenticated requests, email-based rate limiting for auth endpoints), CSRF protection, email verification, account lockout, forced password change for seeded admin accounts (`mustChangePassword` flag), and Zod schema validation. Deployment uses Docker on Azure Container Apps with Azure PostgreSQL Flexible Server and Azure Key Vault, with CI/CD via GitHub Actions.

Key features include: customizable AI agents with per-call LLM cost ceiling (`maxLLMCostPerCall`, default £2.00), seamless voice experience with natural AI disclosure and barge-in support, knowledge management, multi-tier partner management, real-time talk-time billing (10s intervals) with wallet deductions and mid-call balance enforcement, a 6-tab analytics dashboard, web traffic intelligence with PII auto-redaction, international calling with compliance and fraud detection, an AI content studio, a finance module with seeding capabilities, social marketing status system, business continuity features, lead management, conversation analytics (Enterprise), Agent Assist (Enterprise), Omnichannel Messaging (Enterprise), department and team management, cost accounting dashboard, content studio for industry templates, Rigo Jarvis voice assistant, low balance alerts, email deliverability monitoring, invoice/receipt generation, public status page, self-service phone numbers, multi-currency support, GDPR data export with automated retention, UK PECR-compliant cookie consent, OAuth-first data source connectors with encrypted credentials, atomic wallet fund locking for campaigns, a mobile-first campaign wizard, real-time campaign progress and cost cap monitoring, an automated campaign execution engine, a background job processor, TPS/CTPS compliance checking, and a comprehensive dashboard onboarding wizard.

All dashboard pages use TanStack Query (React Query) v5 for data fetching and mutations, with consistent error handling via toast notifications. The React Native/Expo mobile app, located in `/mobile`, provides core functionalities like AI Assistant, Dashboard, Calls, Agents, Wallet (read-only), Campaigns, and Settings, with features such as biometric lock, push notifications, speech recognition, offline caching, white-label branding, and robust security measures including secure token storage, screenshot prevention, and jailbreak/root detection.

## External Dependencies
- **AI Services**: OpenAI, Anthropic (via Replit AI Integrations).
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **UI Components**: Shadcn/ui.
- **Charting Library**: Recharts.
- **Telephony**: Telnyx (primary), Vonage (fallback).
- **Payments**: Stripe.
- **Email**: AWS SES (eu-west-2 London).
- **Mobile Development**: Expo SDK 54, expo-router, expo-speech, expo-av, expo-haptics.