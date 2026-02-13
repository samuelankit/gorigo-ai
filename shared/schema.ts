import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb, vector, numeric, uniqueIndex, index } from "drizzle-orm/pg-core";
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
}, (table) => [
  index("idx_sessions_user_id").on(table.userId),
]);

export const orgs = pgTable("orgs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").default("UTC"),
  currency: text("currency").default("GBP"),
  channelType: text("channel_type").default("d2c"),
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
  createdAt: timestamp("created_at").defaultNow(),
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
  language: text("language").default("en-GB"),
  voiceName: text("voice_name").default("Polly.Amy"),
  speechModel: text("speech_model").default("default"),
}, (table) => [
  index("idx_agents_org_id").on(table.orgId),
  index("idx_agents_user_id").on(table.userId),
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
  startedAt: timestamp("started_at").defaultNow(),
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
}, (table) => [
  index("idx_call_logs_org_id").on(table.orgId),
  index("idx_call_logs_created_at").on(table.createdAt),
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
  ratePerMinute: numeric("rate_per_minute", { precision: 10, scale: 4 }),
  cost: numeric("cost", { precision: 12, scale: 2 }).default("0"),
  currency: text("currency").default("GBP"),
  provider: text("provider"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_billing_ledger_org_id").on(table.orgId),
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
});

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactName: text("contact_name"),
  brandingLogo: text("branding_logo"),
  brandingPrimaryColor: text("branding_primary_color").default("#3B82F6"),
  brandingCompanyName: text("branding_company_name"),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  suspendedAt: timestamp("suspended_at"),
}, (table) => [
  index("idx_partners_org_id").on(table.orgId),
]);

export const partnerClients = pgTable("partner_clients", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").notNull().references(() => partners.id),
  orgId: integer("org_id").notNull().references(() => orgs.id),
  status: text("status").default("active"),
  retailRatePerMinute: numeric("retail_rate_per_minute", { precision: 10, scale: 4 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_partner_clients_org_id").on(table.orgId),
  index("idx_partner_clients_partner_id").on(table.partnerId),
]);

export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  ownerType: text("owner_type").notNull().default("platform"),
  ownerId: integer("owner_id"),
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
});

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull().references(() => affiliates.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrerUrl: text("referrer_url"),
  landingPage: text("landing_page"),
  convertedToSignup: boolean("converted_to_signup").default(false),
  convertedOrgId: integer("converted_org_id"),
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
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uq_aff_commission_txn").on(table.walletTransactionId, table.affiliateId),
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
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_wallet_txn_org_id").on(table.orgId),
  index("idx_wallet_txn_created_at").on(table.createdAt),
]);

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
});

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
  status: text("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
});

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

export * from "./models/chat";
