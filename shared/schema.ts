import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, vector, numeric, uniqueIndex, index, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  businessName: text("business_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  isDemo: boolean("is_demo").default(false),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  globalRole: text("global_role").default("CLIENT"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  termsVersion: text("terms_version"),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  activeOrgId: integer("active_org_id"),
  rotatedAt: timestamp("rotated_at").defaultNow(),
}, (table) => [
  index("idx_sessions_user_id").on(table.userId),
  index("idx_sessions_token").on(table.token),
  index("idx_sessions_expires").on(table.expiresAt),
]);

export const orgs = pgTable("orgs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  currency: text("currency").notNull().default("GBP"),
  channelType: text("channel_type").default("d2c"),
  status: text("status").default("active"),
  suspendedAt: timestamp("suspended_at"),
  suspendedReason: text("suspended_reason"),
  referredByAffiliateId: integer("referred_by_affiliate_id"),
  maxConcurrentCalls: integer("max_concurrent_calls").default(5),
  minCallBalance: numeric("min_call_balance", { precision: 12, scale: 2 }).default("1.00"),
  businessHours: jsonb("business_hours"),
  voicemailEnabled: boolean("voicemail_enabled").default(false),
  voicemailGreeting: text("voicemail_greeting"),
  byokOpenaiKey: text("byok_openai_key"),
  byokOpenaiBaseUrl: text("byok_openai_base_url"),
  byokTwilioSid: text("byok_twilio_sid"),
  byokTwilioToken: text("byok_twilio_token"),
  byokTwilioPhone: text("byok_twilio_phone"),
  byokMode: text("byok_mode").default("platform"),
  deploymentModel: text("deployment_model").default("managed"),
  webhookSecret: text("webhook_secret"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orgMembers = pgTable("org_members", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("OWNER"),
}, (table) => [
  index("idx_org_members_org_id").on(table.orgId),
  index("idx_org_members_user_id").on(table.userId),
  uniqueIndex("uq_org_members_org_user").on(table.orgId, table.userId),
]);

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  name: text("name").notNull().default("AI Assistant"),
  greeting: text("greeting").default("Hello, thank you for calling. How can I help you today?"),
  businessDescription: text("business_description"),
  inboundEnabled: boolean("inbound_enabled").default(true),
  outboundEnabled: boolean("outbound_enabled").default(false),
  roles: text("roles").default("receptionist"),
  faqEntries: jsonb("faq_entries").default([]),
  handoffNumber: text("handoff_number"),
  handoffTrigger: text("handoff_trigger").default("transfer"),
  voicePreference: text("voice_preference").default("professional"),
  negotiationEnabled: boolean("negotiation_enabled").default(false),
  negotiationGuardrails: jsonb("negotiation_guardrails"),
  complianceDisclosure: boolean("compliance_disclosure").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  handoffEnabled: boolean("handoff_enabled").default(true),
  handoffTargetType: text("handoff_target_type").default("phone"),
  handoffTargetValue: text("handoff_target_value"),
  handoffConditions: jsonb("handoff_conditions"),
  maxTurns: integer("max_turns").default(10),
  confidenceThreshold: numeric("confidence_threshold", { precision: 5, scale: 2 }).default("0.55"),
  retentionDaysCallLogs: integer("retention_days_call_logs").default(90),
  retentionDaysRecordings: integer("retention_days_recordings").default(30),
  agentType: text("agent_type").default("general"),
  departmentName: text("department_name"),
  displayOrder: integer("display_order").default(0),
  isRouter: boolean("is_router").default(false),
  routingConfig: jsonb("routing_config"),
  parentAgentId: integer("parent_agent_id"),
  systemPrompt: text("system_prompt"),
  escalationRules: jsonb("escalation_rules"),
  status: text("status").default("active"),
  language: text("language").notNull().default("en-GB"),
  voiceName: text("voice_name").notNull().default("Polly.Amy"),
  speechModel: text("speech_model").notNull().default("default"),
  deletedAt: timestamp("deleted_at"),
  strictKnowledgeMode: boolean("strict_knowledge_mode").default(false),
  maxTokensPerCall: integer("max_tokens_per_call").default(4096),
  maxTokensPerSession: integer("max_tokens_per_session").default(16384),
}, (table) => [
  index("idx_agents_org_id").on(table.orgId),
  index("idx_agents_user_id").on(table.userId),
  index("idx_agents_org_status").on(table.orgId, table.status),
]);

export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().references(() => agents.id),
  userId: integer("user_id").notNull().references(() => users.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  direction: text("direction").notNull(),
  callerNumber: text("caller_number"),
  duration: integer("duration").default(0),
  status: text("status").default("completed"),
  summary: text("summary"),
  transcript: text("transcript"),
  leadCaptured: boolean("lead_captured").default(false),
  leadName: text("lead_name"),
  leadEmail: text("lead_email"),
  leadPhone: text("lead_phone"),
  appointmentBooked: boolean("appointment_booked").default(false),
  handoffTriggered: boolean("handoff_triggered").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  providerCallId: text("provider_call_id").unique(),
  aiDisclosurePlayed: boolean("ai_disclosure_played").default(false),
  aiDisclosureVersion: text("ai_disclosure_version"),
  currentState: text("current_state").default("GREETING"),
  turnCount: integer("turn_count").default(0),
  lastConfidence: numeric("last_confidence", { precision: 5, scale: 2 }),
  handoffReason: text("handoff_reason"),
  handoffAt: timestamp("handoff_at"),
  finalOutcome: text("final_outcome"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  recordingUrl: text("recording_url"),
  recordingSid: text("recording_sid"),
  twilioCallSid: text("twilio_call_sid"),
  callCost: numeric("call_cost", { precision: 12, scale: 2 }),
  connectedAt: timestamp("connected_at"),
  sentimentScore: numeric("sentiment_score", { precision: 5, scale: 2 }),
  sentimentLabel: text("sentiment_label"),
  sentimentHistory: jsonb("sentiment_history").default([]),
  qualityScore: numeric("quality_score", { precision: 5, scale: 2 }),
  qualityBreakdown: jsonb("quality_breakdown"),
  csatPrediction: numeric("csat_prediction", { precision: 5, scale: 2 }),
  resolutionStatus: text("resolution_status"),
  tags: jsonb("tags").default([]),
  notes: text("notes"),
  billedDeploymentModel: text("billed_deployment_model"),
  billedRatePerMinute: numeric("billed_rate_per_minute", { precision: 12, scale: 6 }),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  campaignContactId: integer("campaign_contact_id"),
  destinationCountry: text("destination_country"),
  languageUsed: text("language_used"),
  translatedTranscript: text("translated_transcript"),
  translationConfidence: numeric("translation_confidence", { precision: 5, scale: 2 }),
  complianceDncChecked: boolean("compliance_dnc_checked").default(false),
  complianceDncResult: text("compliance_dnc_result"),
  complianceDisclosurePlayed: boolean("compliance_disclosure_played").default(false),
  complianceDisclosureAt: timestamp("compliance_disclosure_at"),
  complianceRecordingConsent: text("compliance_recording_consent"),
  complianceRecordingConsentAt: timestamp("compliance_recording_consent_at"),
  complianceOptOutDetected: boolean("compliance_opt_out_detected").default(false),
  complianceOptOutAt: timestamp("compliance_opt_out_at"),
  countrySurcharge: numeric("country_surcharge", { precision: 10, scale: 4 }),
  totalBilledRate: numeric("total_billed_rate", { precision: 12, scale: 6 }),
  twilioCallCost: numeric("twilio_call_cost", { precision: 10, scale: 4 }),
  llmTokensUsed: integer("llm_tokens_used"),
  sttCost: numeric("stt_cost", { precision: 10, scale: 4 }),
  ttsCost: numeric("tts_cost", { precision: 10, scale: 4 }),
  responseLatencyAvg: integer("response_latency_avg"),
}, (table) => [
  index("idx_call_logs_org_id").on(table.orgId),
  index("idx_call_logs_created_at").on(table.createdAt),
  index("idx_call_logs_campaign").on(table.campaignId),
  index("idx_call_logs_country").on(table.destinationCountry),
  index("idx_call_logs_org_status").on(table.orgId, table.status),
  index("idx_call_logs_org_agent").on(table.orgId, table.agentId),
  index("idx_call_logs_org_created").on(table.orgId, table.createdAt),
  index("idx_call_logs_started_at").on(table.startedAt),
]);

export const usageRecords = pgTable("usage_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  month: text("month").notNull(),
  minutesUsed: numeric("minutes_used", { precision: 10, scale: 2 }).default("0"),
  minuteLimit: integer("minute_limit").default(500),
  callCount: integer("call_count").default(0),
  leadsCaptured: integer("leads_captured").default(0),
  spendingCap: numeric("spending_cap", { precision: 12, scale: 2 }),
}, (table) => [
  index("idx_usage_records_org_month").on(table.orgId, table.month),
  uniqueIndex("uq_usage_records_org_month_user").on(table.orgId, table.month, table.userId),
]);

export const billingPlans = pgTable("billing_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  minutesIncluded: integer("minutes_included").notNull(),
  pricePerMonth: numeric("price_per_month", { precision: 12, scale: 2 }).notNull(),
  overagePerMinute: numeric("overage_per_minute", { precision: 10, scale: 4 }).notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  planId: integer("plan_id").notNull().references(() => billingPlans.id),
  status: text("status").default("active"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
}, (table) => [
  index("idx_subscriptions_org_id").on(table.orgId),
]);

export const billingLedger = pgTable("billing_ledger", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  callLogId: integer("call_log_id").unique().references(() => callLogs.id),
  providerCallId: text("provider_call_id"),
  startedAt: timestamp("started_at"),
  connectedAt: timestamp("connected_at"),
  endedAt: timestamp("ended_at"),
  billableSeconds: integer("billable_seconds").default(0),
  minChargeSeconds: integer("min_charge_seconds").default(30),
  ratePerMinute: numeric("rate_per_minute", { precision: 10, scale: 4 }).notNull(),
  cost: numeric("cost", { precision: 12, scale: 2 }).default("0").notNull(),
  currency: text("currency").default("GBP").notNull(),
  provider: text("provider"),
  status: text("status").default("pending").notNull(),
  deploymentModel: text("deployment_model"),
  idempotencyKey: text("idempotency_key").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_billing_ledger_org_id").on(table.orgId),
  index("idx_billing_ledger_org_status").on(table.orgId, table.status),
  index("idx_billing_ledger_created").on(table.createdAt),
]);

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  runAt: timestamp("run_at").defaultNow(),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  status: text("status").default("pending"),
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_jobs_status_created").on(table.status, table.createdAt),
  index("idx_jobs_type_status").on(table.type, table.status),
]);

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactName: text("contact_name"),
  partnerCode: text("partner_code").unique(),
  brandingLogo: text("branding_logo"),
  brandingPrimaryColor: text("branding_primary_color").default("#3B82F6"),
  brandingCompanyName: text("branding_company_name"),
  mobileAppEnabled: boolean("mobile_app_enabled").default(false),
  whitelabelMode: text("whitelabel_mode").default("co-branded"),
  customDomain: text("custom_domain"),
  tier: text("tier").default("BRONZE"),
  status: text("status").default("active"),
  partnerType: text("partner_type").default("business_partner"),
  wholesaleRatePerMinute: numeric("wholesale_rate_per_minute", { precision: 10, scale: 4 }).default("0.05"),
  resellerRatePerMinute: numeric("reseller_rate_per_minute", { precision: 10, scale: 4 }).default("0.04"),
  monthlyPlatformFee: numeric("monthly_platform_fee", { precision: 12, scale: 2 }).default("0"),
  revenueSharePercent: numeric("revenue_share_percent", { precision: 5, scale: 2 }).default("0"),
  maxClients: integer("max_clients").default(50),
  maxResellers: integer("max_resellers").default(20),
  featuresEnabled: jsonb("features_enabled").default(["voice_inbound", "call_logs", "agent_config"]),
  notes: text("notes"),
  parentPartnerId: integer("parent_partner_id"),
  orgId: integer("org_id").references(() => orgs.id),
  canCreateResellers: boolean("can_create_resellers").default(true),
  canSellDirect: boolean("can_sell_direct").default(true),
  canCreateAffiliates: boolean("can_create_affiliates").default(true),
  terminatedAt: timestamp("terminated_at"),
  terminationReason: text("termination_reason"),
  archivedAt: timestamp("archived_at"),
  legalHold: boolean("legal_hold").default(false),
  legalHoldReason: text("legal_hold_reason"),
  legalHoldSetAt: timestamp("legal_hold_set_at"),
  lastActivityAt: timestamp("last_activity_at"),
  lastPaymentAt: timestamp("last_payment_at"),
  gracePeriodEndsAt: timestamp("grace_period_ends_at"),
  autoSuspendAfterDays: integer("auto_suspend_after_days").default(30),
  healthScore: integer("health_score").default(100),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  suspendedAt: timestamp("suspended_at"),
}, (table) => [
  index("idx_partners_org_id").on(table.orgId),
  index("idx_partners_status").on(table.status),
  index("idx_partners_parent").on(table.parentPartnerId),
]);

export const partnerAgreements = pgTable("partner_agreements", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").notNull().references(() => partners.id),
  agreementType: text("agreement_type").notNull().default("standard"),
  status: text("status").default("active"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  autoRenew: boolean("auto_renew").default(true),
  noticePeriodDays: integer("notice_period_days").default(30),
  dataRetentionDays: integer("data_retention_days").default(90),
  commissionClawbackDays: integer("commission_clawback_days").default(60),
  minimumCommitmentAmount: numeric("minimum_commitment_amount", { precision: 12, scale: 2 }).default("0"),
  terminationFee: numeric("termination_fee", { precision: 12, scale: 2 }).default("0"),
  nonCompeteDays: integer("non_compete_days").default(0),
  dataExportIncluded: boolean("data_export_included").default(true),
  whitelabelRights: text("whitelabel_rights").default("co-branded"),
  slaUptimePercent: numeric("sla_uptime_percent", { precision: 5, scale: 2 }).default("99.5"),
  slaResponseTimeMinutes: integer("sla_response_time_minutes").default(60),
  customTerms: jsonb("custom_terms"),
  signedByPartner: boolean("signed_by_partner").default(false),
  signedByPlatform: boolean("signed_by_platform").default(false),
  signedAt: timestamp("signed_at"),
  terminatedAt: timestamp("terminated_at"),
  terminationInitiator: text("termination_initiator"),
  terminationNotes: text("termination_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_partner_agreements_partner").on(table.partnerId),
  index("idx_partner_agreements_status").on(table.status),
]);

export const partnerLifecycleEvents = pgTable("partner_lifecycle_events", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").notNull().references(() => partners.id),
  eventType: text("event_type").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  reason: text("reason"),
  initiatedBy: integer("initiated_by"),
  affectedClients: integer("affected_clients").default(0),
  affectedResellers: integer("affected_resellers").default(0),
  affectedAffiliates: integer("affected_affiliates").default(0),
  cascadeActions: jsonb("cascade_actions"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lifecycle_events_partner").on(table.partnerId),
  index("idx_lifecycle_events_type").on(table.eventType),
]);

export const partnerClients = pgTable("partner_clients", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").notNull().references(() => partners.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  status: text("status").default("active"),
  retailRatePerMinute: numeric("retail_rate_per_minute", { precision: 10, scale: 4 }),
  notes: text("notes"),
  reassignedFromPartnerId: integer("reassigned_from_partner_id"),
  reassignedAt: timestamp("reassigned_at"),
  rateFrozenUntil: timestamp("rate_frozen_until"),
  previousRate: numeric("previous_rate", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_partner_clients_org_id").on(table.orgId),
  index("idx_partner_clients_partner_id").on(table.partnerId),
  uniqueIndex("uq_partner_client_org").on(table.partnerId, table.orgId),
]);

export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  ownerType: text("owner_type").notNull().default("platform"),
  ownerId: integer("owner_id"),
  orgId: integer("org_id").references(() => orgs.id),
  userId: integer("user_id").references(() => users.id),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).default("10"),
  commissionType: text("commission_type").default("percentage"),
  cookieDurationDays: integer("cookie_duration_days").default(30),
  totalClicks: integer("total_clicks").default(0),
  totalSignups: integer("total_signups").default(0),
  totalEarnings: numeric("total_earnings", { precision: 12, scale: 2 }).default("0"),
  pendingPayout: numeric("pending_payout", { precision: 12, scale: 2 }).default("0"),
  lifetimePayouts: numeric("lifetime_payouts", { precision: 12, scale: 2 }).default("0"),
  status: text("status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_affiliates_org").on(table.orgId),
  index("idx_affiliates_owner").on(table.ownerType, table.ownerId),
  index("idx_affiliates_status").on(table.status),
]);

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull().references(() => affiliates.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrerUrl: text("referrer_url"),
  landingPage: text("landing_page"),
  convertedToSignup: boolean("converted_to_signup").default(false),
  convertedOrgId: integer("converted_org_id").references(() => orgs.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_affiliate_clicks_affiliate_id").on(table.affiliateId),
]);

export const affiliateCommissions = pgTable("affiliate_commissions", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull().references(() => affiliates.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  walletTransactionId: integer("wallet_transaction_id"),
  sourceAmount: numeric("source_amount", { precision: 12, scale: 2 }).notNull(),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  description: text("description"),
  clawbackEligibleUntil: timestamp("clawback_eligible_until"),
  clawedBackAt: timestamp("clawed_back_at"),
  clawbackReason: text("clawback_reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uq_aff_commission_txn").on(table.walletTransactionId, table.affiliateId),
  index("idx_aff_commission_org").on(table.orgId),
  index("idx_aff_commission_status").on(table.status),
]);

export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull().references(() => affiliates.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("GBP"),
  method: text("method").default("wallet_credit"),
  status: text("status").default("pending"),
  processedBy: integer("processed_by"),
  processedAt: timestamp("processed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentFlows = pgTable("agent_flows", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  name: text("name").notNull().default("Default Flow"),
  description: text("description"),
  nodes: jsonb("nodes").default([]),
  edges: jsonb("edges").default([]),
  entryAgentId: integer("entry_agent_id").references(() => agents.id),
  isActive: boolean("is_active").default(true),
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_agent_flows_org_id").on(table.orgId),
]);

export const callHops = pgTable("call_hops", {
  id: serial("id").primaryKey(),
  callLogId: integer("call_log_id").notNull().references(() => callLogs.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  fromAgentId: integer("from_agent_id").references(() => agents.id),
  toAgentId: integer("to_agent_id").notNull().references(() => agents.id),
  hopOrder: integer("hop_order").notNull().default(0),
  reason: text("reason"),
  durationSeconds: integer("duration_seconds").default(0),
  hopCost: numeric("hop_cost", { precision: 12, scale: 2 }).default("0"),
  status: text("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").unique().notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id"),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_log_created_at").on(table.createdAt),
  index("idx_audit_log_actor").on(table.actorId),
  index("idx_audit_log_action").on(table.action),
  index("idx_audit_log_entity").on(table.entityType, table.entityId),
]);

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sourceType: text("source_type").default("manual"),
  sourceUrl: text("source_url"),
  status: text("status").default("pending"),
  chunkCount: integer("chunk_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_knowledge_docs_org_id").on(table.orgId),
]);

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => knowledgeDocuments.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
  chunkIndex: integer("chunk_index").default(0),
  tokenCount: integer("token_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_knowledge_chunks_doc_id").on(table.documentId),
  index("idx_knowledge_chunks_org_id").on(table.orgId),
]);

export const responseCache = pgTable("response_cache", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  queryEmbedding: vector("query_embedding", { dimensions: 768 }),
  queryText: text("query_text").notNull(),
  responseText: text("response_text").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 2 }).default("0"),
  hitCount: integer("hit_count").default(0),
  lastHitAt: timestamp("last_hit_at"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const doNotCallList = pgTable("do_not_call_list", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  phoneNumber: text("phone_number").notNull(),
  reason: text("reason"),
  source: text("source"),
  addedBy: integer("added_by").references(() => users.id),
  notes: text("notes"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_dnc_org_phone").on(table.orgId, table.phoneNumber),
]);

export const consentRecords = pgTable("consent_records", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  phoneNumber: text("phone_number").notNull(),
  consentType: text("consent_type").notNull(),
  consentGiven: boolean("consent_given").notNull(),
  consentMethod: text("consent_method"),
  consentText: text("consent_text"),
  ipAddress: text("ip_address"),
  callLogId: integer("call_log_id").references(() => callLogs.id),
  revokedAt: timestamp("revoked_at"),
  revokedReason: text("revoked_reason"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_consent_org_phone").on(table.orgId, table.phoneNumber),
]);

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export const insertOrgSchema = createInsertSchema(orgs).omit({ id: true, createdAt: true });
export type InsertOrg = z.infer<typeof insertOrgSchema>;
export type Org = typeof orgs.$inferSelect;

export const insertOrgMemberSchema = createInsertSchema(orgMembers).omit({ id: true });
export type InsertOrgMember = z.infer<typeof insertOrgMemberSchema>;
export type OrgMember = typeof orgMembers.$inferSelect;

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

export const insertCallLogSchema = createInsertSchema(callLogs).omit({ id: true, createdAt: true });
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type CallLog = typeof callLogs.$inferSelect;

export const insertUsageRecordSchema = createInsertSchema(usageRecords).omit({ id: true });
export type InsertUsageRecord = z.infer<typeof insertUsageRecordSchema>;
export type UsageRecord = typeof usageRecords.$inferSelect;

export const insertBillingPlanSchema = createInsertSchema(billingPlans).omit({ id: true });
export type InsertBillingPlan = z.infer<typeof insertBillingPlanSchema>;
export type BillingPlan = typeof billingPlans.$inferSelect;

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, startDate: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export const insertBillingLedgerSchema = createInsertSchema(billingLedger).omit({ id: true, createdAt: true });
export type InsertBillingLedger = z.infer<typeof insertBillingLedgerSchema>;
export type BillingLedger = typeof billingLedger.$inferSelect;

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export const insertPartnerSchema = createInsertSchema(partners).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Partner = typeof partners.$inferSelect;

export const insertPartnerClientSchema = createInsertSchema(partnerClients).omit({ id: true, createdAt: true });
export type InsertPartnerClient = z.infer<typeof insertPartnerClientSchema>;
export type PartnerClient = typeof partnerClients.$inferSelect;

export const insertPartnerAgreementSchema = createInsertSchema(partnerAgreements).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPartnerAgreement = z.infer<typeof insertPartnerAgreementSchema>;
export type PartnerAgreement = typeof partnerAgreements.$inferSelect;

export const insertPartnerLifecycleEventSchema = createInsertSchema(partnerLifecycleEvents).omit({ id: true, createdAt: true });
export type InsertPartnerLifecycleEvent = z.infer<typeof insertPartnerLifecycleEventSchema>;
export type PartnerLifecycleEvent = typeof partnerLifecycleEvents.$inferSelect;

export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({ id: true, updatedAt: true });
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

export const insertKnowledgeDocumentSchema = createInsertSchema(knowledgeDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKnowledgeDocument = z.infer<typeof insertKnowledgeDocumentSchema>;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;

export const insertKnowledgeChunkSchema = createInsertSchema(knowledgeChunks).omit({ id: true, createdAt: true });
export type InsertKnowledgeChunk = z.infer<typeof insertKnowledgeChunkSchema>;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;

export const insertResponseCacheSchema = createInsertSchema(responseCache).omit({ id: true, createdAt: true });
export type InsertResponseCache = z.infer<typeof insertResponseCacheSchema>;
export type ResponseCache = typeof responseCache.$inferSelect;

export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").unique().notNull().references(() => orgs.id),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0").notNull(),
  currency: text("currency").default("GBP").notNull(),
  lowBalanceThreshold: numeric("low_balance_threshold", { precision: 12, scale: 2 }).default("10"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  balanceBefore: numeric("balance_before", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  idempotencyKey: text("idempotency_key"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_wallet_txn_org_id").on(table.orgId),
  index("idx_wallet_txn_created_at").on(table.createdAt),
  index("idx_wallet_txn_org_type").on(table.orgId, table.type),
  index("idx_wallet_txn_ref").on(table.referenceType, table.referenceId),
  uniqueIndex("uq_wallet_txn_idempotency").on(table.idempotencyKey),
]);

export const costEvents = pgTable("cost_events", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  callLogId: integer("call_log_id").references(() => callLogs.id),
  category: text("category").notNull(),
  provider: text("provider").notNull(),
  model: text("model"),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  unitQuantity: numeric("unit_quantity", { precision: 12, scale: 4 }).default("0"),
  unitType: text("unit_type").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 6 }).notNull(),
  totalCost: numeric("total_cost", { precision: 12, scale: 6 }).notNull(),
  revenueCharged: numeric("revenue_charged", { precision: 12, scale: 2 }).default("0"),
  margin: numeric("margin", { precision: 12, scale: 6 }).default("0"),
  currency: text("currency").default("GBP"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_cost_events_org_id").on(table.orgId),
  index("idx_cost_events_call_log_id").on(table.callLogId),
  index("idx_cost_events_category").on(table.category),
  index("idx_cost_events_created_at").on(table.createdAt),
  index("idx_cost_events_org_category").on(table.orgId, table.category),
]);

export const insertCostEventSchema = createInsertSchema(costEvents).omit({ id: true, createdAt: true });
export type InsertCostEvent = z.infer<typeof insertCostEventSchema>;
export type CostEvent = typeof costEvents.$inferSelect;

export const costConfig = pgTable("cost_config", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  provider: text("provider").default("gorigo"),
  unitCostAmount: numeric("unit_cost_amount", { precision: 10, scale: 4 }).notNull(),
  unitType: text("unit_type").notNull(),
  markupPercent: numeric("markup_percent", { precision: 5, scale: 2 }).default("40"),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rateCards = pgTable("rate_cards", {
  id: serial("id").primaryKey(),
  deploymentModel: text("deployment_model").notNull(),
  category: text("category").notNull(),
  label: text("label").notNull(),
  ratePerMinute: numeric("rate_per_minute", { precision: 10, scale: 4 }).notNull(),
  platformFeePerMinute: numeric("platform_fee_per_minute", { precision: 10, scale: 4 }).notNull(),
  includesAiCost: boolean("includes_ai_cost").default(true),
  includesTelephonyCost: boolean("includes_telephony_cost").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRateCardSchema = createInsertSchema(rateCards).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRateCard = z.infer<typeof insertRateCardSchema>;
export type RateCard = typeof rateCards.$inferSelect;

export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true });
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

export const insertCostConfigSchema = createInsertSchema(costConfig).omit({ id: true, createdAt: true });
export type InsertCostConfig = z.infer<typeof insertCostConfigSchema>;
export type CostConfig = typeof costConfig.$inferSelect;

export const insertAgentFlowSchema = createInsertSchema(agentFlows).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgentFlow = z.infer<typeof insertAgentFlowSchema>;
export type AgentFlow = typeof agentFlows.$inferSelect;

export const insertCallHopSchema = createInsertSchema(callHops).omit({ id: true, createdAt: true });
export type InsertCallHop = z.infer<typeof insertCallHopSchema>;
export type CallHop = typeof callHops.$inferSelect;

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type Affiliate = typeof affiliates.$inferSelect;

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).omit({ id: true, createdAt: true });
export type InsertAffiliateClick = z.infer<typeof insertAffiliateClickSchema>;
export type AffiliateClick = typeof affiliateClicks.$inferSelect;

export const insertAffiliateCommissionSchema = createInsertSchema(affiliateCommissions).omit({ id: true, createdAt: true });
export type InsertAffiliateCommission = z.infer<typeof insertAffiliateCommissionSchema>;
export type AffiliateCommission = typeof affiliateCommissions.$inferSelect;

export const insertAffiliatePayoutSchema = createInsertSchema(affiliatePayouts).omit({ id: true, createdAt: true });
export type InsertAffiliatePayout = z.infer<typeof insertAffiliatePayoutSchema>;
export type AffiliatePayout = typeof affiliatePayouts.$inferSelect;

export const twilioPhoneNumbers = pgTable("twilio_phone_numbers", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").unique().notNull(),
  friendlyName: text("friendly_name"),
  orgId: integer("org_id").references(() => orgs.id),
  twilioSid: text("twilio_sid"),
  capabilities: jsonb("capabilities").default({ voice: true, sms: false }),
  isActive: boolean("is_active").default(true),
  assignedAt: timestamp("assigned_at"),
  createdAt: timestamp("created_at").defaultNow(),
  countryCode: text("country_code"),
  numberType: text("number_type").default("local"),
  subAccountId: integer("sub_account_id"),
  healthScore: integer("health_score").default(100),
  answerRate: numeric("answer_rate", { precision: 5, scale: 2 }),
  totalCallsMade: integer("total_calls_made").default(0),
  spamFlagged: boolean("spam_flagged").default(false),
  spamFlaggedAt: timestamp("spam_flagged_at"),
  lastUsedAt: timestamp("last_used_at"),
  monthlyRentalCost: numeric("monthly_rental_cost", { precision: 10, scale: 4 }),
  provisioningStatus: text("provisioning_status").default("active"),
  regulatoryBundleSid: text("regulatory_bundle_sid"),
  campaignId: integer("campaign_id"),
}, (table) => [
  index("idx_phone_numbers_country").on(table.countryCode),
  index("idx_phone_numbers_org").on(table.orgId),
]);

export const distributionLedger = pgTable("distribution_ledger", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  billingLedgerId: integer("billing_ledger_id").references(() => billingLedger.id),
  walletTransactionId: integer("wallet_transaction_id"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  platformAmount: numeric("platform_amount", { precision: 12, scale: 2 }).notNull(),
  partnerAmount: numeric("partner_amount", { precision: 12, scale: 2 }).default("0"),
  partnerId: integer("partner_id"),
  resellerAmount: numeric("reseller_amount", { precision: 12, scale: 2 }).default("0"),
  resellerId: integer("reseller_id"),
  affiliateAmount: numeric("affiliate_amount", { precision: 12, scale: 2 }).default("0"),
  affiliateId: integer("affiliate_id"),
  channel: text("channel").notNull().default("d2c"),
  referenceId: text("reference_id"),
  status: text("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_distribution_ledger_org").on(table.orgId),
  index("idx_distribution_ledger_status").on(table.status),
  uniqueIndex("uq_distribution_ref").on(table.referenceId),
]);

export const failedDistributions = pgTable("failed_distributions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  deductionAmount: numeric("deduction_amount", { precision: 12, scale: 2 }).notNull(),
  walletTransactionId: integer("wallet_transaction_id"),
  description: text("description"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  status: text("status").default("pending"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDistributionLedgerSchema = createInsertSchema(distributionLedger).omit({ id: true, createdAt: true });
export type InsertDistributionLedger = z.infer<typeof insertDistributionLedgerSchema>;
export type DistributionLedger = typeof distributionLedger.$inferSelect;

export const insertFailedDistributionSchema = createInsertSchema(failedDistributions).omit({ id: true, createdAt: true });
export type InsertFailedDistribution = z.infer<typeof insertFailedDistributionSchema>;
export type FailedDistribution = typeof failedDistributions.$inferSelect;

export const insertTwilioPhoneNumberSchema = createInsertSchema(twilioPhoneNumbers).omit({ id: true, createdAt: true });
export type InsertTwilioPhoneNumber = z.infer<typeof insertTwilioPhoneNumberSchema>;
export type TwilioPhoneNumber = typeof twilioPhoneNumbers.$inferSelect;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pwd_reset_user_id").on(table.userId),
  index("idx_pwd_reset_expires_at").on(table.expiresAt),
]);

export const insertDoNotCallSchema = createInsertSchema(doNotCallList).omit({ id: true, createdAt: true });
export type InsertDoNotCall = z.infer<typeof insertDoNotCallSchema>;
export type DoNotCall = typeof doNotCallList.$inferSelect;

export const insertConsentRecordSchema = createInsertSchema(consentRecords).omit({ id: true, createdAt: true });
export type InsertConsentRecord = z.infer<typeof insertConsentRecordSchema>;
export type ConsentRecord = typeof consentRecords.$inferSelect;

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  name: text("name").notNull(),
  description: text("description"),
  agentId: integer("agent_id").references(() => agents.id),
  status: text("status").default("draft"),
  contactList: jsonb("contact_list").default([]),
  completedContacts: jsonb("completed_contacts").default([]),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  totalContacts: integer("total_contacts").default(0),
  completedCount: integer("completed_count").default(0),
  failedCount: integer("failed_count").default(0),
  callInterval: integer("call_interval").default(30),
  maxRetries: integer("max_retries").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  campaignType: text("campaign_type").default("outbound"),
  countryCode: text("country_code"),
  language: text("language").default("en-GB"),
  phoneNumberId: integer("phone_number_id"),
  script: text("script"),
  scriptLanguage: text("script_language"),
  scriptVersion: integer("script_version").default(1),
  callingHoursStart: text("calling_hours_start"),
  callingHoursEnd: text("calling_hours_end"),
  callingTimezone: text("calling_timezone"),
  pacingCallsPerMinute: integer("pacing_calls_per_minute").default(5),
  pacingMaxConcurrent: integer("pacing_max_concurrent").default(3),
  pacingRampUpMinutes: integer("pacing_ramp_up_minutes").default(5),
  retryMaxAttempts: integer("retry_max_attempts").default(3),
  retryIntervalMinutes: integer("retry_interval_minutes").default(60),
  retryWindowStart: text("retry_window_start"),
  retryWindowEnd: text("retry_window_end"),
  budgetCap: numeric("budget_cap", { precision: 12, scale: 2 }),
  budgetSpent: numeric("budget_spent", { precision: 12, scale: 2 }).default("0"),
  budgetAlertThreshold: numeric("budget_alert_threshold", { precision: 5, scale: 2 }).default("80"),
  dailySpendLimit: numeric("daily_spend_limit", { precision: 12, scale: 2 }),
  answeredCount: integer("answered_count").default(0),
  convertedCount: integer("converted_count").default(0),
  optOutCount: integer("opt_out_count").default(0),
  conversionDefinition: text("conversion_definition"),
  pausedAt: timestamp("paused_at"),
  pausedReason: text("paused_reason"),
  archivedAt: timestamp("archived_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_campaigns_org_status").on(table.orgId, table.status),
  index("idx_campaigns_country").on(table.countryCode),
]);

export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, createdAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  url: text("url").notNull(),
  events: text("events").array().default([]),
  secret: text("secret"),
  isActive: boolean("is_active").default(true),
  lastTriggered: timestamp("last_triggered"),
  failureCount: integer("failure_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({ id: true, createdAt: true, lastTriggered: true, failureCount: true });
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orgId: integer("org_id").references(() => orgs.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  actionUrl: text("action_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
  index("idx_notifications_user_read").on(table.userId, table.isRead),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, isRead: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  isRevoked: boolean("is_revoked").default(false),
  revokedAt: timestamp("revoked_at"),
  scopes: text("scopes").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true, lastUsedAt: true, isRevoked: true, revokedAt: true });
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

export const demoLeads = pgTable("demo_leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  message: text("message"),
  source: text("source").default("chatgpt"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDemoLeadSchema = createInsertSchema(demoLeads).omit({ id: true, createdAt: true });
export type InsertDemoLead = z.infer<typeof insertDemoLeadSchema>;
export type DemoLead = typeof demoLeads.$inferSelect;

// ═══════════════════════════════════════════════════
// FINANCE MODULE (ERP / Accounting)
// ═══════════════════════════════════════════════════

export const finWorkspaces = pgTable("fin_workspaces", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  name: text("name").notNull(),
  type: text("type").notNull().default("company"),
  currency: text("currency").default("GBP"),
  fiscalYearStart: integer("fiscal_year_start").default(4),
  vatRegistered: boolean("vat_registered").default(false),
  vatNumber: text("vat_number"),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  companyEmail: text("company_email"),
  companyPhone: text("company_phone"),
  invoicePrefix: text("invoice_prefix").default("INV"),
  nextInvoiceNumber: integer("next_invoice_number").default(1001),
  billPrefix: text("bill_prefix").default("BILL"),
  nextBillNumber: integer("next_bill_number").default(1001),
  creditNotePrefix: text("credit_note_prefix").default("CN"),
  nextCreditNoteNumber: integer("next_credit_note_number").default(1001),
  createdAt: timestamp("created_at").defaultNow(),
});

export const finAccounts = pgTable("fin_accounts", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => finWorkspaces.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  subtype: text("subtype"),
  description: text("description"),
  isSystem: boolean("is_system").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const finCustomers = pgTable("fin_customers", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => finWorkspaces.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  taxId: text("tax_id"),
  notes: text("notes"),
  defaultPaymentTerms: integer("default_payment_terms").default(30),
  totalInvoiced: numeric("total_invoiced", { precision: 12, scale: 2 }).default("0"),
  totalPaid: numeric("total_paid", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const finSuppliers = pgTable("fin_suppliers", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => finWorkspaces.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  taxId: text("tax_id"),
  notes: text("notes"),
  defaultPaymentTerms: integer("default_payment_terms").default(30),
  totalBilled: numeric("total_billed", { precision: 12, scale: 2 }).default("0"),
  totalPaid: numeric("total_paid", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const finInvoices = pgTable("fin_invoices", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => finWorkspaces.id),
  customerId: integer("customer_id").notNull().references(() => finCustomers.id),
  invoiceNumber: text("invoice_number").notNull(),
  status: text("status").notNull().default("draft"),
  issueDate: timestamp("issue_date").defaultNow(),
  dueDate: timestamp("due_date"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).default("0"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  terms: text("terms"),
  currency: text("currency").default("GBP"),
  journalEntryId: integer("journal_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("invoice_ws_number").on(table.workspaceId, table.invoiceNumber),
]);

export const finInvoiceLines = pgTable("fin_invoice_lines", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => finInvoices.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 4 }).default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  amount: numeric("amount", { precision: 12, scale: 2 }).default("0"),
  accountId: integer("account_id"),
  sortOrder: integer("sort_order").default(0),
});

export const finCreditNotes = pgTable("fin_credit_notes", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => finWorkspaces.id),
  invoiceId: integer("invoice_id").references(() => finInvoices.id),
  customerId: integer("customer_id").notNull().references(() => finCustomers.id),
  creditNoteNumber: text("credit_note_number").notNull(),
  status: text("status").notNull().default("draft"),
  issueDate: timestamp("issue_date").defaultNow(),
  reason: text("reason"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
  taxTotal: numeric("tax_total", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).default("0"),
  amountApplied: numeric("amount_applied", { precision: 12, scale: 2 }).default("0"),
  journalEntryId: integer("journal_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("credit_note_ws_number").on(table.workspaceId, table.creditNoteNumber),
]);

export const finCreditNoteLines = pgTable("fin_credit_note_lines", {
  id: serial("id").primaryKey(),
  creditNoteId: integer("credit_note_id").notNull().references(() => finCreditNotes.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 4 }).default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  accountId: integer("account_id").references(() => finAccounts.id),
});

export const finBills = pgTable("fin_bills", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => finWorkspaces.id),
  supplierId: integer("supplier_id").notNull().references(() => finSuppliers.id),
  billNumber: text("bill_number").notNull(),
  status: text("status").notNull().default("draft"),
  category: text("category"),
  issueDate: timestamp("issue_date").defaultNow(),
  dueDate: timestamp("due_date"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).default("0"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
  currency: text("currency").default("GBP"),
  journalEntryId: integer("journal_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("bill_ws_number").on(table.workspaceId, table.billNumber),
]);

export const finBillLines = pgTable("fin_bill_lines", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => finBills.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 4 }).default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  amount: numeric("amount", { precision: 12, scale: 2 }).default("0"),
  accountId: integer("account_id"),
  sortOrder: integer("sort_order").default(0),
});

export const finPayments = pgTable("fin_payments", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => finWorkspaces.id),
  type: text("type").notNull(),
  invoiceId: integer("invoice_id"),
  billId: integer("bill_id"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow(),
  method: text("method").default("bank_transfer"),
  reference: text("reference"),
  notes: text("notes"),
  accountId: integer("account_id"),
  journalEntryId: integer("journal_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const finJournalEntries = pgTable("fin_journal_entries", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => finWorkspaces.id),
  entryDate: timestamp("entry_date").defaultNow(),
  reference: text("reference"),
  description: text("description"),
  sourceType: text("source_type"),
  sourceId: integer("source_id"),
  isManual: boolean("is_manual").default(false),
  isPosted: boolean("is_posted").default(false),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const finJournalLines = pgTable("fin_journal_lines", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").notNull().references(() => finJournalEntries.id),
  accountId: integer("account_id").notNull().references(() => finAccounts.id),
  debit: numeric("debit", { precision: 12, scale: 2 }).default("0"),
  credit: numeric("credit", { precision: 12, scale: 2 }).default("0"),
  description: text("description"),
});

export const finTaxCodes = pgTable("fin_tax_codes", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => finWorkspaces.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  rate: numeric("rate", { precision: 5, scale: 2 }).notNull(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
});

export const finAuditLog = pgTable("fin_audit_log", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => finWorkspaces.id),
  userId: integer("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  changes: jsonb("changes"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFinWorkspaceSchema = createInsertSchema(finWorkspaces).omit({ id: true, createdAt: true });
export type InsertFinWorkspace = z.infer<typeof insertFinWorkspaceSchema>;
export type FinWorkspace = typeof finWorkspaces.$inferSelect;

export const insertFinAccountSchema = createInsertSchema(finAccounts).omit({ id: true, createdAt: true });
export type InsertFinAccount = z.infer<typeof insertFinAccountSchema>;
export type FinAccount = typeof finAccounts.$inferSelect;

export const insertFinCustomerSchema = createInsertSchema(finCustomers).omit({ id: true, createdAt: true });
export type InsertFinCustomer = z.infer<typeof insertFinCustomerSchema>;
export type FinCustomer = typeof finCustomers.$inferSelect;

export const insertFinSupplierSchema = createInsertSchema(finSuppliers).omit({ id: true, createdAt: true });
export type InsertFinSupplier = z.infer<typeof insertFinSupplierSchema>;
export type FinSupplier = typeof finSuppliers.$inferSelect;

export const insertFinInvoiceSchema = createInsertSchema(finInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinInvoice = z.infer<typeof insertFinInvoiceSchema>;
export type FinInvoice = typeof finInvoices.$inferSelect;

export const insertFinInvoiceLineSchema = createInsertSchema(finInvoiceLines).omit({ id: true });
export type InsertFinInvoiceLine = z.infer<typeof insertFinInvoiceLineSchema>;
export type FinInvoiceLine = typeof finInvoiceLines.$inferSelect;

export const insertCreditNoteSchema = createInsertSchema(finCreditNotes).omit({ id: true, createdAt: true });
export type InsertCreditNote = z.infer<typeof insertCreditNoteSchema>;
export type CreditNote = typeof finCreditNotes.$inferSelect;

export const insertCreditNoteLineSchema = createInsertSchema(finCreditNoteLines).omit({ id: true });
export type InsertCreditNoteLine = z.infer<typeof insertCreditNoteLineSchema>;
export type CreditNoteLine = typeof finCreditNoteLines.$inferSelect;

export const insertFinBillSchema = createInsertSchema(finBills).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinBill = z.infer<typeof insertFinBillSchema>;
export type FinBill = typeof finBills.$inferSelect;

export const insertFinBillLineSchema = createInsertSchema(finBillLines).omit({ id: true });
export type InsertFinBillLine = z.infer<typeof insertFinBillLineSchema>;
export type FinBillLine = typeof finBillLines.$inferSelect;

export const insertFinPaymentSchema = createInsertSchema(finPayments).omit({ id: true, createdAt: true });
export type InsertFinPayment = z.infer<typeof insertFinPaymentSchema>;
export type FinPayment = typeof finPayments.$inferSelect;

export const insertFinJournalEntrySchema = createInsertSchema(finJournalEntries).omit({ id: true, createdAt: true });
export type InsertFinJournalEntry = z.infer<typeof insertFinJournalEntrySchema>;
export type FinJournalEntry = typeof finJournalEntries.$inferSelect;

export const insertFinJournalLineSchema = createInsertSchema(finJournalLines).omit({ id: true });
export type InsertFinJournalLine = z.infer<typeof insertFinJournalLineSchema>;
export type FinJournalLine = typeof finJournalLines.$inferSelect;

export const insertFinTaxCodeSchema = createInsertSchema(finTaxCodes).omit({ id: true });
export type InsertFinTaxCode = z.infer<typeof insertFinTaxCodeSchema>;
export type FinTaxCode = typeof finTaxCodes.$inferSelect;

export const insertFinAuditLogSchema = createInsertSchema(finAuditLog).omit({ id: true, createdAt: true });
export type InsertFinAuditLog = z.infer<typeof insertFinAuditLogSchema>;
export type FinAuditLog = typeof finAuditLog.$inferSelect;

export const deploymentModelChanges = pgTable("deployment_model_changes", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  oldModel: text("old_model").notNull(),
  newModel: text("new_model").notNull(),
  status: text("status").notNull().default("pending"),
  reason: text("reason"),
  prerequisitesMet: jsonb("prerequisites_met"),
  activeCallsAtSwitch: integer("active_calls_at_switch").default(0),
  initiatedBy: integer("initiated_by").notNull().references(() => users.id),
  initiatedByEmail: text("initiated_by_email"),
  effectiveAt: timestamp("effective_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeploymentModelChangeSchema = createInsertSchema(deploymentModelChanges).omit({ id: true, createdAt: true });
export type InsertDeploymentModelChange = z.infer<typeof insertDeploymentModelChangeSchema>;
export type DeploymentModelChange = typeof deploymentModelChanges.$inferSelect;

export const chatLeads = pgTable("chat_leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  ipAddress: text("ip_address"),
  status: text("status").default("new"),
  totalMessages: integer("total_messages").default(0),
  lastMessageAt: timestamp("last_message_at"),
  phone: text("phone"),
  company: text("company"),
  companyDomain: text("company_domain"),
  industry: text("industry"),
  estimatedSize: text("estimated_size"),
  leadScore: integer("lead_score").default(0),
  pipelineStage: text("pipeline_stage").default("new"),
  assignedTo: integer("assigned_to"),
  tags: text("tags").array(),
  enrichedAt: timestamp("enriched_at"),
  enrichmentData: jsonb("enrichment_data"),
  sourceChannel: text("source_channel").default("chatbot"),
  lastContactedAt: timestamp("last_contacted_at"),
  orgId: integer("org_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const publicConversations = pgTable("public_conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  channel: text("channel").notNull().default("chatbot"),
  status: text("status").notNull().default("active"),
  messageCount: integer("message_count").notNull().default(0),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  leadId: integer("lead_id").references(() => chatLeads.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"),
}, (table) => [
  index("idx_public_conversations_session_id").on(table.sessionId),
  index("idx_public_conversations_channel").on(table.channel),
  index("idx_public_conversations_started_at").on(table.startedAt),
]);

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => chatLeads.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").references(() => publicConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_chat_messages_lead_id").on(table.leadId),
  index("idx_chat_messages_conversation_id").on(table.conversationId),
]);

export const insertChatLeadSchema = createInsertSchema(chatLeads).omit({ id: true, createdAt: true, totalMessages: true, lastMessageAt: true, leadScore: true, enrichedAt: true, enrichmentData: true });
export type InsertChatLead = z.infer<typeof insertChatLeadSchema>;
export type ChatLead = typeof chatLeads.$inferSelect;

export const insertPublicConversationSchema = createInsertSchema(publicConversations).omit({ id: true, startedAt: true, messageCount: true });
export type InsertPublicConversation = z.infer<typeof insertPublicConversationSchema>;
export type PublicConversation = typeof publicConversations.$inferSelect;

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => chatLeads.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  performedBy: integer("performed_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_activities_lead_id").on(table.leadId),
]);

export const insertLeadActivitySchema = createInsertSchema(leadActivities).omit({ id: true, createdAt: true });
export type InsertLeadActivity = z.infer<typeof insertLeadActivitySchema>;
export type LeadActivity = typeof leadActivities.$inferSelect;

// ═══════════════════════════════════════════════════
// INTERNATIONAL CALLING — COUNTRIES & COMPLIANCE
// ═══════════════════════════════════════════════════

export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  isoCode: text("iso_code").unique().notNull(),
  name: text("name").notNull(),
  callingCode: text("calling_code").notNull(),
  timezone: text("timezone").notNull(),
  currency: text("currency").notNull(),
  tier: integer("tier").notNull().default(2),
  status: text("status").notNull().default("coming_soon"),
  flagEmoji: text("flag_emoji"),
  region: text("region"),
  numberFormats: jsonb("number_formats"),
  requiresKyc: boolean("requires_kyc").default(false),
  requiresLocalPresence: boolean("requires_local_presence").default(false),
  sanctioned: boolean("sanctioned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_countries_iso_code").on(table.isoCode),
  index("idx_countries_tier").on(table.tier),
  index("idx_countries_status").on(table.status),
]);

export const countryComplianceProfiles = pgTable("country_compliance_profiles", {
  id: serial("id").primaryKey(),
  countryId: integer("country_id").notNull().references(() => countries.id),
  callingHoursStart: text("calling_hours_start").notNull().default("09:00"),
  callingHoursEnd: text("calling_hours_end").notNull().default("20:00"),
  callingHoursTimezone: text("calling_hours_timezone").notNull(),
  restrictedDays: jsonb("restricted_days").default([]),
  dncRegistryName: text("dnc_registry_name"),
  dncRegistryUrl: text("dnc_registry_url"),
  dncCheckMethod: text("dnc_check_method").default("manual"),
  dncApiEndpoint: text("dnc_api_endpoint"),
  aiDisclosureRequired: boolean("ai_disclosure_required").default(true),
  aiDisclosureScript: text("ai_disclosure_script"),
  aiDisclosureLanguage: text("ai_disclosure_language"),
  recordingConsentType: text("recording_consent_type").notNull().default("one_party"),
  recordingConsentScript: text("recording_consent_script"),
  maxCallAttemptsPerDay: integer("max_call_attempts_per_day").default(3),
  maxCallAttemptsPerWeek: integer("max_call_attempts_per_week").default(10),
  coolingOffHours: integer("cooling_off_hours").default(24),
  dataRetentionDays: integer("data_retention_days").default(90),
  dataResidencyRequired: boolean("data_residency_required").default(false),
  dataResidencyRegion: text("data_residency_region"),
  regulatoryBody: text("regulatory_body"),
  regulatoryUrl: text("regulatory_url"),
  notes: text("notes"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("uq_compliance_country").on(table.countryId),
]);

export const countryRateCards = pgTable("country_rate_cards", {
  id: serial("id").primaryKey(),
  countryId: integer("country_id").notNull().references(() => countries.id),
  deploymentModel: text("deployment_model").notNull(),
  direction: text("direction").notNull().default("outbound"),
  numberType: text("number_type").notNull().default("mobile"),
  surchargePerMinute: numeric("surcharge_per_minute", { precision: 10, scale: 4 }).notNull(),
  twilioEstimatedCost: numeric("twilio_estimated_cost", { precision: 10, scale: 4 }),
  marginPercent: numeric("margin_percent", { precision: 5, scale: 2 }).default("20"),
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_country_rates_country").on(table.countryId),
  index("idx_country_rates_model").on(table.deploymentModel),
  uniqueIndex("uq_country_rate").on(table.countryId, table.deploymentModel, table.direction, table.numberType),
]);

export const countryHolidays = pgTable("country_holidays", {
  id: serial("id").primaryKey(),
  countryId: integer("country_id").notNull().references(() => countries.id),
  name: text("name").notNull(),
  date: text("date").notNull(),
  isRecurring: boolean("is_recurring").default(false),
  noCallingAllowed: boolean("no_calling_allowed").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_holidays_country").on(table.countryId),
]);

// ═══════════════════════════════════════════════════
// INTERNATIONAL CALLING — TWILIO SUB-ACCOUNTS
// ═══════════════════════════════════════════════════

export const twilioSubAccounts = pgTable("twilio_sub_accounts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").unique().notNull().references(() => orgs.id),
  twilioAccountSid: text("twilio_account_sid").unique(),
  twilioAuthToken: text("twilio_auth_token"),
  friendlyName: text("friendly_name"),
  status: text("status").notNull().default("pending"),
  concurrentCallLimit: integer("concurrent_call_limit").default(10),
  dailySpendLimit: numeric("daily_spend_limit", { precision: 12, scale: 2 }),
  currentDailySpend: numeric("current_daily_spend", { precision: 12, scale: 2 }).default("0"),
  lastSpendResetAt: timestamp("last_spend_reset_at"),
  suspendedReason: text("suspended_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_twilio_sub_org").on(table.orgId),
]);

// ═══════════════════════════════════════════════════
// INTERNATIONAL CALLING — CAMPAIGN CONTACTS
// ═══════════════════════════════════════════════════

export const campaignContacts = pgTable("campaign_contacts", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  phoneNumber: text("phone_number").notNull(),
  phoneNumberE164: text("phone_number_e164").notNull(),
  countryCode: text("country_code"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactMetadata: jsonb("contact_metadata"),
  status: text("status").notNull().default("pending"),
  dncChecked: boolean("dnc_checked").default(false),
  dncResult: text("dnc_result"),
  dncCheckedAt: timestamp("dnc_checked_at"),
  attemptCount: integer("attempt_count").default(0),
  maxAttempts: integer("max_attempts").default(3),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAfter: timestamp("next_retry_after"),
  lastCallDisposition: text("last_call_disposition"),
  callLogId: integer("call_log_id"),
  optedOut: boolean("opted_out").default(false),
  optedOutAt: timestamp("opted_out_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_campaign_contacts_campaign").on(table.campaignId),
  index("idx_campaign_contacts_org").on(table.orgId),
  index("idx_campaign_contacts_status").on(table.status),
  index("idx_campaign_contacts_phone").on(table.phoneNumberE164),
  uniqueIndex("uq_campaign_contact_phone").on(table.campaignId, table.phoneNumberE164),
]);

// ═══════════════════════════════════════════════════
// INTERNATIONAL CALLING — INSERT SCHEMAS & TYPES
// ═══════════════════════════════════════════════════

export const insertCountrySchema = createInsertSchema(countries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Country = typeof countries.$inferSelect;

export const insertCountryComplianceProfileSchema = createInsertSchema(countryComplianceProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCountryComplianceProfile = z.infer<typeof insertCountryComplianceProfileSchema>;
export type CountryComplianceProfile = typeof countryComplianceProfiles.$inferSelect;

export const insertCountryRateCardSchema = createInsertSchema(countryRateCards).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCountryRateCard = z.infer<typeof insertCountryRateCardSchema>;
export type CountryRateCard = typeof countryRateCards.$inferSelect;

export const insertCountryHolidaySchema = createInsertSchema(countryHolidays).omit({ id: true, createdAt: true });
export type InsertCountryHoliday = z.infer<typeof insertCountryHolidaySchema>;
export type CountryHoliday = typeof countryHolidays.$inferSelect;

export const insertTwilioSubAccountSchema = createInsertSchema(twilioSubAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTwilioSubAccount = z.infer<typeof insertTwilioSubAccountSchema>;
export type TwilioSubAccount = typeof twilioSubAccounts.$inferSelect;

export const insertCampaignContactSchema = createInsertSchema(campaignContacts).omit({ id: true, createdAt: true });
export type InsertCampaignContact = z.infer<typeof insertCampaignContactSchema>;
export type CampaignContact = typeof campaignContacts.$inferSelect;

export const drafts = pgTable("drafts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  prompt: text("prompt"),
  status: text("status").default("draft").notNull(),
  tone: text("tone").default("professional"),
  language: text("language").default("en"),
  version: integer("version").default(1).notNull(),
  parentDraftId: integer("parent_draft_id"),
  qualityScore: real("quality_score"),
  source: text("source").default("web"),
  metadata: jsonb("metadata"),
  publishedToAgentId: integer("published_to_agent_id").references(() => agents.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_drafts_org").on(table.orgId),
  index("idx_drafts_org_user").on(table.orgId, table.userId),
  index("idx_drafts_type").on(table.type),
  index("idx_drafts_status").on(table.status),
  index("idx_drafts_parent").on(table.parentDraftId),
]);

export const insertDraftSchema = createInsertSchema(drafts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDraft = z.infer<typeof insertDraftSchema>;
export type Draft = typeof drafts.$inferSelect;

export const platformKnowledgeChunks = pgTable("platform_knowledge_chunks", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_platform_knowledge_category").on(table.category),
]);

export const insertPlatformKnowledgeChunkSchema = createInsertSchema(platformKnowledgeChunks).omit({ id: true, createdAt: true });
export type InsertPlatformKnowledgeChunk = z.infer<typeof insertPlatformKnowledgeChunkSchema>;
export type PlatformKnowledgeChunk = typeof platformKnowledgeChunks.$inferSelect;

// ═══════════════════════════════════════════════════
// ANALYTICS — EVENT TRACKING & SESSIONS
// ═══════════════════════════════════════════════════

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  visitorId: text("visitor_id").notNull(),
  orgId: integer("org_id").references(() => orgs.id),
  userId: integer("user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  page: text("page").notNull(),
  pageTitle: text("page_title"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  searchKeyword: text("search_keyword"),
  deviceType: text("device_type").notNull(),
  browser: text("browser"),
  os: text("os"),
  screenWidth: integer("screen_width"),
  screenHeight: integer("screen_height"),
  country: text("country"),
  city: text("city"),
  region: text("region"),
  scrollDepth: integer("scroll_depth"),
  timeOnPage: integer("time_on_page"),
  elementId: text("element_id"),
  elementText: text("element_text"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_analytics_events_session_id").on(table.sessionId),
  index("idx_analytics_events_visitor_id").on(table.visitorId),
  index("idx_analytics_events_org_id").on(table.orgId),
  index("idx_analytics_events_event_type").on(table.eventType),
  index("idx_analytics_events_page").on(table.page),
  index("idx_analytics_events_created_at").on(table.createdAt),
  index("idx_analytics_events_page_event_type").on(table.page, table.eventType),
]);

export const analyticsSessions = pgTable("analytics_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").unique().notNull(),
  visitorId: text("visitor_id").notNull(),
  orgId: integer("org_id").references(() => orgs.id),
  userId: integer("user_id").references(() => users.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"),
  pageCount: integer("page_count").default(0),
  entryPage: text("entry_page").notNull(),
  exitPage: text("exit_page"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  deviceType: text("device_type").notNull(),
  browser: text("browser"),
  os: text("os"),
  country: text("country"),
  city: text("city"),
  isBounce: boolean("is_bounce").default(true),
  isConverted: boolean("is_converted").default(false),
  conversionPage: text("conversion_page"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_analytics_sessions_session_id").on(table.sessionId),
  index("idx_analytics_sessions_visitor_id").on(table.visitorId),
  index("idx_analytics_sessions_org_id").on(table.orgId),
  index("idx_analytics_sessions_started_at").on(table.startedAt),
  index("idx_analytics_sessions_is_bounce").on(table.isBounce),
  index("idx_analytics_sessions_is_converted").on(table.isConverted),
]);

// ═══════════════════════════════════════════════════
// ANALYTICS — INSERT SCHEMAS & TYPES
// ═══════════════════════════════════════════════════

export const analyticsDailyRollups = pgTable("analytics_daily_rollups", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id"),
  day: date("day").notNull(),
  pageviews: integer("pageviews").default(0).notNull(),
  uniqueVisitors: integer("unique_visitors").default(0).notNull(),
  uniqueSessions: integer("unique_sessions").default(0).notNull(),
  totalTimeOnPage: integer("total_time_on_page").default(0).notNull(),
  bounces: integer("bounces").default(0).notNull(),
  conversions: integer("conversions").default(0).notNull(),
  topPage: varchar("top_page", { length: 500 }),
  topReferrer: varchar("top_referrer", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ id: true, createdAt: true });
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

export const insertAnalyticsSessionSchema = createInsertSchema(analyticsSessions).omit({ id: true, createdAt: true });
export type InsertAnalyticsSession = z.infer<typeof insertAnalyticsSessionSchema>;
export type AnalyticsSession = typeof analyticsSessions.$inferSelect;

export const insertAnalyticsDailyRollupSchema = createInsertSchema(analyticsDailyRollups).omit({ id: true, createdAt: true });
export type InsertAnalyticsDailyRollup = z.infer<typeof insertAnalyticsDailyRollupSchema>;
export type AnalyticsDailyRollup = typeof analyticsDailyRollups.$inferSelect;

// ═══════════════════════════════════════════════════
// SECTION 1: OMNICHANNEL
// ═══════════════════════════════════════════════════

export const unifiedContacts = pgTable("unified_contacts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  primaryPhone: text("primary_phone"),
  primaryEmail: text("primary_email"),
  displayName: text("display_name"),
  mergedFromIds: jsonb("merged_from_ids").default([]),
  channels: jsonb("channels").default({}),
  totalInteractions: integer("total_interactions").default(0),
  lastInteractionAt: timestamp("last_interaction_at"),
  lastChannel: text("last_channel"),
  tags: text("tags").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_unified_contacts_org_id").on(table.orgId),
  index("idx_unified_contacts_phone").on(table.primaryPhone),
  index("idx_unified_contacts_email").on(table.primaryEmail),
  index("idx_unified_contacts_org_channel").on(table.orgId, table.lastChannel),
]);

export const channelConfigurations = pgTable("channel_configurations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  channelType: text("channel_type").notNull(),
  isEnabled: boolean("is_enabled").default(false),
  credentials: jsonb("credentials"),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  providerAccountId: text("provider_account_id"),
  settings: jsonb("settings"),
  rateLimit: integer("rate_limit"),
  slaResponseSeconds: integer("sla_response_seconds"),
  status: text("status").default("inactive"),
  lastHealthCheck: timestamp("last_health_check"),
  healthStatus: text("health_status"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_channel_config_org_id").on(table.orgId),
  index("idx_channel_config_org_type").on(table.orgId, table.channelType),
  index("idx_channel_config_status").on(table.status),
]);

export const omnichannelConversations = pgTable("omnichannel_conversations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  contactId: integer("contact_id").notNull().references(() => unifiedContacts.id),
  channelType: text("channel_type").notNull(),
  externalConversationId: text("external_conversation_id"),
  status: text("status").default("active"),
  assignedHumanAgentId: integer("assigned_human_agent_id"),
  assignedAiAgentId: integer("assigned_ai_agent_id").references(() => agents.id),
  priority: integer("priority").default(0),
  subject: text("subject"),
  lastMessageAt: timestamp("last_message_at"),
  lastCustomerMessageAt: timestamp("last_customer_message_at"),
  messageCount: integer("message_count").default(0),
  isUnread: boolean("is_unread").default(true),
  slaDeadline: timestamp("sla_deadline"),
  slaBreach: boolean("sla_breach").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_omni_conv_org_id").on(table.orgId),
  index("idx_omni_conv_contact_id").on(table.contactId),
  index("idx_omni_conv_status").on(table.orgId, table.status),
  index("idx_omni_conv_channel").on(table.orgId, table.channelType),
  index("idx_omni_conv_assigned_human").on(table.assignedHumanAgentId),
  index("idx_omni_conv_last_message").on(table.lastMessageAt),
]);

export const omnichannelMessages = pgTable("omnichannel_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => omnichannelConversations.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  direction: text("direction").notNull(),
  senderType: text("sender_type").notNull(),
  senderId: integer("sender_id"),
  content: text("content"),
  mediaType: text("media_type").default("text"),
  mediaUrl: text("media_url"),
  mediaMimeType: text("media_mime_type"),
  mediaSize: integer("media_size"),
  channelMessageId: text("channel_message_id"),
  status: text("status").default("pending"),
  failureReason: text("failure_reason"),
  templateId: integer("template_id"),
  isInteractive: boolean("is_interactive").default(false),
  interactiveData: jsonb("interactive_data"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_omni_msg_conversation_id").on(table.conversationId),
  index("idx_omni_msg_org_id").on(table.orgId),
  index("idx_omni_msg_status").on(table.status),
  index("idx_omni_msg_created_at").on(table.createdAt),
]);

export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  channelType: text("channel_type").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  variables: jsonb("variables").default([]),
  language: text("language").default("en"),
  category: text("category"),
  approvalStatus: text("approval_status").default("pending"),
  approvalSubmittedAt: timestamp("approval_submitted_at"),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_msg_templates_org_id").on(table.orgId),
  index("idx_msg_templates_org_channel").on(table.orgId, table.channelType),
  index("idx_msg_templates_approval").on(table.approvalStatus),
]);

export const channelBillingRules = pgTable("channel_billing_rules", {
  id: serial("id").primaryKey(),
  channelType: text("channel_type").notNull(),
  talkTimeEquivalentMinutes: numeric("talk_time_equivalent_minutes", { precision: 10, scale: 4 }).notNull(),
  providerCostPerUnit: numeric("provider_cost_per_unit", { precision: 10, scale: 4 }),
  marginPercent: numeric("margin_percent", { precision: 5, scale: 2 }),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_channel_billing_type").on(table.channelType),
  index("idx_channel_billing_active").on(table.isActive),
]);

export const channelHealthLog = pgTable("channel_health_log", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  channelType: text("channel_type").notNull(),
  status: text("status").notNull(),
  checkType: text("check_type"),
  responseTimeMs: integer("response_time_ms"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_channel_health_org_id").on(table.orgId),
  index("idx_channel_health_org_type").on(table.orgId, table.channelType),
  index("idx_channel_health_created").on(table.createdAt),
]);

export const insertUnifiedContactSchema = createInsertSchema(unifiedContacts).omit({ id: true, createdAt: true });
export type InsertUnifiedContact = z.infer<typeof insertUnifiedContactSchema>;
export type UnifiedContact = typeof unifiedContacts.$inferSelect;

export const insertChannelConfigurationSchema = createInsertSchema(channelConfigurations).omit({ id: true, createdAt: true });
export type InsertChannelConfiguration = z.infer<typeof insertChannelConfigurationSchema>;
export type ChannelConfiguration = typeof channelConfigurations.$inferSelect;

export const insertOmnichannelConversationSchema = createInsertSchema(omnichannelConversations).omit({ id: true, createdAt: true });
export type InsertOmnichannelConversation = z.infer<typeof insertOmnichannelConversationSchema>;
export type OmnichannelConversation = typeof omnichannelConversations.$inferSelect;

export const insertOmnichannelMessageSchema = createInsertSchema(omnichannelMessages).omit({ id: true, createdAt: true });
export type InsertOmnichannelMessage = z.infer<typeof insertOmnichannelMessageSchema>;
export type OmnichannelMessage = typeof omnichannelMessages.$inferSelect;

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({ id: true, createdAt: true });
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type MessageTemplate = typeof messageTemplates.$inferSelect;

export const insertChannelBillingRuleSchema = createInsertSchema(channelBillingRules).omit({ id: true, createdAt: true });
export type InsertChannelBillingRule = z.infer<typeof insertChannelBillingRuleSchema>;
export type ChannelBillingRule = typeof channelBillingRules.$inferSelect;

export const insertChannelHealthLogSchema = createInsertSchema(channelHealthLog).omit({ id: true, createdAt: true });
export type InsertChannelHealthLog = z.infer<typeof insertChannelHealthLogSchema>;
export type ChannelHealthLog = typeof channelHealthLog.$inferSelect;

// ═══════════════════════════════════════════════════
// SECTION 2: AGENT ASSIST
// ═══════════════════════════════════════════════════

export const humanAgents = pgTable("human_agents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  displayName: text("display_name").notNull(),
  status: text("status").default("offline"),
  skills: text("skills").array(),
  maxConcurrentCalls: integer("max_concurrent_calls").default(3),
  currentCallCount: integer("current_call_count").default(0),
  lastActiveAt: timestamp("last_active_at"),
  shiftStart: timestamp("shift_start"),
  shiftEnd: timestamp("shift_end"),
  totalCallsHandled: integer("total_calls_handled").default(0),
  avgHandleTime: numeric("avg_handle_time", { precision: 10, scale: 2 }),
  avgQuality: numeric("avg_quality", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_human_agents_org_id").on(table.orgId),
  index("idx_human_agents_user_id").on(table.userId),
  index("idx_human_agents_status").on(table.orgId, table.status),
  uniqueIndex("uq_human_agents_user_org").on(table.userId, table.orgId),
]);

export const agentAssistSessions = pgTable("agent_assist_sessions", {
  id: serial("id").primaryKey(),
  callLogId: integer("call_log_id").notNull().references(() => callLogs.id),
  humanAgentId: integer("human_agent_id").notNull().references(() => humanAgents.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  transferType: text("transfer_type"),
  suggestionsShown: integer("suggestions_shown").default(0),
  suggestionsUsed: integer("suggestions_used").default(0),
  autoSummary: text("auto_summary"),
  autoActionItems: jsonb("auto_action_items"),
  autoTopics: jsonb("auto_topics"),
  coachingAlertsTriggered: integer("coaching_alerts_triggered").default(0),
  agentNotes: text("agent_notes"),
  outcomeRating: integer("outcome_rating"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_assist_sessions_call_log").on(table.callLogId),
  index("idx_assist_sessions_human_agent").on(table.humanAgentId),
  index("idx_assist_sessions_org_id").on(table.orgId),
  index("idx_assist_sessions_started").on(table.startedAt),
]);

export const assistSuggestions = pgTable("assist_suggestions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => agentAssistSessions.id),
  sourceType: text("source_type").notNull(),
  sourceId: integer("source_id"),
  content: text("content").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 2 }),
  status: text("status").default("shown"),
  modifiedContent: text("modified_content"),
  responseTimeMs: integer("response_time_ms"),
  knowledgeDocId: integer("knowledge_doc_id").references(() => knowledgeDocuments.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_assist_suggestions_session").on(table.sessionId),
  index("idx_assist_suggestions_source").on(table.sourceType),
  index("idx_assist_suggestions_status").on(table.status),
]);

export const coachingRules = pgTable("coaching_rules", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull(),
  triggerCondition: jsonb("trigger_condition").notNull(),
  coachingMessage: text("coaching_message").notNull(),
  priority: integer("priority").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_coaching_rules_org_id").on(table.orgId),
  index("idx_coaching_rules_type").on(table.triggerType),
  index("idx_coaching_rules_active").on(table.orgId, table.isActive),
]);

export const cannedResponses = pgTable("canned_responses", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  category: text("category"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  shortcut: text("shortcut"),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_canned_responses_org_id").on(table.orgId),
  index("idx_canned_responses_category").on(table.orgId, table.category),
]);

export const supervisorSessions = pgTable("supervisor_sessions", {
  id: serial("id").primaryKey(),
  supervisorUserId: integer("supervisor_user_id").notNull().references(() => users.id),
  callLogId: integer("call_log_id").notNull().references(() => callLogs.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  mode: text("mode").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_supervisor_sessions_org_id").on(table.orgId),
  index("idx_supervisor_sessions_call").on(table.callLogId),
  index("idx_supervisor_sessions_user").on(table.supervisorUserId),
]);

export const insertHumanAgentSchema = createInsertSchema(humanAgents).omit({ id: true, createdAt: true });
export type InsertHumanAgent = z.infer<typeof insertHumanAgentSchema>;
export type HumanAgent = typeof humanAgents.$inferSelect;

export const insertAgentAssistSessionSchema = createInsertSchema(agentAssistSessions).omit({ id: true, createdAt: true });
export type InsertAgentAssistSession = z.infer<typeof insertAgentAssistSessionSchema>;
export type AgentAssistSession = typeof agentAssistSessions.$inferSelect;

export const insertAssistSuggestionSchema = createInsertSchema(assistSuggestions).omit({ id: true, createdAt: true });
export type InsertAssistSuggestion = z.infer<typeof insertAssistSuggestionSchema>;
export type AssistSuggestion = typeof assistSuggestions.$inferSelect;

export const insertCoachingRuleSchema = createInsertSchema(coachingRules).omit({ id: true, createdAt: true });
export type InsertCoachingRule = z.infer<typeof insertCoachingRuleSchema>;
export type CoachingRule = typeof coachingRules.$inferSelect;

export const insertCannedResponseSchema = createInsertSchema(cannedResponses).omit({ id: true, createdAt: true });
export type InsertCannedResponse = z.infer<typeof insertCannedResponseSchema>;
export type CannedResponse = typeof cannedResponses.$inferSelect;

export const insertSupervisorSessionSchema = createInsertSchema(supervisorSessions).omit({ id: true, createdAt: true });
export type InsertSupervisorSession = z.infer<typeof insertSupervisorSessionSchema>;
export type SupervisorSession = typeof supervisorSessions.$inferSelect;

// ═══════════════════════════════════════════════════
// SECTION 3: VOICE BIOMETRICS
// ═══════════════════════════════════════════════════

export const voiceprints = pgTable("voiceprints", {
  id: serial("id").primaryKey(),
  contactPhone: text("contact_phone").notNull(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  providerReferenceId: text("provider_reference_id"),
  enrollmentMethod: text("enrollment_method").default("in_call"),
  enrollmentQuality: numeric("enrollment_quality", { precision: 5, scale: 2 }),
  enrollmentSamples: integer("enrollment_samples").default(0),
  verificationMode: text("verification_mode").default("passive"),
  passphraseText: text("passphrase_text"),
  status: text("status").default("active"),
  totalVerifications: integer("total_verifications").default(0),
  lastVerifiedAt: timestamp("last_verified_at"),
  lastUpdatedAt: timestamp("last_updated_at"),
  adaptiveUpdates: integer("adaptive_updates").default(0),
  consentTimestamp: timestamp("consent_timestamp"),
  consentMethod: text("consent_method"),
  consentText: text("consent_text"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_voiceprints_org_id").on(table.orgId),
  index("idx_voiceprints_phone").on(table.contactPhone),
  index("idx_voiceprints_org_phone").on(table.orgId, table.contactPhone),
  index("idx_voiceprints_status").on(table.status),
]);

export const voiceBiometricAttempts = pgTable("voice_biometric_attempts", {
  id: serial("id").primaryKey(),
  callLogId: integer("call_log_id").references(() => callLogs.id),
  voiceprintId: integer("voiceprint_id").notNull().references(() => voiceprints.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  result: text("result").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }),
  verificationMode: text("verification_mode"),
  durationMs: integer("duration_ms"),
  spoofingDetected: boolean("spoofing_detected").default(false),
  spoofingType: text("spoofing_type").default("none"),
  spoofingConfidence: numeric("spoofing_confidence", { precision: 5, scale: 2 }),
  fallbackUsed: boolean("fallback_used").default(false),
  fallbackMethod: text("fallback_method"),
  providerResponseId: text("provider_response_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_bio_attempts_call_log").on(table.callLogId),
  index("idx_bio_attempts_voiceprint").on(table.voiceprintId),
  index("idx_bio_attempts_org_id").on(table.orgId),
  index("idx_bio_attempts_result").on(table.result),
  index("idx_bio_attempts_created").on(table.createdAt),
]);

export const biometricConfig = pgTable("biometric_config", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  isEnabled: boolean("is_enabled").default(false),
  verificationThreshold: numeric("verification_threshold", { precision: 5, scale: 2 }).default("0.75"),
  highSecurityThreshold: numeric("high_security_threshold", { precision: 5, scale: 2 }).default("0.90"),
  antiSpoofingEnabled: boolean("anti_spoofing_enabled").default(true),
  livenessDetection: boolean("liveness_detection").default(true),
  replayDetection: boolean("replay_detection").default(true),
  syntheticDetection: boolean("synthetic_detection").default(true),
  deepfakeDetection: boolean("deepfake_detection").default(true),
  spoofingAction: text("spoofing_action").default("reject_alert"),
  continuousAuthEnabled: boolean("continuous_auth_enabled").default(false),
  continuousAuthIntervalSeconds: integer("continuous_auth_interval_seconds").default(300),
  fallbackMethod: text("fallback_method").default("security_questions"),
  maxEnrollmentSamples: integer("max_enrollment_samples").default(5),
  reEnrollmentPromptDays: integer("re_enrollment_prompt_days").default(180),
  crossAccountCheckEnabled: boolean("cross_account_check_enabled").default(false),
  voiceAgeMismatchAlert: boolean("voice_age_mismatch_alert").default(false),
  providerName: text("provider_name"),
  providerConfig: jsonb("provider_config"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uq_biometric_config_org").on(table.orgId),
]);

export const biometricFraudAlerts = pgTable("biometric_fraud_alerts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  voiceprintId: integer("voiceprint_id").references(() => voiceprints.id),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull(),
  description: text("description"),
  matchedVoiceprintIds: jsonb("matched_voiceprint_ids").default([]),
  callLogId: integer("call_log_id").references(() => callLogs.id),
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_bio_fraud_org_id").on(table.orgId),
  index("idx_bio_fraud_voiceprint").on(table.voiceprintId),
  index("idx_bio_fraud_alert_type").on(table.alertType),
  index("idx_bio_fraud_resolved").on(table.isResolved),
  index("idx_bio_fraud_severity").on(table.severity),
]);

export const insertVoiceprintSchema = createInsertSchema(voiceprints).omit({ id: true, createdAt: true });
export type InsertVoiceprint = z.infer<typeof insertVoiceprintSchema>;
export type Voiceprint = typeof voiceprints.$inferSelect;

export const insertVoiceBiometricAttemptSchema = createInsertSchema(voiceBiometricAttempts).omit({ id: true, createdAt: true });
export type InsertVoiceBiometricAttempt = z.infer<typeof insertVoiceBiometricAttemptSchema>;
export type VoiceBiometricAttempt = typeof voiceBiometricAttempts.$inferSelect;

export const insertBiometricConfigSchema = createInsertSchema(biometricConfig).omit({ id: true, createdAt: true });
export type InsertBiometricConfig = z.infer<typeof insertBiometricConfigSchema>;
export type BiometricConfig = typeof biometricConfig.$inferSelect;

export const insertBiometricFraudAlertSchema = createInsertSchema(biometricFraudAlerts).omit({ id: true, createdAt: true });
export type InsertBiometricFraudAlert = z.infer<typeof insertBiometricFraudAlertSchema>;
export type BiometricFraudAlert = typeof biometricFraudAlerts.$inferSelect;

// ═══════════════════════════════════════════════════
// SECTION 4: CONVERSATION ANALYTICS
// ═══════════════════════════════════════════════════

export const callAnalyticsRollups = pgTable("call_analytics_rollups", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  period: text("period").notNull(),
  periodStart: timestamp("period_start").notNull(),
  totalCalls: integer("total_calls").default(0),
  completedCalls: integer("completed_calls").default(0),
  handoffCalls: integer("handoff_calls").default(0),
  avgDuration: numeric("avg_duration", { precision: 10, scale: 2 }),
  avgSentiment: numeric("avg_sentiment", { precision: 5, scale: 2 }),
  avgQuality: numeric("avg_quality", { precision: 5, scale: 2 }),
  avgCsat: numeric("avg_csat", { precision: 5, scale: 2 }),
  resolutionRate: numeric("resolution_rate", { precision: 5, scale: 2 }),
  topTopics: jsonb("top_topics"),
  topAgents: jsonb("top_agents"),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_call_rollups_org_id").on(table.orgId),
  index("idx_call_rollups_period").on(table.orgId, table.period),
  index("idx_call_rollups_period_start").on(table.orgId, table.periodStart),
]);

export const agentScorecards = pgTable("agent_scorecards", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().references(() => agents.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  period: text("period").notNull(),
  periodStart: timestamp("period_start").notNull(),
  totalCalls: integer("total_calls").default(0),
  avgHandleTime: numeric("avg_handle_time", { precision: 10, scale: 2 }),
  avgQuality: numeric("avg_quality", { precision: 5, scale: 2 }),
  avgSentiment: numeric("avg_sentiment", { precision: 5, scale: 2 }),
  avgCsat: numeric("avg_csat", { precision: 5, scale: 2 }),
  firstCallResolution: numeric("first_call_resolution", { precision: 5, scale: 2 }),
  handoffRate: numeric("handoff_rate", { precision: 5, scale: 2 }),
  topicsCovered: jsonb("topics_covered").default([]),
  improvementAreas: jsonb("improvement_areas"),
  overallScore: numeric("overall_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_scorecards_agent_id").on(table.agentId),
  index("idx_scorecards_org_id").on(table.orgId),
  index("idx_scorecards_period").on(table.orgId, table.period),
  index("idx_scorecards_period_start").on(table.agentId, table.periodStart),
]);

export const callTopics = pgTable("call_topics", {
  id: serial("id").primaryKey(),
  callLogId: integer("call_log_id").notNull().references(() => callLogs.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  topic: text("topic").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 2 }),
  sentiment: text("sentiment"),
  isResolved: boolean("is_resolved").default(false),
  mentions: integer("mentions").default(1),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_call_topics_call_log").on(table.callLogId),
  index("idx_call_topics_org_id").on(table.orgId),
  index("idx_call_topics_topic").on(table.orgId, table.topic),
]);

export const analyticsAlerts = pgTable("analytics_alerts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  isRead: boolean("is_read").default(false),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_analytics_alerts_org_id").on(table.orgId),
  index("idx_analytics_alerts_type").on(table.alertType),
  index("idx_analytics_alerts_read").on(table.orgId, table.isRead),
  index("idx_analytics_alerts_created").on(table.createdAt),
]);

export const insertCallAnalyticsRollupSchema = createInsertSchema(callAnalyticsRollups).omit({ id: true, createdAt: true });
export type InsertCallAnalyticsRollup = z.infer<typeof insertCallAnalyticsRollupSchema>;
export type CallAnalyticsRollup = typeof callAnalyticsRollups.$inferSelect;

export const insertAgentScorecardSchema = createInsertSchema(agentScorecards).omit({ id: true, createdAt: true });
export type InsertAgentScorecard = z.infer<typeof insertAgentScorecardSchema>;
export type AgentScorecard = typeof agentScorecards.$inferSelect;

export const insertCallTopicSchema = createInsertSchema(callTopics).omit({ id: true, createdAt: true });
export type InsertCallTopic = z.infer<typeof insertCallTopicSchema>;
export type CallTopic = typeof callTopics.$inferSelect;

export const insertAnalyticsAlertSchema = createInsertSchema(analyticsAlerts).omit({ id: true, createdAt: true });
export type InsertAnalyticsAlert = z.infer<typeof insertAnalyticsAlertSchema>;
export type AnalyticsAlert = typeof analyticsAlerts.$inferSelect;

// ==================== DEPARTMENTS & TEAM MANAGEMENT ====================

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  name: text("name").notNull(),
  description: text("description"),
  managerId: integer("manager_id").references(() => users.id),
  status: text("status").notNull().default("active"),
  color: text("color").default("#6366f1"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_departments_org_id").on(table.orgId),
  index("idx_departments_manager_id").on(table.managerId),
]);

export const departmentMembers = pgTable("department_members", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  userId: integer("user_id").notNull().references(() => users.id),
  departmentRole: text("department_role").notNull().default("AGENT"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  index("idx_dept_members_dept_id").on(table.departmentId),
  index("idx_dept_members_user_id").on(table.userId),
  uniqueIndex("uq_dept_members_dept_user").on(table.departmentId, table.userId),
]);

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  departmentId: integer("department_id").references(() => departments.id),
  orgRole: text("org_role").notNull().default("AGENT"),
  departmentRole: text("department_role").default("AGENT"),
  invitedById: integer("invited_by_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_invitations_org_id").on(table.orgId),
  index("idx_invitations_email").on(table.email),
  index("idx_invitations_token").on(table.token),
  index("idx_invitations_status_expires").on(table.status, table.expiresAt),
]);

export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export const insertDepartmentMemberSchema = createInsertSchema(departmentMembers).omit({ id: true, joinedAt: true });
export type InsertDepartmentMember = z.infer<typeof insertDepartmentMemberSchema>;
export type DepartmentMember = typeof departmentMembers.$inferSelect;

export const insertInvitationSchema = createInsertSchema(invitations).omit({ id: true, createdAt: true, acceptedAt: true });
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

export const rateLimits = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull(),
  bucket: varchar("bucket", { length: 64 }).notNull(),
  count: integer("count").default(1).notNull(),
  windowStart: timestamp("window_start").defaultNow().notNull(),
  windowEnd: timestamp("window_end").notNull(),
}, (table) => [
  uniqueIndex("idx_rate_limits_key_bucket_unique").on(table.key, table.bucket),
  index("idx_rate_limits_window_end").on(table.windowEnd),
]);

export const blogCategories = pgTable("blog_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  categoryId: integer("category_id").references(() => blogCategories.id),
  author: text("author").default("GoRigo Team"),
  readingTime: integer("reading_time").default(5),
  published: boolean("published").default(true),
  featured: boolean("featured").default(false),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  faqs: text("faqs"),
  tags: text("tags"),
  publishedAt: timestamp("published_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBlogCategorySchema = createInsertSchema(blogCategories).omit({ id: true, createdAt: true });
export type InsertBlogCategory = z.infer<typeof insertBlogCategorySchema>;
export type BlogCategory = typeof blogCategories.$inferSelect;

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({ id: true, publishedAt: true, updatedAt: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// ═══════════════════════════════════════════════════
// INDUSTRY TEMPLATES & VOICE PROFILES
// ═══════════════════════════════════════════════════

export const industries = pgTable("industries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  complianceNotes: text("compliance_notes"),
  regulatoryBody: text("regulatory_body"),
  sicCode: text("sic_code"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_industries_slug").on(table.slug),
  index("idx_industries_active").on(table.isActive),
]);

export const insertIndustrySchema = createInsertSchema(industries).omit({ id: true, createdAt: true });
export type InsertIndustry = z.infer<typeof insertIndustrySchema>;
export type Industry = typeof industries.$inferSelect;

export const voiceProfiles = pgTable("voice_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description").notNull(),
  pitch: real("pitch").default(1.0),
  speed: real("speed").default(1.0),
  warmth: real("warmth").default(0.5),
  emphasis: real("emphasis").default(0.5),
  pauseLength: real("pause_length").default(0.3),
  ttsProvider: text("tts_provider").default("aws_polly"),
  ttsVoiceId: text("tts_voice_id").default("Polly.Amy"),
  ttsModelId: text("tts_model_id"),
  sampleAudioUrl: text("sample_audio_url"),
  bestFor: text("best_for"),
  isSystem: boolean("is_system").default(true),
  orgId: integer("org_id").references(() => orgs.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_voice_profiles_slug").on(table.slug),
  index("idx_voice_profiles_org").on(table.orgId),
  index("idx_voice_profiles_active").on(table.isActive),
]);

export const insertVoiceProfileSchema = createInsertSchema(voiceProfiles).omit({ id: true, createdAt: true });
export type InsertVoiceProfile = z.infer<typeof insertVoiceProfileSchema>;
export type VoiceProfile = typeof voiceProfiles.$inferSelect;

export const industryTemplates = pgTable("industry_templates", {
  id: serial("id").primaryKey(),
  industryId: integer("industry_id").notNull().references(() => industries.id),
  templateType: text("template_type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  voiceProfileId: integer("voice_profile_id").references(() => voiceProfiles.id),
  language: text("language").default("en-GB"),
  tone: text("tone").default("professional"),
  complianceDisclaimer: text("compliance_disclaimer"),
  variables: jsonb("variables").default([]),
  tags: text("tags"),
  version: integer("version").default(1),
  isSystem: boolean("is_system").default(true),
  orgId: integer("org_id").references(() => orgs.id),
  usageCount: integer("usage_count").default(0),
  rating: real("rating"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_industry_templates_industry").on(table.industryId),
  index("idx_industry_templates_type").on(table.templateType),
  index("idx_industry_templates_voice").on(table.voiceProfileId),
  index("idx_industry_templates_org").on(table.orgId),
  index("idx_industry_templates_active").on(table.isActive),
]);

export const insertIndustryTemplateSchema = createInsertSchema(industryTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIndustryTemplate = z.infer<typeof insertIndustryTemplateSchema>;
export type IndustryTemplate = typeof industryTemplates.$inferSelect;

export const templateVersions = pgTable("template_versions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => industryTemplates.id),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  changedBy: integer("changed_by").references(() => users.id),
  changeNote: text("change_note"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_template_versions_template").on(table.templateId),
  uniqueIndex("idx_template_versions_unique").on(table.templateId, table.version),
]);

export const insertTemplateVersionSchema = createInsertSchema(templateVersions).omit({ id: true, createdAt: true });
export type InsertTemplateVersion = z.infer<typeof insertTemplateVersionSchema>;
export type TemplateVersion = typeof templateVersions.$inferSelect;

export const caseStudies = pgTable("case_studies", {
  id: serial("id").primaryKey(),
  industryId: integer("industry_id").notNull().references(() => industries.id),
  slug: text("slug").unique().notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  heroImage: text("hero_image"),
  challenge: text("challenge").notNull(),
  solution: text("solution").notNull(),
  results: text("results").notNull(),
  testimonialQuote: text("testimonial_quote"),
  testimonialAuthor: text("testimonial_author"),
  testimonialRole: text("testimonial_role"),
  roiPercentage: integer("roi_percentage"),
  costReduction: integer("cost_reduction"),
  callsHandled: integer("calls_handled"),
  customerSatisfaction: real("customer_satisfaction"),
  keyMetrics: jsonb("key_metrics").default([]),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  published: boolean("published").default(true),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_case_studies_industry").on(table.industryId),
  index("idx_case_studies_slug").on(table.slug),
  index("idx_case_studies_published").on(table.published),
]);

export const insertCaseStudySchema = createInsertSchema(caseStudies).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCaseStudy = z.infer<typeof insertCaseStudySchema>;
export type CaseStudy = typeof caseStudies.$inferSelect;

export * from "./models/chat";
