-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "active_call_billing_state" (
	"call_control_id" text PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"rate_per_minute" numeric(12, 6) NOT NULL,
	"start_time" text NOT NULL,
	"last_billed_secs" integer DEFAULT 0,
	"low_balance_warned" boolean DEFAULT false,
	"low_balance_warned_at" text,
	"terminated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "affiliate_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" integer NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"referrer_url" text,
	"landing_page" text,
	"converted_to_signup" boolean DEFAULT false,
	"converted_org_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "affiliate_commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"wallet_transaction_id" integer,
	"source_amount" numeric(12, 2) NOT NULL,
	"commission_rate" numeric(5, 2) NOT NULL,
	"commission_amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending',
	"description" text,
	"clawback_eligible_until" timestamp,
	"clawed_back_at" timestamp,
	"clawback_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "affiliate_payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'GBP',
	"method" text DEFAULT 'wallet_credit',
	"status" text DEFAULT 'pending',
	"processed_by" integer,
	"processed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "affiliates" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"owner_type" text DEFAULT 'platform' NOT NULL,
	"owner_id" integer,
	"org_id" integer,
	"user_id" integer,
	"commission_rate" numeric(5, 2) DEFAULT '10',
	"commission_type" text DEFAULT 'percentage',
	"cookie_duration_days" integer DEFAULT 30,
	"total_clicks" integer DEFAULT 0,
	"total_signups" integer DEFAULT 0,
	"total_earnings" numeric(12, 2) DEFAULT '0',
	"pending_payout" numeric(12, 2) DEFAULT '0',
	"lifetime_payouts" numeric(12, 2) DEFAULT '0',
	"status" text DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "affiliates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_assist_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_log_id" integer NOT NULL,
	"human_agent_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"transfer_type" text,
	"suggestions_shown" integer DEFAULT 0,
	"suggestions_used" integer DEFAULT 0,
	"auto_summary" text,
	"auto_action_items" jsonb,
	"auto_topics" jsonb,
	"coaching_alerts_triggered" integer DEFAULT 0,
	"agent_notes" text,
	"outcome_rating" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_flows" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"name" text DEFAULT 'Default Flow' NOT NULL,
	"description" text,
	"nodes" jsonb DEFAULT '[]'::jsonb,
	"edges" jsonb DEFAULT '[]'::jsonb,
	"entry_agent_id" integer,
	"is_active" boolean DEFAULT true,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_scorecards" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"period" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"total_calls" integer DEFAULT 0,
	"avg_handle_time" numeric(10, 2),
	"avg_quality" numeric(5, 2),
	"avg_sentiment" numeric(5, 2),
	"avg_csat" numeric(5, 2),
	"first_call_resolution" numeric(5, 2),
	"handoff_rate" numeric(5, 2),
	"topics_covered" jsonb DEFAULT '[]'::jsonb,
	"improvement_areas" jsonb,
	"overall_score" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"name" text DEFAULT 'AI Assistant' NOT NULL,
	"greeting" text DEFAULT 'Hello, thank you for calling. How can I help you today?',
	"business_description" text,
	"inbound_enabled" boolean DEFAULT true,
	"outbound_enabled" boolean DEFAULT false,
	"roles" text DEFAULT 'receptionist',
	"faq_entries" jsonb DEFAULT '[]'::jsonb,
	"handoff_number" text,
	"handoff_trigger" text DEFAULT 'transfer',
	"voice_preference" text DEFAULT 'professional',
	"negotiation_enabled" boolean DEFAULT false,
	"negotiation_guardrails" jsonb,
	"compliance_disclosure" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"handoff_enabled" boolean DEFAULT true,
	"handoff_target_type" text DEFAULT 'phone',
	"handoff_target_value" text,
	"handoff_conditions" jsonb,
	"max_turns" integer DEFAULT 10,
	"confidence_threshold" numeric(5, 2) DEFAULT '0.55',
	"retention_days_call_logs" integer DEFAULT 90,
	"retention_days_recordings" integer DEFAULT 30,
	"agent_type" text DEFAULT 'general',
	"department_name" text,
	"display_order" integer DEFAULT 0,
	"is_router" boolean DEFAULT false,
	"routing_config" jsonb,
	"parent_agent_id" integer,
	"system_prompt" text,
	"escalation_rules" jsonb,
	"status" text DEFAULT 'active',
	"language" text DEFAULT 'en-GB' NOT NULL,
	"voice_name" text DEFAULT 'Polly.Amy' NOT NULL,
	"speech_model" text DEFAULT 'default' NOT NULL,
	"deleted_at" timestamp,
	"strict_knowledge_mode" boolean DEFAULT false,
	"max_tokens_per_call" integer DEFAULT 4096,
	"max_tokens_per_session" integer DEFAULT 16384,
	"max_llm_cost_per_call" numeric(10, 4) DEFAULT '2.0000',
	"visibility" text DEFAULT 'shared',
	"shared_with_departments" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false,
	"dismissed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_daily_rollups" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer,
	"day" date NOT NULL,
	"pageviews" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"unique_sessions" integer DEFAULT 0 NOT NULL,
	"total_time_on_page" integer DEFAULT 0 NOT NULL,
	"bounces" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"top_page" varchar(500),
	"top_referrer" varchar(1000),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"visitor_id" text NOT NULL,
	"org_id" integer,
	"user_id" integer,
	"event_type" text NOT NULL,
	"page" text NOT NULL,
	"page_title" text,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"search_keyword" text,
	"device_type" text NOT NULL,
	"browser" text,
	"os" text,
	"screen_width" integer,
	"screen_height" integer,
	"country" text,
	"city" text,
	"region" text,
	"scroll_depth" integer,
	"time_on_page" integer,
	"element_id" text,
	"element_text" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"visitor_id" text NOT NULL,
	"org_id" integer,
	"user_id" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"duration" integer,
	"page_count" integer DEFAULT 0,
	"entry_page" text NOT NULL,
	"exit_page" text,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"device_type" text NOT NULL,
	"browser" text,
	"os" text,
	"country" text,
	"city" text,
	"is_bounce" boolean DEFAULT true,
	"is_converted" boolean DEFAULT false,
	"conversion_page" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "analytics_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"is_revoked" boolean DEFAULT false,
	"revoked_at" timestamp,
	"scopes" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assist_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"source_type" text NOT NULL,
	"source_id" integer,
	"content" text NOT NULL,
	"confidence" numeric(5, 2),
	"status" text DEFAULT 'shown',
	"modified_content" text,
	"response_time_ms" integer,
	"knowledge_doc_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer,
	"actor_email" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"details" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"call_log_id" integer,
	"provider_call_id" text,
	"started_at" timestamp,
	"connected_at" timestamp,
	"ended_at" timestamp,
	"billable_seconds" integer DEFAULT 0,
	"min_charge_seconds" integer DEFAULT 30,
	"rate_per_minute" numeric(10, 4) NOT NULL,
	"cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"provider" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"deployment_model" text,
	"idempotency_key" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "billing_ledger_call_log_id_unique" UNIQUE("call_log_id"),
	CONSTRAINT "billing_ledger_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"minutes_included" integer NOT NULL,
	"price_per_month" numeric(12, 2) NOT NULL,
	"overage_per_minute" numeric(10, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "biometric_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"verification_threshold" numeric(5, 2) DEFAULT '0.75',
	"high_security_threshold" numeric(5, 2) DEFAULT '0.90',
	"anti_spoofing_enabled" boolean DEFAULT true,
	"liveness_detection" boolean DEFAULT true,
	"replay_detection" boolean DEFAULT true,
	"synthetic_detection" boolean DEFAULT true,
	"deepfake_detection" boolean DEFAULT true,
	"spoofing_action" text DEFAULT 'reject_alert',
	"continuous_auth_enabled" boolean DEFAULT false,
	"continuous_auth_interval_seconds" integer DEFAULT 300,
	"fallback_method" text DEFAULT 'security_questions',
	"max_enrollment_samples" integer DEFAULT 5,
	"re_enrollment_prompt_days" integer DEFAULT 180,
	"cross_account_check_enabled" boolean DEFAULT false,
	"voice_age_mismatch_alert" boolean DEFAULT false,
	"provider_name" text,
	"provider_config" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "biometric_fraud_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"voiceprint_id" integer,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"description" text,
	"matched_voiceprint_ids" jsonb DEFAULT '[]'::jsonb,
	"call_log_id" integer,
	"is_resolved" boolean DEFAULT false,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"cover_image" text,
	"category_id" integer,
	"author" text DEFAULT 'GoRigo Team',
	"reading_time" integer DEFAULT 5,
	"published" boolean DEFAULT true,
	"featured" boolean DEFAULT false,
	"meta_title" text,
	"meta_description" text,
	"faqs" text,
	"tags" text,
	"published_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_analytics_rollups" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"period" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"total_calls" integer DEFAULT 0,
	"completed_calls" integer DEFAULT 0,
	"handoff_calls" integer DEFAULT 0,
	"avg_duration" numeric(10, 2),
	"avg_sentiment" numeric(5, 2),
	"avg_quality" numeric(5, 2),
	"avg_csat" numeric(5, 2),
	"resolution_rate" numeric(5, 2),
	"top_topics" jsonb,
	"top_agents" jsonb,
	"total_cost" numeric(12, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_hops" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_log_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"from_agent_id" integer,
	"to_agent_id" integer NOT NULL,
	"hop_order" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"duration_seconds" integer DEFAULT 0,
	"hop_cost" numeric(12, 2) DEFAULT '0',
	"status" text DEFAULT 'completed',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"direction" text NOT NULL,
	"caller_number" text,
	"duration" integer DEFAULT 0,
	"status" text DEFAULT 'completed',
	"summary" text,
	"transcript" text,
	"lead_captured" boolean DEFAULT false,
	"lead_name" text,
	"lead_email" text,
	"lead_phone" text,
	"appointment_booked" boolean DEFAULT false,
	"handoff_triggered" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"provider_call_id" text,
	"ai_disclosure_played" boolean DEFAULT false,
	"ai_disclosure_version" text,
	"current_state" text DEFAULT 'GREETING',
	"turn_count" integer DEFAULT 0,
	"last_confidence" numeric(5, 2),
	"handoff_reason" text,
	"handoff_at" timestamp,
	"final_outcome" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"recording_url" text,
	"recording_sid" text,
	"provider_call_sid" text,
	"call_cost" numeric(12, 2),
	"connected_at" timestamp,
	"sentiment_score" numeric(5, 2),
	"sentiment_label" text,
	"sentiment_history" jsonb DEFAULT '[]'::jsonb,
	"quality_score" numeric(5, 2),
	"quality_breakdown" jsonb,
	"csat_prediction" numeric(5, 2),
	"resolution_status" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"billed_deployment_model" text,
	"billed_rate_per_minute" numeric(12, 6),
	"campaign_id" integer,
	"campaign_contact_id" integer,
	"destination_country" text,
	"language_used" text,
	"translated_transcript" text,
	"translation_confidence" numeric(5, 2),
	"compliance_dnc_checked" boolean DEFAULT false,
	"compliance_dnc_result" text,
	"compliance_disclosure_played" boolean DEFAULT false,
	"compliance_disclosure_at" timestamp,
	"compliance_recording_consent" text,
	"compliance_recording_consent_at" timestamp,
	"compliance_opt_out_detected" boolean DEFAULT false,
	"compliance_opt_out_at" timestamp,
	"country_surcharge" numeric(10, 4),
	"total_billed_rate" numeric(12, 6),
	"provider_call_cost" numeric(10, 4),
	"llm_tokens_used" integer,
	"stt_cost" numeric(10, 4),
	"tts_cost" numeric(10, 4),
	"response_latency_avg" integer,
	"conversation_messages" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "call_logs_provider_call_id_unique" UNIQUE("provider_call_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_log_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"topic" text NOT NULL,
	"confidence" numeric(5, 2),
	"sentiment" text,
	"is_resolved" boolean DEFAULT false,
	"mentions" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer,
	"org_id" integer NOT NULL,
	"phone_number" text NOT NULL,
	"phone_number_e164" text NOT NULL,
	"country_code" text,
	"contact_name" text,
	"contact_email" text,
	"contact_metadata" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"dnc_checked" boolean DEFAULT false,
	"dnc_result" text,
	"dnc_checked_at" timestamp,
	"attempt_count" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"last_attempt_at" timestamp,
	"next_retry_after" timestamp,
	"last_call_disposition" text,
	"call_log_id" integer,
	"opted_out" boolean DEFAULT false,
	"opted_out_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"agent_id" integer,
	"status" text DEFAULT 'draft',
	"contact_list" jsonb DEFAULT '[]'::jsonb,
	"completed_contacts" jsonb DEFAULT '[]'::jsonb,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"total_contacts" integer DEFAULT 0,
	"completed_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"call_interval" integer DEFAULT 30,
	"max_retries" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"campaign_type" text DEFAULT 'outbound',
	"country_code" text,
	"language" text DEFAULT 'en-GB',
	"phone_number_id" integer,
	"script" text,
	"script_language" text,
	"script_version" integer DEFAULT 1,
	"calling_hours_start" text,
	"calling_hours_end" text,
	"calling_timezone" text,
	"pacing_calls_per_minute" integer DEFAULT 5,
	"pacing_max_concurrent" integer DEFAULT 3,
	"pacing_ramp_up_minutes" integer DEFAULT 5,
	"retry_max_attempts" integer DEFAULT 3,
	"retry_interval_minutes" integer DEFAULT 60,
	"retry_window_start" text,
	"retry_window_end" text,
	"budget_cap" numeric(12, 2),
	"budget_spent" numeric(12, 2) DEFAULT '0',
	"budget_alert_threshold" numeric(5, 2) DEFAULT '80',
	"daily_spend_limit" numeric(12, 2),
	"answered_count" integer DEFAULT 0,
	"converted_count" integer DEFAULT 0,
	"opt_out_count" integer DEFAULT 0,
	"conversion_definition" text,
	"paused_at" timestamp,
	"paused_reason" text,
	"archived_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"source_connector_id" integer,
	"estimated_cost" numeric(12, 2),
	"locked_amount" numeric(12, 2),
	"cost_cap_reached" boolean DEFAULT false,
	"approved_at" timestamp,
	"approved_by" integer,
	"consent_confirmed" boolean DEFAULT false,
	"consent_confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "canned_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"category" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"shortcut" text,
	"usage_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_studies" (
	"id" serial PRIMARY KEY NOT NULL,
	"industry_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"hero_image" text,
	"challenge" text NOT NULL,
	"solution" text NOT NULL,
	"results" text NOT NULL,
	"testimonial_quote" text,
	"testimonial_author" text,
	"testimonial_role" text,
	"roi_percentage" integer,
	"cost_reduction" integer,
	"calls_handled" integer,
	"customer_satisfaction" real,
	"key_metrics" jsonb DEFAULT '[]'::jsonb,
	"meta_title" text,
	"meta_description" text,
	"published" boolean DEFAULT true,
	"featured" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "case_studies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channel_billing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_type" text NOT NULL,
	"talk_time_equivalent_minutes" numeric(10, 4) NOT NULL,
	"provider_cost_per_unit" numeric(10, 4),
	"margin_percent" numeric(5, 2),
	"effective_from" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channel_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"channel_type" text NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"credentials" jsonb,
	"webhook_url" text,
	"webhook_secret" text,
	"provider_account_id" text,
	"settings" jsonb,
	"rate_limit" integer,
	"sla_response_seconds" integer,
	"status" text DEFAULT 'inactive',
	"last_health_check" timestamp,
	"health_status" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channel_health_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"channel_type" text NOT NULL,
	"status" text NOT NULL,
	"check_type" text,
	"response_time_ms" integer,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"ip_address" text,
	"status" text DEFAULT 'new',
	"total_messages" integer DEFAULT 0,
	"last_message_at" timestamp,
	"phone" text,
	"company" text,
	"company_domain" text,
	"industry" text,
	"estimated_size" text,
	"lead_score" integer DEFAULT 0,
	"pipeline_stage" text DEFAULT 'new',
	"assigned_to" integer,
	"tags" text[],
	"enriched_at" timestamp,
	"enrichment_data" jsonb,
	"source_channel" text DEFAULT 'chatbot',
	"last_contacted_at" timestamp,
	"org_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer,
	"conversation_id" integer,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"rating" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coaching_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"name" text NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_condition" jsonb NOT NULL,
	"coaching_message" text NOT NULL,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commission_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"org_id" integer,
	"source_type" text NOT NULL,
	"source_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"status" text DEFAULT 'holding' NOT NULL,
	"holding_until" timestamp,
	"available_at" timestamp,
	"withdrawal_id" integer,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "connector_interest" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"connector_type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consent_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"phone_number" text NOT NULL,
	"consent_type" text NOT NULL,
	"consent_given" boolean NOT NULL,
	"consent_method" text,
	"consent_text" text,
	"ip_address" text,
	"call_log_id" integer,
	"revoked_at" timestamp,
	"revoked_reason" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cost_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"provider" text DEFAULT 'gorigo',
	"unit_cost_amount" numeric(10, 4) NOT NULL,
	"unit_type" text NOT NULL,
	"markup_percent" numeric(5, 2) DEFAULT '40',
	"selling_price" numeric(12, 2),
	"is_active" boolean DEFAULT true,
	"effective_from" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cost_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"call_log_id" integer,
	"category" text NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"unit_quantity" numeric(12, 4) DEFAULT '0',
	"unit_type" text NOT NULL,
	"unit_cost" numeric(12, 6) NOT NULL,
	"total_cost" numeric(12, 6) NOT NULL,
	"revenue_charged" numeric(12, 2) DEFAULT '0',
	"margin" numeric(12, 6) DEFAULT '0',
	"currency" text DEFAULT 'GBP',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"iso_code" text NOT NULL,
	"name" text NOT NULL,
	"calling_code" text NOT NULL,
	"timezone" text NOT NULL,
	"currency" text NOT NULL,
	"tier" integer DEFAULT 2 NOT NULL,
	"status" text DEFAULT 'coming_soon' NOT NULL,
	"flag_emoji" text,
	"region" text,
	"number_formats" jsonb,
	"requires_kyc" boolean DEFAULT false,
	"requires_local_presence" boolean DEFAULT false,
	"sanctioned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "countries_iso_code_unique" UNIQUE("iso_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "country_compliance_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" integer NOT NULL,
	"calling_hours_start" text DEFAULT '09:00' NOT NULL,
	"calling_hours_end" text DEFAULT '20:00' NOT NULL,
	"calling_hours_timezone" text NOT NULL,
	"restricted_days" jsonb DEFAULT '[]'::jsonb,
	"dnc_registry_name" text,
	"dnc_registry_url" text,
	"dnc_check_method" text DEFAULT 'manual',
	"dnc_api_endpoint" text,
	"ai_disclosure_required" boolean DEFAULT true,
	"ai_disclosure_script" text,
	"ai_disclosure_language" text,
	"recording_consent_type" text DEFAULT 'one_party' NOT NULL,
	"recording_consent_script" text,
	"max_call_attempts_per_day" integer DEFAULT 3,
	"max_call_attempts_per_week" integer DEFAULT 10,
	"cooling_off_hours" integer DEFAULT 24,
	"data_retention_days" integer DEFAULT 90,
	"data_residency_required" boolean DEFAULT false,
	"data_residency_region" text,
	"regulatory_body" text,
	"regulatory_url" text,
	"notes" text,
	"last_reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "country_holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" integer NOT NULL,
	"name" text NOT NULL,
	"date" text NOT NULL,
	"is_recurring" boolean DEFAULT false,
	"no_calling_allowed" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "country_rate_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" integer NOT NULL,
	"deployment_model" text NOT NULL,
	"direction" text DEFAULT 'outbound' NOT NULL,
	"number_type" text DEFAULT 'mobile' NOT NULL,
	"surcharge_per_minute" numeric(10, 4) NOT NULL,
	"twilio_estimated_cost" numeric(10, 4),
	"margin_percent" numeric(5, 2) DEFAULT '20',
	"is_active" boolean DEFAULT true,
	"effective_from" timestamp DEFAULT now(),
	"effective_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_connectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"connector_type" text NOT NULL,
	"name" text NOT NULL,
	"auth_type" text NOT NULL,
	"encrypted_credentials" text,
	"oauth_access_token" text,
	"oauth_refresh_token" text,
	"oauth_expires_at" timestamp,
	"oauth_scopes" text,
	"oauth_email" text,
	"config" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"last_tested_at" timestamp,
	"last_error_message" text,
	"total_lookups" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "demo_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"phone" text,
	"message" text,
	"source" text DEFAULT 'chatgpt',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "department_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"department_role" text DEFAULT 'AGENT' NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"manager_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"color" text DEFAULT '#6366f1',
	"spending_cap" numeric(12, 2),
	"spent_this_month" numeric(12, 2) DEFAULT '0',
	"spending_cap_reset_at" timestamp,
	"budget_alert_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deployment_model_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"old_model" text NOT NULL,
	"new_model" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"prerequisites_met" jsonb,
	"active_calls_at_switch" integer DEFAULT 0,
	"initiated_by" integer NOT NULL,
	"initiated_by_email" text,
	"effective_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "distribution_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"billing_ledger_id" integer,
	"wallet_transaction_id" integer,
	"total_amount" numeric(12, 2) NOT NULL,
	"platform_amount" numeric(12, 2) NOT NULL,
	"partner_amount" numeric(12, 2) DEFAULT '0',
	"partner_id" integer,
	"reseller_amount" numeric(12, 2) DEFAULT '0',
	"reseller_id" integer,
	"affiliate_amount" numeric(12, 2) DEFAULT '0',
	"affiliate_id" integer,
	"channel" text DEFAULT 'd2c' NOT NULL,
	"reference_id" text,
	"status" text DEFAULT 'completed',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "do_not_call_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"phone_number" text NOT NULL,
	"reason" text,
	"source" text,
	"added_by" integer,
	"notes" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"prompt" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"tone" text DEFAULT 'professional',
	"language" text DEFAULT 'en',
	"version" integer DEFAULT 1 NOT NULL,
	"parent_draft_id" integer,
	"quality_score" real,
	"source" text DEFAULT 'web',
	"metadata" jsonb,
	"published_to_agent_id" integer,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"event_type" text NOT NULL,
	"reason" text,
	"sg_message_id" text,
	"sg_event_id" text,
	"bounce_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "failed_distributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"deduction_amount" numeric(12, 2) NOT NULL,
	"wallet_transaction_id" integer,
	"description" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"status" text DEFAULT 'pending',
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"subtype" text,
	"description" text,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"changes" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_bill_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 4) DEFAULT '1',
	"unit_price" numeric(12, 2) DEFAULT '0',
	"tax_rate" numeric(5, 2) DEFAULT '0',
	"amount" numeric(12, 2) DEFAULT '0',
	"account_id" integer,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"bill_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"category" text,
	"issue_date" timestamp DEFAULT now(),
	"due_date" timestamp,
	"subtotal" numeric(12, 2) DEFAULT '0',
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0',
	"amount_paid" numeric(12, 2) DEFAULT '0',
	"notes" text,
	"receipt_url" text,
	"currency" text DEFAULT 'GBP',
	"journal_entry_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_credit_note_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_note_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 4) DEFAULT '1',
	"unit_price" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0',
	"line_total" numeric(12, 2) NOT NULL,
	"account_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_credit_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"invoice_id" integer,
	"customer_id" integer NOT NULL,
	"credit_note_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"issue_date" timestamp DEFAULT now(),
	"reason" text,
	"subtotal" numeric(12, 2) DEFAULT '0',
	"tax_total" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0',
	"amount_applied" numeric(12, 2) DEFAULT '0',
	"journal_entry_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"tax_id" text,
	"notes" text,
	"default_payment_terms" integer DEFAULT 30,
	"total_invoiced" numeric(12, 2) DEFAULT '0',
	"total_paid" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_invoice_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 4) DEFAULT '1',
	"unit_price" numeric(12, 2) DEFAULT '0',
	"tax_rate" numeric(5, 2) DEFAULT '0',
	"amount" numeric(12, 2) DEFAULT '0',
	"account_id" integer,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"issue_date" timestamp DEFAULT now(),
	"due_date" timestamp,
	"subtotal" numeric(12, 2) DEFAULT '0',
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0',
	"amount_paid" numeric(12, 2) DEFAULT '0',
	"notes" text,
	"terms" text,
	"currency" text DEFAULT 'GBP',
	"journal_entry_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"entry_date" timestamp DEFAULT now(),
	"reference" text,
	"description" text,
	"source_type" text,
	"source_id" integer,
	"is_manual" boolean DEFAULT false,
	"is_posted" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_journal_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"journal_entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debit" numeric(12, 2) DEFAULT '0',
	"credit" numeric(12, 2) DEFAULT '0',
	"description" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"type" text NOT NULL,
	"invoice_id" integer,
	"bill_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" timestamp DEFAULT now(),
	"method" text DEFAULT 'bank_transfer',
	"reference" text,
	"notes" text,
	"account_id" integer,
	"journal_entry_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"tax_id" text,
	"notes" text,
	"default_payment_terms" integer DEFAULT 30,
	"total_billed" numeric(12, 2) DEFAULT '0',
	"total_paid" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_tax_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"rate" numeric(5, 2) NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fin_workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'company' NOT NULL,
	"currency" text DEFAULT 'GBP',
	"fiscal_year_start" integer DEFAULT 4,
	"vat_registered" boolean DEFAULT false,
	"vat_number" text,
	"company_name" text,
	"company_address" text,
	"company_email" text,
	"company_phone" text,
	"invoice_prefix" text DEFAULT 'INV',
	"next_invoice_number" integer DEFAULT 1001,
	"bill_prefix" text DEFAULT 'BILL',
	"next_bill_number" integer DEFAULT 1001,
	"credit_note_prefix" text DEFAULT 'CN',
	"next_credit_note_number" integer DEFAULT 1001,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "human_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'offline',
	"skills" text[],
	"max_concurrent_calls" integer DEFAULT 3,
	"current_call_count" integer DEFAULT 0,
	"last_active_at" timestamp,
	"shift_start" timestamp,
	"shift_end" timestamp,
	"total_calls_handled" integer DEFAULT 0,
	"avg_handle_time" numeric(10, 2),
	"avg_quality" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "industries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"compliance_notes" text,
	"regulatory_body" text,
	"sic_code" text,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "industries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "industry_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"industry_id" integer NOT NULL,
	"template_type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"voice_profile_id" integer,
	"language" text DEFAULT 'en-GB',
	"tone" text DEFAULT 'professional',
	"compliance_disclaimer" text,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"tags" text,
	"version" integer DEFAULT 1,
	"is_system" boolean DEFAULT true,
	"org_id" integer,
	"usage_count" integer DEFAULT 0,
	"rating" real,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"department_id" integer,
	"org_role" text DEFAULT 'AGENT' NOT NULL,
	"department_role" text DEFAULT 'AGENT',
	"invited_by_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"run_at" timestamp DEFAULT now(),
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"status" text DEFAULT 'pending',
	"result" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"chunk_index" integer DEFAULT 0,
	"token_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source_type" text DEFAULT 'manual',
	"source_url" text,
	"status" text DEFAULT 'pending',
	"chunk_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"performed_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"channel_type" text NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"language" text DEFAULT 'en',
	"category" text,
	"approval_status" text DEFAULT 'pending',
	"approval_submitted_at" timestamp,
	"approved_at" timestamp,
	"rejected_reason" text,
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"action_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "omnichannel_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"channel_type" text NOT NULL,
	"external_conversation_id" text,
	"status" text DEFAULT 'active',
	"assigned_human_agent_id" integer,
	"assigned_ai_agent_id" integer,
	"priority" integer DEFAULT 0,
	"subject" text,
	"last_message_at" timestamp,
	"last_customer_message_at" timestamp,
	"message_count" integer DEFAULT 0,
	"is_unread" boolean DEFAULT true,
	"sla_deadline" timestamp,
	"sla_breach" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "omnichannel_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"direction" text NOT NULL,
	"sender_type" text NOT NULL,
	"sender_id" integer,
	"content" text,
	"media_type" text DEFAULT 'text',
	"media_url" text,
	"media_mime_type" text,
	"media_size" integer,
	"channel_message_id" text,
	"status" text DEFAULT 'pending',
	"failure_reason" text,
	"template_id" integer,
	"is_interactive" boolean DEFAULT false,
	"interactive_data" jsonb,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'OWNER' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orgs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"channel_type" text DEFAULT 'd2c',
	"status" text DEFAULT 'active',
	"suspended_at" timestamp,
	"suspended_reason" text,
	"referred_by_affiliate_id" integer,
	"max_concurrent_calls" integer DEFAULT 5,
	"min_call_balance" numeric(12, 2) DEFAULT '1.00',
	"business_hours" jsonb,
	"voicemail_enabled" boolean DEFAULT false,
	"voicemail_greeting" text,
	"deployment_model" text DEFAULT 'individual',
	"webhook_secret" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"agreement_type" text DEFAULT 'standard' NOT NULL,
	"status" text DEFAULT 'active',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"auto_renew" boolean DEFAULT true,
	"notice_period_days" integer DEFAULT 30,
	"data_retention_days" integer DEFAULT 90,
	"commission_clawback_days" integer DEFAULT 60,
	"minimum_commitment_amount" numeric(12, 2) DEFAULT '0',
	"termination_fee" numeric(12, 2) DEFAULT '0',
	"non_compete_days" integer DEFAULT 0,
	"data_export_included" boolean DEFAULT true,
	"whitelabel_rights" text DEFAULT 'co-branded',
	"sla_uptime_percent" numeric(5, 2) DEFAULT '99.5',
	"sla_response_time_minutes" integer DEFAULT 60,
	"custom_terms" jsonb,
	"signed_by_partner" boolean DEFAULT false,
	"signed_by_platform" boolean DEFAULT false,
	"signed_at" timestamp,
	"terminated_at" timestamp,
	"termination_initiator" text,
	"termination_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"status" text DEFAULT 'active',
	"retail_rate_per_minute" numeric(10, 4),
	"notes" text,
	"reassigned_from_partner_id" integer,
	"reassigned_at" timestamp,
	"rate_frozen_until" timestamp,
	"previous_rate" numeric(10, 4),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_lifecycle_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"reason" text,
	"initiated_by" integer,
	"affected_clients" integer DEFAULT 0,
	"affected_resellers" integer DEFAULT 0,
	"affected_affiliates" integer DEFAULT 0,
	"cascade_actions" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_name" text,
	"partner_code" text,
	"branding_logo" text,
	"branding_primary_color" text DEFAULT '#3B82F6',
	"branding_company_name" text,
	"mobile_app_enabled" boolean DEFAULT false,
	"whitelabel_mode" text DEFAULT 'co-branded',
	"custom_domain" text,
	"tier" text DEFAULT 'BRONZE',
	"status" text DEFAULT 'active',
	"partner_type" text DEFAULT 'business_partner',
	"wholesale_rate_per_minute" numeric(10, 4) DEFAULT '0.05',
	"reseller_rate_per_minute" numeric(10, 4) DEFAULT '0.04',
	"monthly_platform_fee" numeric(12, 2) DEFAULT '0',
	"revenue_share_percent" numeric(5, 2) DEFAULT '0',
	"max_clients" integer DEFAULT 50,
	"max_resellers" integer DEFAULT 20,
	"features_enabled" jsonb DEFAULT '["voice_inbound","call_logs","agent_config"]'::jsonb,
	"notes" text,
	"parent_partner_id" integer,
	"org_id" integer,
	"can_create_resellers" boolean DEFAULT true,
	"can_sell_direct" boolean DEFAULT true,
	"can_create_affiliates" boolean DEFAULT true,
	"terminated_at" timestamp,
	"termination_reason" text,
	"archived_at" timestamp,
	"legal_hold" boolean DEFAULT false,
	"legal_hold_reason" text,
	"legal_hold_set_at" timestamp,
	"last_activity_at" timestamp,
	"last_payment_at" timestamp,
	"grace_period_ends_at" timestamp,
	"auto_suspend_after_days" integer DEFAULT 30,
	"health_score" integer DEFAULT 100,
	"stripe_connect_account_id" text,
	"stripe_connect_onboarding_complete" boolean DEFAULT false,
	"bank_account_name" text,
	"bank_sort_code" text,
	"bank_account_number" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"suspended_at" timestamp,
	CONSTRAINT "partners_partner_code_unique" UNIQUE("partner_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "phone_numbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"friendly_name" text,
	"org_id" integer,
	"provider_sid" text,
	"capabilities" jsonb DEFAULT '{"voice":true,"sms":false}'::jsonb,
	"is_active" boolean DEFAULT true,
	"assigned_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"country_code" text,
	"number_type" text DEFAULT 'local',
	"sub_account_id" integer,
	"health_score" integer DEFAULT 100,
	"answer_rate" numeric(5, 2),
	"total_calls_made" integer DEFAULT 0,
	"spam_flagged" boolean DEFAULT false,
	"spam_flagged_at" timestamp,
	"last_used_at" timestamp,
	"monthly_rental_cost" numeric(10, 4),
	"provisioning_status" text DEFAULT 'active',
	"regulatory_bundle_sid" text,
	"campaign_id" integer,
	CONSTRAINT "phone_numbers_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_knowledge_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "provider_sub_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"provider_account_id" text,
	"provider_auth_token" text,
	"friendly_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"concurrent_call_limit" integer DEFAULT 10,
	"daily_spend_limit" numeric(12, 2),
	"current_daily_spend" numeric(12, 2) DEFAULT '0',
	"last_spend_reset_at" timestamp,
	"suspended_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "provider_sub_accounts_org_id_unique" UNIQUE("org_id"),
	CONSTRAINT "provider_sub_accounts_provider_account_id_unique" UNIQUE("provider_account_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"channel" text DEFAULT 'chatbot' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"lead_id" integer,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"duration" integer,
	CONSTRAINT "public_conversations_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"deployment_model" text NOT NULL,
	"category" text NOT NULL,
	"label" text NOT NULL,
	"rate_per_minute" numeric(10, 4) NOT NULL,
	"platform_fee_per_minute" numeric(10, 4) NOT NULL,
	"includes_ai_cost" boolean DEFAULT true,
	"includes_telephony_cost" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"bucket" varchar(64) NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"window_end" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "response_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"query_embedding" vector(768),
	"query_text" text NOT NULL,
	"response_text" text NOT NULL,
	"confidence" numeric(5, 2) DEFAULT '0',
	"hit_count" integer DEFAULT 0,
	"last_hit_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rigo_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"intent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rigo_follow_ups" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer,
	"contact_name" text,
	"contact_phone" text,
	"reason" text NOT NULL,
	"due_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"linked_call_id" integer,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rigo_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer,
	"content" text NOT NULL,
	"tags" text[],
	"linked_entity_type" text,
	"linked_entity_id" integer,
	"source" text DEFAULT 'voice' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rigo_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer,
	"message" text NOT NULL,
	"trigger_at" timestamp NOT NULL,
	"recurrence" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"delivery_method" text DEFAULT 'in_app' NOT NULL,
	"linked_entity_type" text,
	"linked_entity_id" integer,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"last_seen_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"active_org_id" integer,
	"rotated_at" timestamp DEFAULT now(),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"platform" text NOT NULL,
	"reach" integer DEFAULT 0,
	"impressions" integer DEFAULT 0,
	"engagement" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"followers" integer DEFAULT 0,
	"fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"strategy_id" integer,
	"content" text NOT NULL,
	"platforms" text[] NOT NULL,
	"media_urls" text[],
	"media_thumbnails" text[],
	"media_source" text,
	"platform_post_ids" jsonb,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"retry_count" integer DEFAULT 0,
	"last_error" text,
	"utm_params" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"business_type" text NOT NULL,
	"goals" text NOT NULL,
	"platforms" text[] NOT NULL,
	"budget" text,
	"timeframe" text,
	"tone" text DEFAULT 'professional',
	"strategy_content" jsonb,
	"estimated_cost" numeric(10, 4),
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" text DEFAULT 'active',
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supervisor_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"supervisor_user_id" integer NOT NULL,
	"call_log_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"mode" text NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"details" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "template_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"changed_by" integer,
	"change_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tps_check_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_hash" text NOT NULL,
	"phone_prefix" text,
	"is_registered" boolean NOT NULL,
	"registry_type" text,
	"checked_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"source" text DEFAULT 'cache'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unified_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"primary_phone" text,
	"primary_email" text,
	"display_name" text,
	"merged_from_ids" jsonb DEFAULT '[]'::jsonb,
	"channels" jsonb DEFAULT '{}'::jsonb,
	"total_interactions" integer DEFAULT 0,
	"last_interaction_at" timestamp,
	"last_channel" text,
	"tags" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"month" text NOT NULL,
	"minutes_used" numeric(10, 2) DEFAULT '0',
	"minute_limit" integer DEFAULT 500,
	"call_count" integer DEFAULT 0,
	"leads_captured" integer DEFAULT 0,
	"spending_cap" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"business_name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"is_demo" boolean DEFAULT false,
	"failed_login_attempts" integer DEFAULT 0,
	"locked_until" timestamp,
	"global_role" text DEFAULT 'CLIENT',
	"email_verified" boolean DEFAULT false,
	"email_verification_token" text,
	"email_verification_expires_at" timestamp,
	"terms_accepted_at" timestamp,
	"terms_version" text,
	"must_change_password" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voice_biometric_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_log_id" integer,
	"voiceprint_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"result" text NOT NULL,
	"confidence_score" numeric(5, 2),
	"verification_mode" text,
	"duration_ms" integer,
	"spoofing_detected" boolean DEFAULT false,
	"spoofing_type" text DEFAULT 'none',
	"spoofing_confidence" numeric(5, 2),
	"fallback_used" boolean DEFAULT false,
	"fallback_method" text,
	"provider_response_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voice_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"pitch" real DEFAULT 1,
	"speed" real DEFAULT 1,
	"warmth" real DEFAULT 0.5,
	"emphasis" real DEFAULT 0.5,
	"pause_length" real DEFAULT 0.3,
	"tts_provider" text DEFAULT 'aws_polly',
	"tts_voice_id" text DEFAULT 'Polly.Amy',
	"tts_model_id" text,
	"sample_audio_url" text,
	"best_for" text,
	"is_system" boolean DEFAULT true,
	"org_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "voice_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voiceprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_phone" text NOT NULL,
	"org_id" integer NOT NULL,
	"provider_reference_id" text,
	"enrollment_method" text DEFAULT 'in_call',
	"enrollment_quality" numeric(5, 2),
	"enrollment_samples" integer DEFAULT 0,
	"verification_mode" text DEFAULT 'passive',
	"passphrase_text" text,
	"status" text DEFAULT 'active',
	"total_verifications" integer DEFAULT 0,
	"last_verified_at" timestamp,
	"last_updated_at" timestamp,
	"adaptive_updates" integer DEFAULT 0,
	"consent_timestamp" timestamp,
	"consent_method" text,
	"consent_text" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_before" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"description" text,
	"reference_type" text,
	"reference_id" text,
	"idempotency_key" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"low_balance_threshold" numeric(12, 2) DEFAULT '10',
	"low_balance_email_enabled" boolean DEFAULT true,
	"last_low_balance_alert_at" timestamp,
	"locked_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "wallets_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"url" text NOT NULL,
	"events" text[] DEFAULT '{}',
	"secret" text,
	"is_active" boolean DEFAULT true,
	"last_triggered" timestamp,
	"failure_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"org_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_transfer_id" text,
	"stripe_payout_id" text,
	"admin_note" text,
	"rejection_reason" text,
	"requested_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by" integer,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_call_billing_state" ADD CONSTRAINT "active_call_billing_state_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_converted_org_id_orgs_id_fk" FOREIGN KEY ("converted_org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_assist_sessions" ADD CONSTRAINT "agent_assist_sessions_call_log_id_call_logs_id_fk" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_assist_sessions" ADD CONSTRAINT "agent_assist_sessions_human_agent_id_human_agents_id_fk" FOREIGN KEY ("human_agent_id") REFERENCES "public"."human_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_assist_sessions" ADD CONSTRAINT "agent_assist_sessions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_flows" ADD CONSTRAINT "agent_flows_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_flows" ADD CONSTRAINT "agent_flows_entry_agent_id_agents_id_fk" FOREIGN KEY ("entry_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_scorecards" ADD CONSTRAINT "agent_scorecards_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_scorecards" ADD CONSTRAINT "agent_scorecards_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_alerts" ADD CONSTRAINT "analytics_alerts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_sessions" ADD CONSTRAINT "analytics_sessions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_sessions" ADD CONSTRAINT "analytics_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assist_suggestions" ADD CONSTRAINT "assist_suggestions_session_id_agent_assist_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_assist_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assist_suggestions" ADD CONSTRAINT "assist_suggestions_knowledge_doc_id_knowledge_documents_id_fk" FOREIGN KEY ("knowledge_doc_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_ledger" ADD CONSTRAINT "billing_ledger_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_ledger" ADD CONSTRAINT "billing_ledger_call_log_id_call_logs_id_fk" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_config" ADD CONSTRAINT "biometric_config_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_fraud_alerts" ADD CONSTRAINT "biometric_fraud_alerts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_fraud_alerts" ADD CONSTRAINT "biometric_fraud_alerts_voiceprint_id_voiceprints_id_fk" FOREIGN KEY ("voiceprint_id") REFERENCES "public"."voiceprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_fraud_alerts" ADD CONSTRAINT "biometric_fraud_alerts_call_log_id_call_logs_id_fk" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_fraud_alerts" ADD CONSTRAINT "biometric_fraud_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_analytics_rollups" ADD CONSTRAINT "call_analytics_rollups_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_hops" ADD CONSTRAINT "call_hops_call_log_id_call_logs_id_fk" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_hops" ADD CONSTRAINT "call_hops_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_hops" ADD CONSTRAINT "call_hops_from_agent_id_agents_id_fk" FOREIGN KEY ("from_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_hops" ADD CONSTRAINT "call_hops_to_agent_id_agents_id_fk" FOREIGN KEY ("to_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_campaign_contact_id_campaign_contacts_id_fk" FOREIGN KEY ("campaign_contact_id") REFERENCES "public"."campaign_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_topics" ADD CONSTRAINT "call_topics_call_log_id_call_logs_id_fk" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_topics" ADD CONSTRAINT "call_topics_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canned_responses" ADD CONSTRAINT "canned_responses_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_configurations" ADD CONSTRAINT "channel_configurations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_health_log" ADD CONSTRAINT "channel_health_log_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_lead_id_chat_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."chat_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_public_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."public_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_rules" ADD CONSTRAINT "coaching_rules_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_interest" ADD CONSTRAINT "connector_interest_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_interest" ADD CONSTRAINT "connector_interest_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_call_log_id_call_logs_id_fk" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_events" ADD CONSTRAINT "cost_events_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_events" ADD CONSTRAINT "cost_events_call_log_id_call_logs_id_fk" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country_compliance_profiles" ADD CONSTRAINT "country_compliance_profiles_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country_holidays" ADD CONSTRAINT "country_holidays_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country_rate_cards" ADD CONSTRAINT "country_rate_cards_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_connectors" ADD CONSTRAINT "data_connectors_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_connectors" ADD CONSTRAINT "data_connectors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_model_changes" ADD CONSTRAINT "deployment_model_changes_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_model_changes" ADD CONSTRAINT "deployment_model_changes_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_ledger" ADD CONSTRAINT "distribution_ledger_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_ledger" ADD CONSTRAINT "distribution_ledger_billing_ledger_id_billing_ledger_id_fk" FOREIGN KEY ("billing_ledger_id") REFERENCES "public"."billing_ledger"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "do_not_call_list" ADD CONSTRAINT "do_not_call_list_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "do_not_call_list" ADD CONSTRAINT "do_not_call_list_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_published_to_agent_id_agents_id_fk" FOREIGN KEY ("published_to_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failed_distributions" ADD CONSTRAINT "failed_distributions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_accounts" ADD CONSTRAINT "fin_accounts_workspace_id_fin_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."fin_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_audit_log" ADD CONSTRAINT "fin_audit_log_workspace_id_fin_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."fin_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_bill_lines" ADD CONSTRAINT "fin_bill_lines_bill_id_fin_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."fin_bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_bills" ADD CONSTRAINT "fin_bills_workspace_id_fin_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."fin_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_bills" ADD CONSTRAINT "fin_bills_supplier_id_fin_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."fin_suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_credit_note_lines" ADD CONSTRAINT "fin_credit_note_lines_credit_note_id_fin_credit_notes_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."fin_credit_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_credit_note_lines" ADD CONSTRAINT "fin_credit_note_lines_account_id_fin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."fin_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_credit_notes" ADD CONSTRAINT "fin_credit_notes_workspace_id_fin_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."fin_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_credit_notes" ADD CONSTRAINT "fin_credit_notes_invoice_id_fin_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."fin_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_credit_notes" ADD CONSTRAINT "fin_credit_notes_customer_id_fin_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."fin_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_customers" ADD CONSTRAINT "fin_customers_workspace_id_fin_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."fin_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_invoice_lines" ADD CONSTRAINT "fin_invoice_lines_invoice_id_fin_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."fin_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_workspace_id_fin_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."fin_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_customer_id_fin_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."fin_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_journal_entries" ADD CONSTRAINT "fin_journal_entries_workspace_id_fin_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."fin_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_journal_lines" ADD CONSTRAINT "fin_journal_lines_journal_entry_id_fin_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."fin_journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_journal_lines" ADD CONSTRAINT "fin_journal_lines_account_id_fin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."fin_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_payments" ADD CONSTRAINT "fin_payments_workspace_id_fin_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."fin_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_suppliers" ADD CONSTRAINT "fin_suppliers_workspace_id_fin_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."fin_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_tax_codes" ADD CONSTRAINT "fin_tax_codes_workspace_id_fin_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."fin_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_workspaces" ADD CONSTRAINT "fin_workspaces_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_agents" ADD CONSTRAINT "human_agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_agents" ADD CONSTRAINT "human_agents_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_templates" ADD CONSTRAINT "industry_templates_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_templates" ADD CONSTRAINT "industry_templates_voice_profile_id_voice_profiles_id_fk" FOREIGN KEY ("voice_profile_id") REFERENCES "public"."voice_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_templates" ADD CONSTRAINT "industry_templates_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_chat_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."chat_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omnichannel_conversations" ADD CONSTRAINT "omnichannel_conversations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omnichannel_conversations" ADD CONSTRAINT "omnichannel_conversations_contact_id_unified_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."unified_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omnichannel_conversations" ADD CONSTRAINT "omnichannel_conversations_assigned_ai_agent_id_agents_id_fk" FOREIGN KEY ("assigned_ai_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omnichannel_messages" ADD CONSTRAINT "omnichannel_messages_conversation_id_omnichannel_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."omnichannel_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omnichannel_messages" ADD CONSTRAINT "omnichannel_messages_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreements" ADD CONSTRAINT "partner_agreements_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_clients" ADD CONSTRAINT "partner_clients_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_clients" ADD CONSTRAINT "partner_clients_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_lifecycle_events" ADD CONSTRAINT "partner_lifecycle_events_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_sub_accounts" ADD CONSTRAINT "provider_sub_accounts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_conversations" ADD CONSTRAINT "public_conversations_lead_id_chat_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."chat_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_cache" ADD CONSTRAINT "response_cache_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rigo_conversations" ADD CONSTRAINT "rigo_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rigo_conversations" ADD CONSTRAINT "rigo_conversations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rigo_follow_ups" ADD CONSTRAINT "rigo_follow_ups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rigo_follow_ups" ADD CONSTRAINT "rigo_follow_ups_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rigo_notes" ADD CONSTRAINT "rigo_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rigo_notes" ADD CONSTRAINT "rigo_notes_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rigo_reminders" ADD CONSTRAINT "rigo_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rigo_reminders" ADD CONSTRAINT "rigo_reminders_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_analytics" ADD CONSTRAINT "social_analytics_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_analytics" ADD CONSTRAINT "social_analytics_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_strategy_id_social_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."social_strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_strategies" ADD CONSTRAINT "social_strategies_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_strategies" ADD CONSTRAINT "social_strategies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_billing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisor_sessions" ADD CONSTRAINT "supervisor_sessions_supervisor_user_id_users_id_fk" FOREIGN KEY ("supervisor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisor_sessions" ADD CONSTRAINT "supervisor_sessions_call_log_id_call_logs_id_fk" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisor_sessions" ADD CONSTRAINT "supervisor_sessions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_activity_log" ADD CONSTRAINT "team_activity_log_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_activity_log" ADD CONSTRAINT "team_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_industry_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."industry_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unified_contacts" ADD CONSTRAINT "unified_contacts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_biometric_attempts" ADD CONSTRAINT "voice_biometric_attempts_call_log_id_call_logs_id_fk" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_biometric_attempts" ADD CONSTRAINT "voice_biometric_attempts_voiceprint_id_voiceprints_id_fk" FOREIGN KEY ("voiceprint_id") REFERENCES "public"."voiceprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_biometric_attempts" ADD CONSTRAINT "voice_biometric_attempts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_profiles" ADD CONSTRAINT "voice_profiles_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voiceprints" ADD CONSTRAINT "voiceprints_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_active_billing_org" ON "active_call_billing_state" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_active_billing_terminated" ON "active_call_billing_state" USING btree ("terminated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_affiliate_clicks_affiliate_id" ON "affiliate_clicks" USING btree ("affiliate_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_aff_commission_txn" ON "affiliate_commissions" USING btree ("wallet_transaction_id","affiliate_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aff_commission_org" ON "affiliate_commissions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aff_commission_status" ON "affiliate_commissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_affiliates_org" ON "affiliates" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_affiliates_owner" ON "affiliates" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_affiliates_status" ON "affiliates" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assist_sessions_call_log" ON "agent_assist_sessions" USING btree ("call_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assist_sessions_human_agent" ON "agent_assist_sessions" USING btree ("human_agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assist_sessions_org_id" ON "agent_assist_sessions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assist_sessions_started" ON "agent_assist_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agent_flows_org_id" ON "agent_flows" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scorecards_agent_id" ON "agent_scorecards" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scorecards_org_id" ON "agent_scorecards" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scorecards_period" ON "agent_scorecards" USING btree ("org_id","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scorecards_period_start" ON "agent_scorecards" USING btree ("agent_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agents_org_id" ON "agents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agents_user_id" ON "agents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agents_org_status" ON "agents" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_alerts_org_id" ON "analytics_alerts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_alerts_type" ON "analytics_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_alerts_read" ON "analytics_alerts" USING btree ("org_id","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_alerts_created" ON "analytics_alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_session_id" ON "analytics_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_visitor_id" ON "analytics_events" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_org_id" ON "analytics_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_event_type" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_page" ON "analytics_events" USING btree ("page");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_created_at" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_page_event_type" ON "analytics_events" USING btree ("page","event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_sessions_session_id" ON "analytics_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_sessions_visitor_id" ON "analytics_sessions" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_sessions_org_id" ON "analytics_sessions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_sessions_started_at" ON "analytics_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_sessions_is_bounce" ON "analytics_sessions" USING btree ("is_bounce");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_sessions_is_converted" ON "analytics_sessions" USING btree ("is_converted");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_api_keys_key_hash" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_org_id" ON "api_keys" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assist_suggestions_session" ON "assist_suggestions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assist_suggestions_source" ON "assist_suggestions" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assist_suggestions_status" ON "assist_suggestions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_log_actor" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_log_action" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_log_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_ledger_org_id" ON "billing_ledger" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_ledger_org_status" ON "billing_ledger" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_ledger_created" ON "billing_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_billing_ledger_provider_call_id" ON "billing_ledger" USING btree ("provider_call_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_biometric_config_org" ON "biometric_config" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_fraud_org_id" ON "biometric_fraud_alerts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_fraud_voiceprint" ON "biometric_fraud_alerts" USING btree ("voiceprint_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_fraud_alert_type" ON "biometric_fraud_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_fraud_resolved" ON "biometric_fraud_alerts" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_fraud_severity" ON "biometric_fraud_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_rollups_org_id" ON "call_analytics_rollups" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_rollups_period" ON "call_analytics_rollups" USING btree ("org_id","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_rollups_period_start" ON "call_analytics_rollups" USING btree ("org_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_logs_org_id" ON "call_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_logs_created_at" ON "call_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_logs_campaign" ON "call_logs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_logs_country" ON "call_logs" USING btree ("destination_country");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_logs_org_status" ON "call_logs" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_logs_org_agent" ON "call_logs" USING btree ("org_id","agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_logs_org_created" ON "call_logs" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_logs_started_at" ON "call_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_logs_user_id" ON "call_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_topics_call_log" ON "call_topics" USING btree ("call_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_topics_org_id" ON "call_topics" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_call_topics_topic" ON "call_topics" USING btree ("org_id","topic");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_contacts_campaign" ON "campaign_contacts" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_contacts_org" ON "campaign_contacts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_contacts_status" ON "campaign_contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_contacts_phone" ON "campaign_contacts" USING btree ("phone_number_e164");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_campaign_contact_phone" ON "campaign_contacts" USING btree ("campaign_id","phone_number_e164");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaigns_org_status" ON "campaigns" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaigns_country" ON "campaigns" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_canned_responses_org_id" ON "canned_responses" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_canned_responses_category" ON "canned_responses" USING btree ("org_id","category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_case_studies_industry" ON "case_studies" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_case_studies_slug" ON "case_studies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_case_studies_published" ON "case_studies" USING btree ("published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_channel_billing_type" ON "channel_billing_rules" USING btree ("channel_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_channel_billing_active" ON "channel_billing_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_channel_config_org_id" ON "channel_configurations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_channel_config_org_type" ON "channel_configurations" USING btree ("org_id","channel_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_channel_config_status" ON "channel_configurations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_channel_health_org_id" ON "channel_health_log" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_channel_health_org_type" ON "channel_health_log" USING btree ("org_id","channel_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_channel_health_created" ON "channel_health_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_leads_org_id" ON "chat_leads" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_leads_status" ON "chat_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_leads_pipeline" ON "chat_leads" USING btree ("pipeline_stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_leads_created" ON "chat_leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_messages_lead_id" ON "chat_messages" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_messages_conversation_id" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_messages_created" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_coaching_rules_org_id" ON "coaching_rules" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_coaching_rules_type" ON "coaching_rules" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_coaching_rules_active" ON "coaching_rules" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_commission_ledger_partner" ON "commission_ledger" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_commission_ledger_status" ON "commission_ledger" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_commission_ledger_holding" ON "commission_ledger" USING btree ("holding_until");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_connector_interest_org" ON "connector_interest" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_connector_interest_type" ON "connector_interest" USING btree ("connector_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_consent_org_phone" ON "consent_records" USING btree ("org_id","phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cost_events_org_id" ON "cost_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cost_events_call_log_id" ON "cost_events" USING btree ("call_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cost_events_category" ON "cost_events" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cost_events_created_at" ON "cost_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cost_events_org_category" ON "cost_events" USING btree ("org_id","category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_countries_iso_code" ON "countries" USING btree ("iso_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_countries_tier" ON "countries" USING btree ("tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_countries_status" ON "countries" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_compliance_country" ON "country_compliance_profiles" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_holidays_country" ON "country_holidays" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_country_rates_country" ON "country_rate_cards" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_country_rates_model" ON "country_rate_cards" USING btree ("deployment_model");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_country_rate" ON "country_rate_cards" USING btree ("country_id","deployment_model","direction","number_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_data_connectors_org" ON "data_connectors" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_data_connectors_user" ON "data_connectors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_data_connectors_type" ON "data_connectors" USING btree ("connector_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_data_connectors_org_status" ON "data_connectors" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dept_members_dept_id" ON "department_members" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dept_members_user_id" ON "department_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_dept_members_dept_user" ON "department_members" USING btree ("department_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_departments_org_id" ON "departments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_departments_manager_id" ON "departments" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_distribution_ledger_org" ON "distribution_ledger" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_distribution_ledger_status" ON "distribution_ledger" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_distribution_ref" ON "distribution_ledger" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dnc_org_phone" ON "do_not_call_list" USING btree ("org_id","phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drafts_org" ON "drafts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drafts_org_user" ON "drafts" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drafts_type" ON "drafts" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drafts_status" ON "drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drafts_parent" ON "drafts" USING btree ("parent_draft_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_events_email" ON "email_events" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_events_type" ON "email_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_events_created" ON "email_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_email_events_sg_event" ON "email_events" USING btree ("sg_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fin_audit_workspace" ON "fin_audit_log" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fin_audit_entity" ON "fin_audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fin_audit_created" ON "fin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fin_audit_action" ON "fin_audit_log" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bill_ws_number" ON "fin_bills" USING btree ("workspace_id","bill_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "credit_note_ws_number" ON "fin_credit_notes" USING btree ("workspace_id","credit_note_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_ws_number" ON "fin_invoices" USING btree ("workspace_id","invoice_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fin_payments_workspace_id" ON "fin_payments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fin_payments_type" ON "fin_payments" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_human_agents_org_id" ON "human_agents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_human_agents_user_id" ON "human_agents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_human_agents_status" ON "human_agents" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_human_agents_user_org" ON "human_agents" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_industries_slug" ON "industries" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_industries_active" ON "industries" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_industry_templates_industry" ON "industry_templates" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_industry_templates_type" ON "industry_templates" USING btree ("template_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_industry_templates_voice" ON "industry_templates" USING btree ("voice_profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_industry_templates_org" ON "industry_templates" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_industry_templates_active" ON "industry_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invitations_org_id" ON "invitations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invitations_email" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invitations_token" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invitations_status_expires" ON "invitations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_status_created" ON "jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_type_status" ON "jobs" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_knowledge_chunks_doc_id" ON "knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_knowledge_chunks_org_id" ON "knowledge_chunks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_knowledge_docs_org_id" ON "knowledge_documents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lead_activities_lead_id" ON "lead_activities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_msg_templates_org_id" ON "message_templates" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_msg_templates_org_channel" ON "message_templates" USING btree ("org_id","channel_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_msg_templates_approval" ON "message_templates" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_omni_conv_org_id" ON "omnichannel_conversations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_omni_conv_contact_id" ON "omnichannel_conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_omni_conv_status" ON "omnichannel_conversations" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_omni_conv_channel" ON "omnichannel_conversations" USING btree ("org_id","channel_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_omni_conv_assigned_human" ON "omnichannel_conversations" USING btree ("assigned_human_agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_omni_conv_last_message" ON "omnichannel_conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_omni_msg_conversation_id" ON "omnichannel_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_omni_msg_org_id" ON "omnichannel_messages" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_omni_msg_status" ON "omnichannel_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_omni_msg_created_at" ON "omnichannel_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_members_org_id" ON "org_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_members_user_id" ON "org_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_org_members_org_user" ON "org_members" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_partner_agreements_partner" ON "partner_agreements" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_partner_agreements_status" ON "partner_agreements" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_partner_clients_org_id" ON "partner_clients" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_partner_clients_partner_id" ON "partner_clients" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_partner_client_org" ON "partner_clients" USING btree ("partner_id","org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lifecycle_events_partner" ON "partner_lifecycle_events" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lifecycle_events_type" ON "partner_lifecycle_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_partners_org_id" ON "partners" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_partners_status" ON "partners" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_partners_parent" ON "partners" USING btree ("parent_partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pwd_reset_user_id" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pwd_reset_expires_at" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_phone_numbers_country" ON "phone_numbers" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_phone_numbers_org" ON "phone_numbers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_platform_knowledge_category" ON "platform_knowledge_chunks" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_provider_sub_org" ON "provider_sub_accounts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_conversations_session_id" ON "public_conversations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_conversations_channel" ON "public_conversations" USING btree ("channel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_conversations_started_at" ON "public_conversations" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rate_limits_key_bucket_unique" ON "rate_limits" USING btree ("key","bucket");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rate_limits_window_end" ON "rate_limits" USING btree ("window_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rigo_conv_user" ON "rigo_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rigo_conv_created" ON "rigo_conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_follow_up_user" ON "rigo_follow_ups" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_follow_up_due" ON "rigo_follow_ups" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_follow_up_status" ON "rigo_follow_ups" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rigo_note_user" ON "rigo_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rigo_note_org" ON "rigo_notes" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reminder_user" ON "rigo_reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reminder_trigger" ON "rigo_reminders" USING btree ("trigger_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reminder_status" ON "rigo_reminders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_token" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_expires" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_analytics_post" ON "social_analytics" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_analytics_org" ON "social_analytics" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_analytics_platform" ON "social_analytics" USING btree ("platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_analytics_fetched" ON "social_analytics" USING btree ("fetched_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_posts_org" ON "social_posts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_posts_strategy" ON "social_posts" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_posts_status" ON "social_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_posts_scheduled" ON "social_posts" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_strategies_org" ON "social_strategies" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_strategies_user" ON "social_strategies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_strategies_status" ON "social_strategies" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscriptions_org_id" ON "subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supervisor_sessions_org_id" ON "supervisor_sessions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supervisor_sessions_call" ON "supervisor_sessions" USING btree ("call_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supervisor_sessions_user" ON "supervisor_sessions" USING btree ("supervisor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_activity_org_created" ON "team_activity_log" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_activity_user" ON "team_activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_template_versions_template" ON "template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_template_versions_unique" ON "template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tps_phone_hash" ON "tps_check_results" USING btree ("phone_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tps_expires" ON "tps_check_results" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_unified_contacts_org_id" ON "unified_contacts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_unified_contacts_phone" ON "unified_contacts" USING btree ("primary_phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_unified_contacts_email" ON "unified_contacts" USING btree ("primary_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_unified_contacts_org_channel" ON "unified_contacts" USING btree ("org_id","last_channel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usage_records_org_month" ON "usage_records" USING btree ("org_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_usage_records_org_month_user" ON "usage_records" USING btree ("org_id","month","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_attempts_call_log" ON "voice_biometric_attempts" USING btree ("call_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_attempts_voiceprint" ON "voice_biometric_attempts" USING btree ("voiceprint_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_attempts_org_id" ON "voice_biometric_attempts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_attempts_result" ON "voice_biometric_attempts" USING btree ("result");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bio_attempts_created" ON "voice_biometric_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voice_profiles_slug" ON "voice_profiles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voice_profiles_org" ON "voice_profiles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voice_profiles_active" ON "voice_profiles" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voiceprints_org_id" ON "voiceprints" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voiceprints_phone" ON "voiceprints" USING btree ("contact_phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voiceprints_org_phone" ON "voiceprints" USING btree ("org_id","contact_phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_voiceprints_status" ON "voiceprints" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_txn_org_id" ON "wallet_transactions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_txn_created_at" ON "wallet_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_txn_org_type" ON "wallet_transactions" USING btree ("org_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_txn_ref" ON "wallet_transactions" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_txn_org_created" ON "wallet_transactions" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_wallet_txn_idempotency" ON "wallet_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_withdrawal_partner" ON "withdrawal_requests" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_withdrawal_status" ON "withdrawal_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_withdrawal_requested_at" ON "withdrawal_requests" USING btree ("requested_at");