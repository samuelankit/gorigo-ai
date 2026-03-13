--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new._updated_at = now();
  return NEW;
end;
$$;


--
-- Name: set_updated_at_metadata(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_metadata() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return NEW;
end;
$$;




--
-- Name: active_call_billing_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS active_call_billing_state (
    call_control_id text NOT NULL,
    org_id integer NOT NULL,
    rate_per_minute numeric(12,6) NOT NULL,
    start_time text NOT NULL,
    last_billed_secs integer DEFAULT 0,
    low_balance_warned boolean DEFAULT false,
    low_balance_warned_at text,
    terminated boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: affiliate_clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id integer NOT NULL,
    affiliate_id integer NOT NULL,
    ip_address text,
    user_agent text,
    referrer_url text,
    landing_page text,
    converted_to_signup boolean DEFAULT false,
    converted_org_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: affiliate_clicks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS affiliate_clicks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: affiliate_clicks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.affiliate_clicks_id_seq OWNED BY public.affiliate_clicks.id;


--
-- Name: affiliate_commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id integer NOT NULL,
    affiliate_id integer NOT NULL,
    org_id integer NOT NULL,
    wallet_transaction_id integer,
    source_amount numeric(12,2) NOT NULL,
    commission_rate numeric(5,2) NOT NULL,
    commission_amount numeric(12,2) NOT NULL,
    status text DEFAULT 'pending'::text,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    clawback_eligible_until timestamp without time zone,
    clawed_back_at timestamp without time zone,
    clawback_reason text
);


--
-- Name: affiliate_commissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS affiliate_commissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: affiliate_commissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.affiliate_commissions_id_seq OWNED BY public.affiliate_commissions.id;


--
-- Name: affiliate_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id integer NOT NULL,
    affiliate_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'GBP'::text,
    method text DEFAULT 'wallet_credit'::text,
    status text DEFAULT 'pending'::text,
    processed_by integer,
    processed_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: affiliate_payouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS affiliate_payouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: affiliate_payouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.affiliate_payouts_id_seq OWNED BY public.affiliate_payouts.id;


--
-- Name: affiliates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS affiliates (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    owner_type text DEFAULT 'platform'::text NOT NULL,
    owner_id integer,
    user_id integer,
    commission_rate numeric(5,2) DEFAULT '10'::numeric,
    commission_type text DEFAULT 'percentage'::text,
    cookie_duration_days integer DEFAULT 30,
    total_clicks integer DEFAULT 0,
    total_signups integer DEFAULT 0,
    total_earnings numeric(12,2) DEFAULT '0'::numeric,
    pending_payout numeric(12,2) DEFAULT '0'::numeric,
    lifetime_payouts numeric(12,2) DEFAULT '0'::numeric,
    status text DEFAULT 'pending'::text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    org_id integer
);


--
-- Name: affiliates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS affiliates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: affiliates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.affiliates_id_seq OWNED BY public.affiliates.id;


--
-- Name: agent_assist_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS agent_assist_sessions (
    id integer NOT NULL,
    call_log_id integer NOT NULL,
    human_agent_id integer NOT NULL,
    org_id integer NOT NULL,
    started_at timestamp without time zone DEFAULT now(),
    ended_at timestamp without time zone,
    transfer_type text,
    suggestions_shown integer DEFAULT 0,
    suggestions_used integer DEFAULT 0,
    auto_summary text,
    auto_action_items jsonb,
    auto_topics jsonb,
    coaching_alerts_triggered integer DEFAULT 0,
    agent_notes text,
    outcome_rating integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: agent_assist_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS agent_assist_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_assist_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_assist_sessions_id_seq OWNED BY public.agent_assist_sessions.id;


--
-- Name: agent_flows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS agent_flows (
    id integer NOT NULL,
    org_id integer NOT NULL,
    name text DEFAULT 'Default Flow'::text NOT NULL,
    description text,
    nodes jsonb DEFAULT '[]'::jsonb,
    edges jsonb DEFAULT '[]'::jsonb,
    entry_agent_id integer,
    is_active boolean DEFAULT true,
    version integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: agent_flows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS agent_flows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_flows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_flows_id_seq OWNED BY public.agent_flows.id;


--
-- Name: agent_scorecards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS agent_scorecards (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    org_id integer NOT NULL,
    period text NOT NULL,
    period_start timestamp without time zone NOT NULL,
    total_calls integer DEFAULT 0,
    avg_handle_time numeric(10,2),
    avg_quality numeric(5,2),
    avg_sentiment numeric(5,2),
    avg_csat numeric(5,2),
    first_call_resolution numeric(5,2),
    handoff_rate numeric(5,2),
    topics_covered jsonb DEFAULT '[]'::jsonb,
    improvement_areas jsonb,
    overall_score numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: agent_scorecards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS agent_scorecards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_scorecards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_scorecards_id_seq OWNED BY public.agent_scorecards.id;


--
-- Name: agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS agents (
    id integer NOT NULL,
    user_id integer NOT NULL,
    org_id integer NOT NULL,
    name text DEFAULT 'AI Assistant'::text NOT NULL,
    greeting text DEFAULT 'Hello, thank you for calling. How can I help you today?'::text,
    business_description text,
    inbound_enabled boolean DEFAULT true,
    outbound_enabled boolean DEFAULT false,
    roles text DEFAULT 'receptionist'::text,
    faq_entries jsonb DEFAULT '[]'::jsonb,
    handoff_number text,
    handoff_trigger text DEFAULT 'transfer'::text,
    voice_preference text DEFAULT 'professional'::text,
    negotiation_enabled boolean DEFAULT false,
    negotiation_guardrails jsonb,
    compliance_disclosure boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    handoff_enabled boolean DEFAULT true,
    handoff_target_type text DEFAULT 'phone'::text,
    handoff_target_value text,
    handoff_conditions jsonb,
    max_turns integer DEFAULT 10,
    confidence_threshold numeric(5,2) DEFAULT 0.55,
    retention_days_call_logs integer DEFAULT 90,
    retention_days_recordings integer DEFAULT 30,
    agent_type text DEFAULT 'general'::text,
    department_name text,
    display_order integer DEFAULT 0,
    is_router boolean DEFAULT false,
    routing_config jsonb,
    parent_agent_id integer,
    system_prompt text,
    escalation_rules jsonb,
    status text DEFAULT 'active'::text,
    language text DEFAULT 'en-GB'::text NOT NULL,
    voice_name text DEFAULT 'Polly.Amy'::text NOT NULL,
    speech_model text DEFAULT 'default'::text NOT NULL,
    deleted_at timestamp without time zone,
    strict_knowledge_mode boolean DEFAULT false,
    max_tokens_per_call integer DEFAULT 4096,
    max_tokens_per_session integer DEFAULT 16384,
    visibility text DEFAULT 'shared'::text,
    shared_with_departments jsonb DEFAULT '[]'::jsonb,
    max_llm_cost_per_call numeric(10,4) DEFAULT 2.0000
);


--
-- Name: agents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agents_id_seq OWNED BY public.agents.id;


--
-- Name: analytics_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS analytics_alerts (
    id integer NOT NULL,
    org_id integer NOT NULL,
    alert_type text NOT NULL,
    severity text NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false,
    dismissed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: analytics_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS analytics_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analytics_alerts_id_seq OWNED BY public.analytics_alerts.id;


--
-- Name: analytics_daily_rollups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS analytics_daily_rollups (
    id integer NOT NULL,
    org_id integer,
    day date NOT NULL,
    pageviews integer DEFAULT 0 NOT NULL,
    unique_visitors integer DEFAULT 0 NOT NULL,
    unique_sessions integer DEFAULT 0 NOT NULL,
    total_time_on_page integer DEFAULT 0 NOT NULL,
    bounces integer DEFAULT 0 NOT NULL,
    conversions integer DEFAULT 0 NOT NULL,
    top_page character varying(500),
    top_referrer character varying(1000),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: analytics_daily_rollups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS analytics_daily_rollups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_daily_rollups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analytics_daily_rollups_id_seq OWNED BY public.analytics_daily_rollups.id;


--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS analytics_events (
    id integer NOT NULL,
    session_id text NOT NULL,
    visitor_id text NOT NULL,
    org_id integer,
    user_id integer,
    event_type text NOT NULL,
    page text NOT NULL,
    page_title text,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    search_keyword text,
    device_type text NOT NULL,
    browser text,
    os text,
    screen_width integer,
    screen_height integer,
    country text,
    city text,
    region text,
    scroll_depth integer,
    time_on_page integer,
    element_id text,
    element_text text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: analytics_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS analytics_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analytics_events_id_seq OWNED BY public.analytics_events.id;


--
-- Name: analytics_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS analytics_sessions (
    id integer NOT NULL,
    session_id text NOT NULL,
    visitor_id text NOT NULL,
    org_id integer,
    user_id integer,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    ended_at timestamp without time zone,
    duration integer,
    page_count integer DEFAULT 0,
    entry_page text NOT NULL,
    exit_page text,
    referrer text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device_type text NOT NULL,
    browser text,
    os text,
    country text,
    city text,
    is_bounce boolean DEFAULT true,
    is_converted boolean DEFAULT false,
    conversion_page text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: analytics_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS analytics_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analytics_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analytics_sessions_id_seq OWNED BY public.analytics_sessions.id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS api_keys (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    key_prefix text NOT NULL,
    key_hash text NOT NULL,
    last_used_at timestamp without time zone,
    expires_at timestamp without time zone,
    is_revoked boolean DEFAULT false,
    revoked_at timestamp without time zone,
    scopes text[] DEFAULT '{}'::text[],
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: assist_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS assist_suggestions (
    id integer NOT NULL,
    session_id integer NOT NULL,
    source_type text NOT NULL,
    source_id integer,
    content text NOT NULL,
    confidence numeric(5,2),
    status text DEFAULT 'shown'::text,
    modified_content text,
    response_time_ms integer,
    knowledge_doc_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: assist_suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS assist_suggestions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assist_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assist_suggestions_id_seq OWNED BY public.assist_suggestions.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS audit_log (
    id integer NOT NULL,
    actor_id integer,
    actor_email text,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id integer,
    details jsonb,
    ip_address text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: billing_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS billing_ledger (
    id integer NOT NULL,
    org_id integer NOT NULL,
    call_log_id integer,
    provider_call_id text,
    started_at timestamp without time zone,
    connected_at timestamp without time zone,
    ended_at timestamp without time zone,
    billable_seconds integer DEFAULT 0,
    min_charge_seconds integer DEFAULT 30,
    rate_per_minute numeric(10,4) NOT NULL,
    cost numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    provider text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    deployment_model text,
    idempotency_key text,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: billing_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS billing_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_ledger_id_seq OWNED BY public.billing_ledger.id;


--
-- Name: billing_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS billing_plans (
    id integer NOT NULL,
    name text NOT NULL,
    minutes_included integer NOT NULL,
    price_per_month numeric(12,2) NOT NULL,
    overage_per_minute numeric(10,4) NOT NULL
);


--
-- Name: billing_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS billing_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_plans_id_seq OWNED BY public.billing_plans.id;


--
-- Name: biometric_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS biometric_config (
    id integer NOT NULL,
    org_id integer NOT NULL,
    is_enabled boolean DEFAULT false,
    verification_threshold numeric(5,2) DEFAULT 0.75,
    high_security_threshold numeric(5,2) DEFAULT 0.90,
    anti_spoofing_enabled boolean DEFAULT true,
    liveness_detection boolean DEFAULT true,
    replay_detection boolean DEFAULT true,
    synthetic_detection boolean DEFAULT true,
    deepfake_detection boolean DEFAULT true,
    spoofing_action text DEFAULT 'reject_alert'::text,
    continuous_auth_enabled boolean DEFAULT false,
    continuous_auth_interval_seconds integer DEFAULT 300,
    fallback_method text DEFAULT 'security_questions'::text,
    max_enrollment_samples integer DEFAULT 5,
    re_enrollment_prompt_days integer DEFAULT 180,
    cross_account_check_enabled boolean DEFAULT false,
    voice_age_mismatch_alert boolean DEFAULT false,
    provider_name text,
    provider_config jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: biometric_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS biometric_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: biometric_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.biometric_config_id_seq OWNED BY public.biometric_config.id;


--
-- Name: biometric_fraud_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS biometric_fraud_alerts (
    id integer NOT NULL,
    org_id integer NOT NULL,
    voiceprint_id integer,
    alert_type text NOT NULL,
    severity text NOT NULL,
    description text,
    matched_voiceprint_ids jsonb DEFAULT '[]'::jsonb,
    call_log_id integer,
    is_resolved boolean DEFAULT false,
    resolved_by integer,
    resolved_at timestamp without time zone,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: biometric_fraud_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS biometric_fraud_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: biometric_fraud_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.biometric_fraud_alerts_id_seq OWNED BY public.biometric_fraud_alerts.id;


--
-- Name: blog_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS blog_categories (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: blog_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS blog_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blog_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blog_categories_id_seq OWNED BY public.blog_categories.id;


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS blog_posts (
    id integer NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text NOT NULL,
    content text NOT NULL,
    cover_image text,
    category_id integer,
    author text DEFAULT 'GoRigo Team'::text,
    reading_time integer DEFAULT 5,
    published boolean DEFAULT true,
    featured boolean DEFAULT false,
    meta_title text,
    meta_description text,
    faqs text,
    tags text,
    published_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: blog_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS blog_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blog_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blog_posts_id_seq OWNED BY public.blog_posts.id;


--
-- Name: call_analytics_rollups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS call_analytics_rollups (
    id integer NOT NULL,
    org_id integer NOT NULL,
    period text NOT NULL,
    period_start timestamp without time zone NOT NULL,
    total_calls integer DEFAULT 0,
    completed_calls integer DEFAULT 0,
    handoff_calls integer DEFAULT 0,
    avg_duration numeric(10,2),
    avg_sentiment numeric(5,2),
    avg_quality numeric(5,2),
    avg_csat numeric(5,2),
    resolution_rate numeric(5,2),
    top_topics jsonb,
    top_agents jsonb,
    total_cost numeric(12,2),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: call_analytics_rollups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS call_analytics_rollups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_analytics_rollups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_analytics_rollups_id_seq OWNED BY public.call_analytics_rollups.id;


--
-- Name: call_hops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS call_hops (
    id integer NOT NULL,
    call_log_id integer NOT NULL,
    org_id integer NOT NULL,
    from_agent_id integer,
    to_agent_id integer NOT NULL,
    hop_order integer DEFAULT 0 NOT NULL,
    reason text,
    duration_seconds integer DEFAULT 0,
    hop_cost numeric(12,2) DEFAULT '0'::numeric,
    status text DEFAULT 'completed'::text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: call_hops_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS call_hops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_hops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_hops_id_seq OWNED BY public.call_hops.id;


--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS call_logs (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    user_id integer NOT NULL,
    org_id integer NOT NULL,
    direction text NOT NULL,
    caller_number text,
    duration integer DEFAULT 0,
    status text DEFAULT 'completed'::text,
    summary text,
    transcript text,
    lead_captured boolean DEFAULT false,
    lead_name text,
    lead_email text,
    lead_phone text,
    appointment_booked boolean DEFAULT false,
    handoff_triggered boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    provider_call_id text,
    ai_disclosure_played boolean DEFAULT false,
    ai_disclosure_version text,
    current_state text DEFAULT 'GREETING'::text,
    turn_count integer DEFAULT 0,
    last_confidence numeric(5,2),
    handoff_reason text,
    handoff_at timestamp without time zone,
    final_outcome text,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    ended_at timestamp without time zone,
    recording_url text,
    recording_sid text,
    provider_call_sid text,
    call_cost numeric(12,2),
    connected_at timestamp without time zone,
    sentiment_score numeric(5,2),
    sentiment_label text,
    sentiment_history jsonb DEFAULT '[]'::jsonb,
    quality_score numeric(5,2),
    quality_breakdown jsonb,
    csat_prediction numeric(5,2),
    resolution_status text,
    tags jsonb DEFAULT '[]'::jsonb,
    notes text,
    billed_deployment_model text,
    billed_rate_per_minute numeric(12,6),
    campaign_id integer,
    campaign_contact_id integer,
    destination_country text,
    language_used text,
    translated_transcript text,
    translation_confidence numeric(5,2),
    compliance_dnc_checked boolean DEFAULT false,
    compliance_dnc_result text,
    compliance_disclosure_played boolean DEFAULT false,
    compliance_disclosure_at timestamp without time zone,
    compliance_recording_consent text,
    compliance_recording_consent_at timestamp without time zone,
    compliance_opt_out_detected boolean DEFAULT false,
    compliance_opt_out_at timestamp without time zone,
    country_surcharge numeric(10,4),
    total_billed_rate numeric(12,6),
    provider_call_cost numeric(10,4),
    llm_tokens_used integer,
    stt_cost numeric(10,4),
    tts_cost numeric(10,4),
    response_latency_avg integer,
    conversation_messages jsonb DEFAULT '[]'::jsonb
);


--
-- Name: call_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS call_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_logs_id_seq OWNED BY public.call_logs.id;


--
-- Name: call_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS call_topics (
    id integer NOT NULL,
    call_log_id integer NOT NULL,
    org_id integer NOT NULL,
    topic text NOT NULL,
    confidence numeric(5,2),
    sentiment text,
    is_resolved boolean DEFAULT false,
    mentions integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: call_topics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS call_topics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_topics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_topics_id_seq OWNED BY public.call_topics.id;


--
-- Name: campaign_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS campaign_contacts (
    id integer NOT NULL,
    campaign_id integer,
    org_id integer NOT NULL,
    phone_number text NOT NULL,
    phone_number_e164 text NOT NULL,
    country_code text,
    contact_name text,
    contact_email text,
    contact_metadata jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    dnc_checked boolean DEFAULT false,
    dnc_result text,
    dnc_checked_at timestamp without time zone,
    attempt_count integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    last_attempt_at timestamp without time zone,
    next_retry_after timestamp without time zone,
    last_call_disposition text,
    call_log_id integer,
    opted_out boolean DEFAULT false,
    opted_out_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: campaign_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS campaign_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_contacts_id_seq OWNED BY public.campaign_contacts.id;


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS campaigns (
    id integer NOT NULL,
    org_id integer NOT NULL,
    name text NOT NULL,
    description text,
    agent_id integer,
    status text DEFAULT 'draft'::text,
    contact_list jsonb DEFAULT '[]'::jsonb,
    completed_contacts jsonb DEFAULT '[]'::jsonb,
    scheduled_at timestamp without time zone,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    total_contacts integer DEFAULT 0,
    completed_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    call_interval integer DEFAULT 30,
    max_retries integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    campaign_type text DEFAULT 'outbound'::text,
    country_code text,
    language text DEFAULT 'en-GB'::text,
    phone_number_id integer,
    script text,
    script_language text,
    script_version integer DEFAULT 1,
    calling_hours_start text,
    calling_hours_end text,
    calling_timezone text,
    pacing_calls_per_minute integer DEFAULT 5,
    pacing_max_concurrent integer DEFAULT 3,
    pacing_ramp_up_minutes integer DEFAULT 5,
    retry_max_attempts integer DEFAULT 3,
    retry_interval_minutes integer DEFAULT 60,
    retry_window_start text,
    retry_window_end text,
    budget_cap numeric(12,2),
    budget_spent numeric(12,2) DEFAULT '0'::numeric,
    budget_alert_threshold numeric(5,2) DEFAULT '80'::numeric,
    daily_spend_limit numeric(12,2),
    answered_count integer DEFAULT 0,
    converted_count integer DEFAULT 0,
    opt_out_count integer DEFAULT 0,
    conversion_definition text,
    paused_at timestamp without time zone,
    paused_reason text,
    archived_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    source_connector_id integer,
    estimated_cost numeric(12,2),
    locked_amount numeric(12,2),
    cost_cap_reached boolean DEFAULT false,
    approved_at timestamp without time zone,
    approved_by integer,
    consent_confirmed boolean DEFAULT false,
    consent_confirmed_at timestamp without time zone
);


--
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- Name: canned_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS canned_responses (
    id integer NOT NULL,
    org_id integer NOT NULL,
    category text,
    title text NOT NULL,
    content text NOT NULL,
    shortcut text,
    usage_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: canned_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS canned_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: canned_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.canned_responses_id_seq OWNED BY public.canned_responses.id;


--
-- Name: case_studies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS case_studies (
    id integer NOT NULL,
    industry_id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    subtitle text,
    hero_image text,
    challenge text NOT NULL,
    solution text NOT NULL,
    results text NOT NULL,
    testimonial_quote text,
    testimonial_author text,
    testimonial_role text,
    roi_percentage integer,
    cost_reduction integer,
    calls_handled integer,
    customer_satisfaction real,
    key_metrics jsonb DEFAULT '[]'::jsonb,
    meta_title text,
    meta_description text,
    published boolean DEFAULT true,
    featured boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: case_studies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS case_studies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_studies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_studies_id_seq OWNED BY public.case_studies.id;


--
-- Name: channel_billing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS channel_billing_rules (
    id integer NOT NULL,
    channel_type text NOT NULL,
    talk_time_equivalent_minutes numeric(10,4) NOT NULL,
    provider_cost_per_unit numeric(10,4),
    margin_percent numeric(5,2),
    effective_from timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: channel_billing_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS channel_billing_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_billing_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_billing_rules_id_seq OWNED BY public.channel_billing_rules.id;


--
-- Name: channel_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS channel_configurations (
    id integer NOT NULL,
    org_id integer NOT NULL,
    channel_type text NOT NULL,
    is_enabled boolean DEFAULT false,
    credentials jsonb,
    webhook_url text,
    webhook_secret text,
    provider_account_id text,
    settings jsonb,
    rate_limit integer,
    sla_response_seconds integer,
    status text DEFAULT 'inactive'::text,
    last_health_check timestamp without time zone,
    health_status text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: channel_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS channel_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_configurations_id_seq OWNED BY public.channel_configurations.id;


--
-- Name: channel_health_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS channel_health_log (
    id integer NOT NULL,
    org_id integer NOT NULL,
    channel_type text NOT NULL,
    status text NOT NULL,
    check_type text,
    response_time_ms integer,
    error_message text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: channel_health_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS channel_health_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_health_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_health_log_id_seq OWNED BY public.channel_health_log.id;


--
-- Name: chat_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS chat_leads (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    ip_address text,
    status text DEFAULT 'new'::text,
    total_messages integer DEFAULT 0,
    last_message_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    phone text,
    company text,
    company_domain text,
    industry text,
    estimated_size text,
    lead_score integer DEFAULT 0,
    pipeline_stage text DEFAULT 'new'::text,
    assigned_to integer,
    tags text[],
    enriched_at timestamp without time zone,
    enrichment_data jsonb,
    source_channel text DEFAULT 'chatbot'::text,
    last_contacted_at timestamp without time zone,
    org_id integer
);


--
-- Name: chat_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS chat_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_leads_id_seq OWNED BY public.chat_leads.id;


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS chat_messages (
    id integer NOT NULL,
    lead_id integer,
    role text NOT NULL,
    content text NOT NULL,
    rating integer,
    created_at timestamp without time zone DEFAULT now(),
    conversation_id integer
);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: coaching_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS coaching_rules (
    id integer NOT NULL,
    org_id integer NOT NULL,
    name text NOT NULL,
    trigger_type text NOT NULL,
    trigger_condition jsonb NOT NULL,
    coaching_message text NOT NULL,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: coaching_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS coaching_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: coaching_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.coaching_rules_id_seq OWNED BY public.coaching_rules.id;


--
-- Name: commission_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS commission_ledger (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    org_id integer,
    source_type text NOT NULL,
    source_id integer,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    status text DEFAULT 'holding'::text NOT NULL,
    holding_until timestamp without time zone,
    available_at timestamp without time zone,
    withdrawal_id integer,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: commission_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS commission_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commission_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commission_ledger_id_seq OWNED BY public.commission_ledger.id;


--
-- Name: connector_interest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS connector_interest (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    connector_type text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: connector_interest_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS connector_interest_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: connector_interest_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.connector_interest_id_seq OWNED BY public.connector_interest.id;


--
-- Name: consent_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS consent_records (
    id integer NOT NULL,
    org_id integer NOT NULL,
    phone_number text NOT NULL,
    consent_type text NOT NULL,
    consent_given boolean NOT NULL,
    consent_method text,
    consent_text text,
    ip_address text,
    call_log_id integer,
    revoked_at timestamp without time zone,
    revoked_reason text,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: consent_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS consent_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consent_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consent_records_id_seq OWNED BY public.consent_records.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS conversations (
    id integer NOT NULL,
    title text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: cost_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS cost_config (
    id integer NOT NULL,
    category text NOT NULL,
    provider text DEFAULT 'gorigo'::text,
    unit_cost_amount numeric(10,4) NOT NULL,
    unit_type text NOT NULL,
    markup_percent numeric(5,2) DEFAULT '40'::numeric,
    selling_price numeric(12,2),
    is_active boolean DEFAULT true,
    effective_from timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: cost_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS cost_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cost_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cost_config_id_seq OWNED BY public.cost_config.id;


--
-- Name: cost_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS cost_events (
    id integer NOT NULL,
    org_id integer NOT NULL,
    call_log_id integer,
    category text NOT NULL,
    provider text NOT NULL,
    model text,
    input_tokens integer DEFAULT 0,
    output_tokens integer DEFAULT 0,
    unit_quantity numeric(12,4) DEFAULT '0'::numeric,
    unit_type text NOT NULL,
    unit_cost numeric(12,6) NOT NULL,
    total_cost numeric(12,6) NOT NULL,
    revenue_charged numeric(12,2) DEFAULT '0'::numeric,
    margin numeric(12,6) DEFAULT '0'::numeric,
    currency text DEFAULT 'GBP'::text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: cost_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS cost_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cost_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cost_events_id_seq OWNED BY public.cost_events.id;


--
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS countries (
    id integer NOT NULL,
    iso_code text NOT NULL,
    name text NOT NULL,
    calling_code text NOT NULL,
    timezone text NOT NULL,
    currency text NOT NULL,
    tier integer DEFAULT 2 NOT NULL,
    status text DEFAULT 'coming_soon'::text NOT NULL,
    flag_emoji text,
    region text,
    number_formats jsonb,
    requires_kyc boolean DEFAULT false,
    requires_local_presence boolean DEFAULT false,
    sanctioned boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS countries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


--
-- Name: country_compliance_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS country_compliance_profiles (
    id integer NOT NULL,
    country_id integer NOT NULL,
    calling_hours_start text DEFAULT '09:00'::text NOT NULL,
    calling_hours_end text DEFAULT '20:00'::text NOT NULL,
    calling_hours_timezone text NOT NULL,
    restricted_days jsonb DEFAULT '[]'::jsonb,
    dnc_registry_name text,
    dnc_registry_url text,
    dnc_check_method text DEFAULT 'manual'::text,
    dnc_api_endpoint text,
    ai_disclosure_required boolean DEFAULT true,
    ai_disclosure_script text,
    ai_disclosure_language text,
    recording_consent_type text DEFAULT 'one_party'::text NOT NULL,
    recording_consent_script text,
    max_call_attempts_per_day integer DEFAULT 3,
    max_call_attempts_per_week integer DEFAULT 10,
    cooling_off_hours integer DEFAULT 24,
    data_retention_days integer DEFAULT 90,
    data_residency_required boolean DEFAULT false,
    data_residency_region text,
    regulatory_body text,
    regulatory_url text,
    notes text,
    last_reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: country_compliance_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS country_compliance_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: country_compliance_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.country_compliance_profiles_id_seq OWNED BY public.country_compliance_profiles.id;


--
-- Name: country_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS country_holidays (
    id integer NOT NULL,
    country_id integer NOT NULL,
    name text NOT NULL,
    date text NOT NULL,
    is_recurring boolean DEFAULT false,
    no_calling_allowed boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: country_holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS country_holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: country_holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.country_holidays_id_seq OWNED BY public.country_holidays.id;


--
-- Name: country_rate_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS country_rate_cards (
    id integer NOT NULL,
    country_id integer NOT NULL,
    deployment_model text NOT NULL,
    direction text DEFAULT 'outbound'::text NOT NULL,
    number_type text DEFAULT 'mobile'::text NOT NULL,
    surcharge_per_minute numeric(10,4) NOT NULL,
    twilio_estimated_cost numeric(10,4),
    margin_percent numeric(5,2) DEFAULT '20'::numeric,
    is_active boolean DEFAULT true,
    effective_from timestamp without time zone DEFAULT now(),
    effective_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: country_rate_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS country_rate_cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: country_rate_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.country_rate_cards_id_seq OWNED BY public.country_rate_cards.id;


--
-- Name: data_connectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS data_connectors (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    connector_type text NOT NULL,
    name text NOT NULL,
    auth_type text NOT NULL,
    encrypted_credentials text,
    oauth_access_token text,
    oauth_refresh_token text,
    oauth_expires_at timestamp without time zone,
    oauth_scopes text,
    oauth_email text,
    config jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    last_tested_at timestamp without time zone,
    last_error_message text,
    total_lookups integer DEFAULT 0 NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: data_connectors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS data_connectors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_connectors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_connectors_id_seq OWNED BY public.data_connectors.id;


--
-- Name: demo_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS demo_leads (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    company text,
    phone text,
    message text,
    source text DEFAULT 'chatgpt'::text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: demo_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS demo_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: demo_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.demo_leads_id_seq OWNED BY public.demo_leads.id;


--
-- Name: department_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS department_members (
    id integer NOT NULL,
    department_id integer NOT NULL,
    user_id integer NOT NULL,
    department_role text DEFAULT 'AGENT'::text NOT NULL,
    joined_at timestamp without time zone DEFAULT now()
);


--
-- Name: department_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS department_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: department_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.department_members_id_seq OWNED BY public.department_members.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS departments (
    id integer NOT NULL,
    org_id integer NOT NULL,
    name text NOT NULL,
    description text,
    manager_id integer,
    status text DEFAULT 'active'::text NOT NULL,
    color text DEFAULT '#6366f1'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    spending_cap numeric(12,2),
    spent_this_month numeric(12,2) DEFAULT '0'::numeric,
    spending_cap_reset_at timestamp without time zone,
    budget_alert_sent_at timestamp without time zone
);


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: deployment_model_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS deployment_model_changes (
    id integer NOT NULL,
    org_id integer NOT NULL,
    old_model text NOT NULL,
    new_model text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reason text,
    prerequisites_met jsonb,
    active_calls_at_switch integer DEFAULT 0,
    initiated_by integer NOT NULL,
    initiated_by_email text,
    effective_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: deployment_model_changes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS deployment_model_changes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deployment_model_changes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deployment_model_changes_id_seq OWNED BY public.deployment_model_changes.id;


--
-- Name: distribution_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS distribution_ledger (
    id integer NOT NULL,
    org_id integer NOT NULL,
    billing_ledger_id integer,
    wallet_transaction_id integer,
    total_amount numeric(12,2) NOT NULL,
    platform_amount numeric(12,2) NOT NULL,
    partner_amount numeric(12,2) DEFAULT '0'::numeric,
    partner_id integer,
    reseller_amount numeric(12,2) DEFAULT '0'::numeric,
    reseller_id integer,
    affiliate_amount numeric(12,2) DEFAULT '0'::numeric,
    affiliate_id integer,
    channel text DEFAULT 'd2c'::text NOT NULL,
    status text DEFAULT 'completed'::text,
    created_at timestamp without time zone DEFAULT now(),
    reference_id text
);


--
-- Name: distribution_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS distribution_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: distribution_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.distribution_ledger_id_seq OWNED BY public.distribution_ledger.id;


--
-- Name: do_not_call_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS do_not_call_list (
    id integer NOT NULL,
    org_id integer NOT NULL,
    phone_number text NOT NULL,
    reason text,
    source text,
    added_by integer,
    notes text,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: do_not_call_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS do_not_call_list_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: do_not_call_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.do_not_call_list_id_seq OWNED BY public.do_not_call_list.id;


--
-- Name: drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS drafts (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    prompt text,
    status text DEFAULT 'draft'::text NOT NULL,
    tone text DEFAULT 'professional'::text,
    language text DEFAULT 'en'::text,
    version integer DEFAULT 1 NOT NULL,
    parent_draft_id integer,
    quality_score real,
    metadata jsonb,
    published_to_agent_id integer,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    source text DEFAULT 'web'::text
);


--
-- Name: drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS drafts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.drafts_id_seq OWNED BY public.drafts.id;


--
-- Name: email_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS email_events (
    id integer NOT NULL,
    email text NOT NULL,
    event_type text NOT NULL,
    reason text,
    sg_message_id text,
    sg_event_id text,
    bounce_type text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: email_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS email_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_events_id_seq OWNED BY public.email_events.id;


--
-- Name: failed_distributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS failed_distributions (
    id integer NOT NULL,
    org_id integer NOT NULL,
    deduction_amount numeric(12,2) NOT NULL,
    wallet_transaction_id integer,
    description text,
    error_message text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    status text DEFAULT 'pending'::text,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: failed_distributions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS failed_distributions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: failed_distributions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_distributions_id_seq OWNED BY public.failed_distributions.id;


--
-- Name: fin_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_accounts (
    id integer NOT NULL,
    workspace_id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    subtype text,
    description text,
    is_system boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fin_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_accounts_id_seq OWNED BY public.fin_accounts.id;


--
-- Name: fin_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_audit_log (
    id integer NOT NULL,
    workspace_id integer NOT NULL,
    user_id integer,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id integer,
    changes jsonb,
    ip_address text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fin_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_audit_log_id_seq OWNED BY public.fin_audit_log.id;


--
-- Name: fin_bill_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_bill_lines (
    id integer NOT NULL,
    bill_id integer NOT NULL,
    description text NOT NULL,
    quantity numeric(10,4) DEFAULT '1'::numeric,
    unit_price numeric(12,2) DEFAULT '0'::numeric,
    tax_rate numeric(5,2) DEFAULT '0'::numeric,
    amount numeric(12,2) DEFAULT '0'::numeric,
    account_id integer,
    sort_order integer DEFAULT 0
);


--
-- Name: fin_bill_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_bill_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_bill_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_bill_lines_id_seq OWNED BY public.fin_bill_lines.id;


--
-- Name: fin_bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_bills (
    id integer NOT NULL,
    workspace_id integer NOT NULL,
    supplier_id integer NOT NULL,
    bill_number text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    category text,
    issue_date timestamp without time zone DEFAULT now(),
    due_date timestamp without time zone,
    subtotal numeric(12,2) DEFAULT '0'::numeric,
    tax_amount numeric(12,2) DEFAULT '0'::numeric,
    total numeric(12,2) DEFAULT '0'::numeric,
    amount_paid numeric(12,2) DEFAULT '0'::numeric,
    notes text,
    receipt_url text,
    currency text DEFAULT 'GBP'::text,
    journal_entry_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: fin_bills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_bills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_bills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_bills_id_seq OWNED BY public.fin_bills.id;


--
-- Name: fin_credit_note_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_credit_note_lines (
    id integer NOT NULL,
    credit_note_id integer NOT NULL,
    description text NOT NULL,
    quantity numeric(10,4) DEFAULT '1'::numeric,
    unit_price numeric(12,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT '0'::numeric,
    line_total numeric(12,2) NOT NULL,
    account_id integer
);


--
-- Name: fin_credit_note_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_credit_note_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_credit_note_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_credit_note_lines_id_seq OWNED BY public.fin_credit_note_lines.id;


--
-- Name: fin_credit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_credit_notes (
    id integer NOT NULL,
    workspace_id integer NOT NULL,
    invoice_id integer,
    customer_id integer NOT NULL,
    credit_note_number text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    issue_date timestamp without time zone DEFAULT now(),
    reason text,
    subtotal numeric(12,2) DEFAULT '0'::numeric,
    tax_total numeric(12,2) DEFAULT '0'::numeric,
    total numeric(12,2) DEFAULT '0'::numeric,
    amount_applied numeric(12,2) DEFAULT '0'::numeric,
    journal_entry_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fin_credit_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_credit_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_credit_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_credit_notes_id_seq OWNED BY public.fin_credit_notes.id;


--
-- Name: fin_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_customers (
    id integer NOT NULL,
    workspace_id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    tax_id text,
    notes text,
    default_payment_terms integer DEFAULT 30,
    total_invoiced numeric(12,2) DEFAULT '0'::numeric,
    total_paid numeric(12,2) DEFAULT '0'::numeric,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fin_customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_customers_id_seq OWNED BY public.fin_customers.id;


--
-- Name: fin_invoice_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_invoice_lines (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    description text NOT NULL,
    quantity numeric(10,4) DEFAULT '1'::numeric,
    unit_price numeric(12,2) DEFAULT '0'::numeric,
    tax_rate numeric(5,2) DEFAULT '0'::numeric,
    amount numeric(12,2) DEFAULT '0'::numeric,
    account_id integer,
    sort_order integer DEFAULT 0
);


--
-- Name: fin_invoice_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_invoice_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_invoice_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_invoice_lines_id_seq OWNED BY public.fin_invoice_lines.id;


--
-- Name: fin_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_invoices (
    id integer NOT NULL,
    workspace_id integer NOT NULL,
    customer_id integer NOT NULL,
    invoice_number text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    issue_date timestamp without time zone DEFAULT now(),
    due_date timestamp without time zone,
    subtotal numeric(12,2) DEFAULT '0'::numeric,
    tax_amount numeric(12,2) DEFAULT '0'::numeric,
    total numeric(12,2) DEFAULT '0'::numeric,
    amount_paid numeric(12,2) DEFAULT '0'::numeric,
    notes text,
    terms text,
    currency text DEFAULT 'GBP'::text,
    journal_entry_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: fin_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_invoices_id_seq OWNED BY public.fin_invoices.id;


--
-- Name: fin_journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_journal_entries (
    id integer NOT NULL,
    workspace_id integer NOT NULL,
    entry_date timestamp without time zone DEFAULT now(),
    reference text,
    description text,
    source_type text,
    source_id integer,
    is_manual boolean DEFAULT false,
    is_posted boolean DEFAULT false,
    created_by integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fin_journal_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_journal_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_journal_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_journal_entries_id_seq OWNED BY public.fin_journal_entries.id;


--
-- Name: fin_journal_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_journal_lines (
    id integer NOT NULL,
    journal_entry_id integer NOT NULL,
    account_id integer NOT NULL,
    debit numeric(12,2) DEFAULT '0'::numeric,
    credit numeric(12,2) DEFAULT '0'::numeric,
    description text
);


--
-- Name: fin_journal_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_journal_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_journal_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_journal_lines_id_seq OWNED BY public.fin_journal_lines.id;


--
-- Name: fin_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_payments (
    id integer NOT NULL,
    workspace_id integer NOT NULL,
    type text NOT NULL,
    invoice_id integer,
    bill_id integer,
    amount numeric(12,2) NOT NULL,
    payment_date timestamp without time zone DEFAULT now(),
    method text DEFAULT 'bank_transfer'::text,
    reference text,
    notes text,
    account_id integer,
    journal_entry_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fin_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_payments_id_seq OWNED BY public.fin_payments.id;


--
-- Name: fin_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_suppliers (
    id integer NOT NULL,
    workspace_id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    tax_id text,
    notes text,
    default_payment_terms integer DEFAULT 30,
    total_billed numeric(12,2) DEFAULT '0'::numeric,
    total_paid numeric(12,2) DEFAULT '0'::numeric,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fin_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_suppliers_id_seq OWNED BY public.fin_suppliers.id;


--
-- Name: fin_tax_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_tax_codes (
    id integer NOT NULL,
    workspace_id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    rate numeric(5,2) NOT NULL,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true
);


--
-- Name: fin_tax_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_tax_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_tax_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_tax_codes_id_seq OWNED BY public.fin_tax_codes.id;


--
-- Name: fin_workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS fin_workspaces (
    id integer NOT NULL,
    org_id integer NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'company'::text NOT NULL,
    currency text DEFAULT 'GBP'::text,
    fiscal_year_start integer DEFAULT 4,
    vat_registered boolean DEFAULT false,
    vat_number text,
    company_name text,
    company_address text,
    company_email text,
    company_phone text,
    invoice_prefix text DEFAULT 'INV'::text,
    next_invoice_number integer DEFAULT 1001,
    bill_prefix text DEFAULT 'BILL'::text,
    next_bill_number integer DEFAULT 1001,
    credit_note_prefix text DEFAULT 'CN'::text,
    next_credit_note_number integer DEFAULT 1001,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fin_workspaces_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS fin_workspaces_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_workspaces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_workspaces_id_seq OWNED BY public.fin_workspaces.id;


--
-- Name: human_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS human_agents (
    id integer NOT NULL,
    user_id integer NOT NULL,
    org_id integer NOT NULL,
    display_name text NOT NULL,
    status text DEFAULT 'offline'::text,
    skills text[],
    max_concurrent_calls integer DEFAULT 3,
    current_call_count integer DEFAULT 0,
    last_active_at timestamp without time zone,
    shift_start timestamp without time zone,
    shift_end timestamp without time zone,
    total_calls_handled integer DEFAULT 0,
    avg_handle_time numeric(10,2),
    avg_quality numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: human_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS human_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: human_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.human_agents_id_seq OWNED BY public.human_agents.id;


--
-- Name: industries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS industries (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    compliance_notes text,
    regulatory_body text,
    sic_code text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: industries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS industries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: industries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.industries_id_seq OWNED BY public.industries.id;


--
-- Name: industry_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS industry_templates (
    id integer NOT NULL,
    industry_id integer NOT NULL,
    template_type text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    voice_profile_id integer,
    language text DEFAULT 'en-GB'::text,
    tone text DEFAULT 'professional'::text,
    compliance_disclaimer text,
    variables jsonb DEFAULT '[]'::jsonb,
    tags text,
    version integer DEFAULT 1,
    is_system boolean DEFAULT true,
    org_id integer,
    usage_count integer DEFAULT 0,
    rating real,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: industry_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS industry_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: industry_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.industry_templates_id_seq OWNED BY public.industry_templates.id;


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS invitations (
    id integer NOT NULL,
    org_id integer NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    department_id integer,
    org_role text DEFAULT 'AGENT'::text NOT NULL,
    department_role text DEFAULT 'AGENT'::text,
    invited_by_id integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    accepted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invitations_id_seq OWNED BY public.invitations.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS jobs (
    id integer NOT NULL,
    type text NOT NULL,
    payload jsonb,
    run_at timestamp without time zone DEFAULT now(),
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    status text DEFAULT 'pending'::text,
    result jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: knowledge_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id integer NOT NULL,
    document_id integer NOT NULL,
    org_id integer NOT NULL,
    content text NOT NULL,
    embedding public.vector(768),
    chunk_index integer DEFAULT 0,
    token_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: knowledge_chunks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS knowledge_chunks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knowledge_chunks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knowledge_chunks_id_seq OWNED BY public.knowledge_chunks.id;


--
-- Name: knowledge_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS knowledge_documents (
    id integer NOT NULL,
    org_id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    source_type text DEFAULT 'manual'::text,
    source_url text,
    status text DEFAULT 'pending'::text,
    chunk_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: knowledge_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS knowledge_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knowledge_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knowledge_documents_id_seq OWNED BY public.knowledge_documents.id;


--
-- Name: lead_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS lead_activities (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    performed_by integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: lead_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS lead_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lead_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lead_activities_id_seq OWNED BY public.lead_activities.id;


--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS message_templates (
    id integer NOT NULL,
    org_id integer NOT NULL,
    channel_type text NOT NULL,
    name text NOT NULL,
    content text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    language text DEFAULT 'en'::text,
    category text,
    approval_status text DEFAULT 'pending'::text,
    approval_submitted_at timestamp without time zone,
    approved_at timestamp without time zone,
    rejected_reason text,
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: message_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS message_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_templates_id_seq OWNED BY public.message_templates.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    org_id integer,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    action_url text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: omnichannel_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS omnichannel_conversations (
    id integer NOT NULL,
    org_id integer NOT NULL,
    contact_id integer NOT NULL,
    channel_type text NOT NULL,
    external_conversation_id text,
    status text DEFAULT 'active'::text,
    assigned_human_agent_id integer,
    assigned_ai_agent_id integer,
    priority integer DEFAULT 0,
    subject text,
    last_message_at timestamp without time zone,
    last_customer_message_at timestamp without time zone,
    message_count integer DEFAULT 0,
    is_unread boolean DEFAULT true,
    sla_deadline timestamp without time zone,
    sla_breach boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: omnichannel_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS omnichannel_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: omnichannel_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.omnichannel_conversations_id_seq OWNED BY public.omnichannel_conversations.id;


--
-- Name: omnichannel_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS omnichannel_messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    org_id integer NOT NULL,
    direction text NOT NULL,
    sender_type text NOT NULL,
    sender_id integer,
    content text,
    media_type text DEFAULT 'text'::text,
    media_url text,
    media_mime_type text,
    media_size integer,
    channel_message_id text,
    status text DEFAULT 'pending'::text,
    failure_reason text,
    template_id integer,
    is_interactive boolean DEFAULT false,
    interactive_data jsonb,
    delivered_at timestamp without time zone,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: omnichannel_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS omnichannel_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: omnichannel_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.omnichannel_messages_id_seq OWNED BY public.omnichannel_messages.id;


--
-- Name: org_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS org_members (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    role text DEFAULT 'OWNER'::text NOT NULL
);


--
-- Name: org_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS org_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: org_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.org_members_id_seq OWNED BY public.org_members.id;


--
-- Name: orgs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS orgs (
    id integer NOT NULL,
    name text NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    channel_type text DEFAULT 'd2c'::text,
    referred_by_affiliate_id integer,
    max_concurrent_calls integer DEFAULT 5,
    min_call_balance numeric(12,2) DEFAULT 1.00,
    business_hours jsonb,
    voicemail_enabled boolean DEFAULT false,
    voicemail_greeting text,
    deployment_model text DEFAULT 'individual'::text,
    created_at timestamp without time zone DEFAULT now(),
    status text DEFAULT 'active'::text,
    suspended_at timestamp without time zone,
    suspended_reason text,
    updated_at timestamp without time zone DEFAULT now(),
    webhook_secret text
);


--
-- Name: orgs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS orgs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orgs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orgs_id_seq OWNED BY public.orgs.id;


--
-- Name: partner_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS partner_agreements (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    agreement_type text DEFAULT 'standard'::text NOT NULL,
    status text DEFAULT 'active'::text,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    auto_renew boolean DEFAULT true,
    notice_period_days integer DEFAULT 30,
    data_retention_days integer DEFAULT 90,
    commission_clawback_days integer DEFAULT 60,
    minimum_commitment_amount numeric(12,2) DEFAULT '0'::numeric,
    termination_fee numeric(12,2) DEFAULT '0'::numeric,
    non_compete_days integer DEFAULT 0,
    data_export_included boolean DEFAULT true,
    whitelabel_rights text DEFAULT 'co-branded'::text,
    sla_uptime_percent numeric(5,2) DEFAULT 99.5,
    sla_response_time_minutes integer DEFAULT 60,
    custom_terms jsonb,
    signed_by_partner boolean DEFAULT false,
    signed_by_platform boolean DEFAULT false,
    signed_at timestamp without time zone,
    terminated_at timestamp without time zone,
    termination_initiator text,
    termination_notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: partner_agreements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS partner_agreements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partner_agreements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partner_agreements_id_seq OWNED BY public.partner_agreements.id;


--
-- Name: partner_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS partner_clients (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    org_id integer NOT NULL,
    status text DEFAULT 'active'::text,
    retail_rate_per_minute numeric(10,4),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    reassigned_from_partner_id integer,
    reassigned_at timestamp without time zone,
    rate_frozen_until timestamp without time zone,
    previous_rate numeric(10,4),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: partner_clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS partner_clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partner_clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partner_clients_id_seq OWNED BY public.partner_clients.id;


--
-- Name: partner_lifecycle_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS partner_lifecycle_events (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    event_type text NOT NULL,
    from_status text,
    to_status text,
    reason text,
    initiated_by integer,
    affected_clients integer DEFAULT 0,
    affected_resellers integer DEFAULT 0,
    affected_affiliates integer DEFAULT 0,
    cascade_actions jsonb,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: partner_lifecycle_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS partner_lifecycle_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partner_lifecycle_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partner_lifecycle_events_id_seq OWNED BY public.partner_lifecycle_events.id;


--
-- Name: partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS partners (
    id integer NOT NULL,
    name text NOT NULL,
    contact_email text NOT NULL,
    contact_name text,
    branding_logo text,
    branding_primary_color text DEFAULT '#3B82F6'::text,
    branding_company_name text,
    whitelabel_mode text DEFAULT 'co-branded'::text,
    custom_domain text,
    tier text DEFAULT 'BRONZE'::text,
    status text DEFAULT 'active'::text,
    partner_type text DEFAULT 'business_partner'::text,
    wholesale_rate_per_minute numeric(10,4) DEFAULT 0.05,
    reseller_rate_per_minute numeric(10,4) DEFAULT 0.04,
    monthly_platform_fee numeric(12,2) DEFAULT '0'::numeric,
    revenue_share_percent numeric(5,2) DEFAULT '0'::numeric,
    max_clients integer DEFAULT 50,
    max_resellers integer DEFAULT 20,
    features_enabled jsonb DEFAULT '["voice_inbound", "call_logs", "agent_config"]'::jsonb,
    notes text,
    parent_partner_id integer,
    org_id integer,
    can_create_resellers boolean DEFAULT true,
    can_sell_direct boolean DEFAULT true,
    can_create_affiliates boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    suspended_at timestamp without time zone,
    partner_code text,
    mobile_app_enabled boolean DEFAULT false,
    terminated_at timestamp without time zone,
    termination_reason text,
    archived_at timestamp without time zone,
    legal_hold boolean DEFAULT false,
    legal_hold_reason text,
    legal_hold_set_at timestamp without time zone,
    last_activity_at timestamp without time zone,
    last_payment_at timestamp without time zone,
    grace_period_ends_at timestamp without time zone,
    auto_suspend_after_days integer DEFAULT 30,
    health_score integer DEFAULT 100,
    stripe_connect_account_id text,
    stripe_connect_onboarding_complete boolean DEFAULT false,
    bank_account_name text,
    bank_sort_code text,
    bank_account_number text
);


--
-- Name: partners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS partners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partners_id_seq OWNED BY public.partners.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: phone_numbers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS phone_numbers (
    id integer NOT NULL,
    phone_number text NOT NULL,
    friendly_name text,
    org_id integer,
    provider_sid text,
    capabilities jsonb DEFAULT '{"sms": false, "voice": true}'::jsonb,
    is_active boolean DEFAULT true,
    assigned_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    country_code text,
    number_type text DEFAULT 'local'::text,
    sub_account_id integer,
    health_score integer DEFAULT 100,
    answer_rate numeric(5,2),
    total_calls_made integer DEFAULT 0,
    spam_flagged boolean DEFAULT false,
    spam_flagged_at timestamp without time zone,
    last_used_at timestamp without time zone,
    monthly_rental_cost numeric(10,4),
    provisioning_status text DEFAULT 'active'::text,
    regulatory_bundle_sid text,
    campaign_id integer
);


--
-- Name: platform_knowledge_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS platform_knowledge_chunks (
    id integer NOT NULL,
    category text NOT NULL,
    content text NOT NULL,
    embedding public.vector(768),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: platform_knowledge_chunks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS platform_knowledge_chunks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platform_knowledge_chunks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.platform_knowledge_chunks_id_seq OWNED BY public.platform_knowledge_chunks.id;


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS platform_settings (
    id integer NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: platform_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS platform_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platform_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.platform_settings_id_seq OWNED BY public.platform_settings.id;


--
-- Name: provider_sub_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS provider_sub_accounts (
    id integer NOT NULL,
    org_id integer NOT NULL,
    provider_account_id text,
    provider_auth_token text,
    friendly_name text,
    status text DEFAULT 'pending'::text NOT NULL,
    concurrent_call_limit integer DEFAULT 10,
    daily_spend_limit numeric(12,2),
    current_daily_spend numeric(12,2) DEFAULT '0'::numeric,
    last_spend_reset_at timestamp without time zone,
    suspended_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: public_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public_conversations (
    id integer NOT NULL,
    session_id text NOT NULL,
    channel text DEFAULT 'chatbot'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    message_count integer DEFAULT 0 NOT NULL,
    ip_address text,
    user_agent text,
    lead_id integer,
    started_at timestamp without time zone DEFAULT now(),
    ended_at timestamp without time zone,
    duration integer
);


--
-- Name: public_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: public_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.public_conversations_id_seq OWNED BY public.public_conversations.id;


--
-- Name: rate_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS rate_cards (
    id integer NOT NULL,
    deployment_model text NOT NULL,
    category text NOT NULL,
    label text NOT NULL,
    rate_per_minute numeric(10,4) NOT NULL,
    platform_fee_per_minute numeric(10,4) NOT NULL,
    includes_ai_cost boolean DEFAULT true,
    includes_telephony_cost boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: rate_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS rate_cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rate_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rate_cards_id_seq OWNED BY public.rate_cards.id;


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS rate_limits (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    bucket character varying(64) NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    window_start timestamp without time zone DEFAULT now() NOT NULL,
    window_end timestamp without time zone NOT NULL
);


--
-- Name: rate_limits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS rate_limits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rate_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rate_limits_id_seq OWNED BY public.rate_limits.id;


--
-- Name: response_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS response_cache (
    id integer NOT NULL,
    org_id integer NOT NULL,
    query_embedding public.vector(768),
    query_text text NOT NULL,
    response_text text NOT NULL,
    confidence numeric(5,2) DEFAULT '0'::numeric,
    hit_count integer DEFAULT 0,
    last_hit_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone
);


--
-- Name: response_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS response_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: response_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.response_cache_id_seq OWNED BY public.response_cache.id;


--
-- Name: rigo_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS rigo_conversations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    org_id integer,
    role text NOT NULL,
    content text NOT NULL,
    intent text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: rigo_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS rigo_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rigo_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rigo_conversations_id_seq OWNED BY public.rigo_conversations.id;


--
-- Name: rigo_follow_ups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS rigo_follow_ups (
    id integer NOT NULL,
    user_id integer NOT NULL,
    org_id integer,
    contact_name text,
    contact_phone text,
    reason text NOT NULL,
    due_at timestamp without time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    linked_call_id integer,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: rigo_follow_ups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS rigo_follow_ups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rigo_follow_ups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rigo_follow_ups_id_seq OWNED BY public.rigo_follow_ups.id;


--
-- Name: rigo_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS rigo_notes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    org_id integer,
    content text NOT NULL,
    tags text[],
    linked_entity_type text,
    linked_entity_id integer,
    source text DEFAULT 'voice'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: rigo_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS rigo_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rigo_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rigo_notes_id_seq OWNED BY public.rigo_notes.id;


--
-- Name: rigo_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS rigo_reminders (
    id integer NOT NULL,
    user_id integer NOT NULL,
    org_id integer,
    message text NOT NULL,
    trigger_at timestamp without time zone NOT NULL,
    recurrence text,
    status text DEFAULT 'pending'::text NOT NULL,
    delivery_method text DEFAULT 'in_app'::text NOT NULL,
    linked_entity_type text,
    linked_entity_id integer,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: rigo_reminders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS rigo_reminders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rigo_reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rigo_reminders_id_seq OWNED BY public.rigo_reminders.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    ip_address text,
    user_agent text,
    last_seen_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    active_org_id integer,
    rotated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: social_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS social_analytics (
    id integer NOT NULL,
    post_id integer NOT NULL,
    org_id integer NOT NULL,
    platform text NOT NULL,
    reach integer DEFAULT 0,
    impressions integer DEFAULT 0,
    engagement integer DEFAULT 0,
    clicks integer DEFAULT 0,
    shares integer DEFAULT 0,
    comments integer DEFAULT 0,
    likes integer DEFAULT 0,
    followers integer DEFAULT 0,
    fetched_at timestamp without time zone DEFAULT now()
);


--
-- Name: social_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS social_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: social_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.social_analytics_id_seq OWNED BY public.social_analytics.id;


--
-- Name: social_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS social_posts (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    strategy_id integer,
    content text NOT NULL,
    platforms text[] NOT NULL,
    media_urls text[],
    media_thumbnails text[],
    platform_post_ids jsonb,
    scheduled_at timestamp without time zone,
    published_at timestamp without time zone,
    status text DEFAULT 'draft'::text NOT NULL,
    retry_count integer DEFAULT 0,
    last_error text,
    utm_params jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    media_source text
);


--
-- Name: social_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS social_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: social_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.social_posts_id_seq OWNED BY public.social_posts.id;


--
-- Name: social_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS social_strategies (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    business_type text NOT NULL,
    goals text NOT NULL,
    platforms text[] NOT NULL,
    budget text,
    timeframe text,
    tone text DEFAULT 'professional'::text,
    strategy_content jsonb,
    estimated_cost numeric(10,4),
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: social_strategies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS social_strategies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: social_strategies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.social_strategies_id_seq OWNED BY public.social_strategies.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS subscriptions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    org_id integer NOT NULL,
    plan_id integer NOT NULL,
    status text DEFAULT 'active'::text,
    start_date timestamp without time zone DEFAULT now(),
    end_date timestamp without time zone
);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: supervisor_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS supervisor_sessions (
    id integer NOT NULL,
    supervisor_user_id integer NOT NULL,
    call_log_id integer NOT NULL,
    org_id integer NOT NULL,
    mode text NOT NULL,
    started_at timestamp without time zone DEFAULT now(),
    ended_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: supervisor_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS supervisor_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supervisor_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supervisor_sessions_id_seq OWNED BY public.supervisor_sessions.id;


--
-- Name: team_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS team_activity_log (
    id integer NOT NULL,
    org_id integer NOT NULL,
    user_id integer NOT NULL,
    action text NOT NULL,
    entity_type text,
    entity_id integer,
    details jsonb,
    ip_address text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: team_activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS team_activity_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_activity_log_id_seq OWNED BY public.team_activity_log.id;


--
-- Name: template_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS template_versions (
    id integer NOT NULL,
    template_id integer NOT NULL,
    version integer NOT NULL,
    content text NOT NULL,
    changed_by integer,
    change_note text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: template_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS template_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: template_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.template_versions_id_seq OWNED BY public.template_versions.id;


--
-- Name: tps_check_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS tps_check_results (
    id integer NOT NULL,
    phone_hash text NOT NULL,
    phone_prefix text,
    is_registered boolean NOT NULL,
    registry_type text,
    checked_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone,
    source text DEFAULT 'cache'::text
);


--
-- Name: tps_check_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS tps_check_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tps_check_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tps_check_results_id_seq OWNED BY public.tps_check_results.id;


--
-- Name: twilio_phone_numbers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS twilio_phone_numbers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: twilio_phone_numbers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.twilio_phone_numbers_id_seq OWNED BY public.phone_numbers.id;


--
-- Name: twilio_sub_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS twilio_sub_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: twilio_sub_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.twilio_sub_accounts_id_seq OWNED BY public.provider_sub_accounts.id;


--
-- Name: unified_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS unified_contacts (
    id integer NOT NULL,
    org_id integer NOT NULL,
    primary_phone text,
    primary_email text,
    display_name text,
    merged_from_ids jsonb DEFAULT '[]'::jsonb,
    channels jsonb DEFAULT '{}'::jsonb,
    total_interactions integer DEFAULT 0,
    last_interaction_at timestamp without time zone,
    last_channel text,
    tags text[],
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: unified_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS unified_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unified_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unified_contacts_id_seq OWNED BY public.unified_contacts.id;


--
-- Name: usage_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS usage_records (
    id integer NOT NULL,
    user_id integer NOT NULL,
    org_id integer NOT NULL,
    month text NOT NULL,
    minutes_used numeric(10,2) DEFAULT '0'::numeric,
    minute_limit integer DEFAULT 500,
    call_count integer DEFAULT 0,
    leads_captured integer DEFAULT 0,
    spending_cap numeric(12,2)
);


--
-- Name: usage_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS usage_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usage_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usage_records_id_seq OWNED BY public.usage_records.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS users (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    business_name text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone,
    is_demo boolean DEFAULT false,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp without time zone,
    global_role text DEFAULT 'CLIENT'::text,
    email_verified boolean DEFAULT false,
    email_verification_token text,
    email_verification_expires_at timestamp without time zone,
    terms_accepted_at timestamp without time zone,
    terms_version text,
    must_change_password boolean DEFAULT false
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: voice_biometric_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS voice_biometric_attempts (
    id integer NOT NULL,
    call_log_id integer,
    voiceprint_id integer NOT NULL,
    org_id integer NOT NULL,
    result text NOT NULL,
    confidence_score numeric(5,2),
    verification_mode text,
    duration_ms integer,
    spoofing_detected boolean DEFAULT false,
    spoofing_type text DEFAULT 'none'::text,
    spoofing_confidence numeric(5,2),
    fallback_used boolean DEFAULT false,
    fallback_method text,
    provider_response_id text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: voice_biometric_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS voice_biometric_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: voice_biometric_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.voice_biometric_attempts_id_seq OWNED BY public.voice_biometric_attempts.id;


--
-- Name: voice_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS voice_profiles (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text NOT NULL,
    pitch real DEFAULT 1,
    speed real DEFAULT 1,
    warmth real DEFAULT 0.5,
    emphasis real DEFAULT 0.5,
    pause_length real DEFAULT 0.3,
    tts_provider text DEFAULT 'aws_polly'::text,
    tts_voice_id text DEFAULT 'Polly.Amy'::text,
    tts_model_id text,
    sample_audio_url text,
    best_for text,
    is_system boolean DEFAULT true,
    org_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: voice_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS voice_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: voice_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.voice_profiles_id_seq OWNED BY public.voice_profiles.id;


--
-- Name: voiceprints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS voiceprints (
    id integer NOT NULL,
    contact_phone text NOT NULL,
    org_id integer NOT NULL,
    provider_reference_id text,
    enrollment_method text DEFAULT 'in_call'::text,
    enrollment_quality numeric(5,2),
    enrollment_samples integer DEFAULT 0,
    verification_mode text DEFAULT 'passive'::text,
    passphrase_text text,
    status text DEFAULT 'active'::text,
    total_verifications integer DEFAULT 0,
    last_verified_at timestamp without time zone,
    last_updated_at timestamp without time zone,
    adaptive_updates integer DEFAULT 0,
    consent_timestamp timestamp without time zone,
    consent_method text,
    consent_text text,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: voiceprints_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS voiceprints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: voiceprints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.voiceprints_id_seq OWNED BY public.voiceprints.id;


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id integer NOT NULL,
    org_id integer NOT NULL,
    type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    balance_before numeric(12,2) NOT NULL,
    balance_after numeric(12,2) NOT NULL,
    description text,
    reference_type text,
    reference_id text,
    created_at timestamp without time zone DEFAULT now(),
    idempotency_key text
);


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS wallet_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallet_transactions_id_seq OWNED BY public.wallet_transactions.id;


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS wallets (
    id integer NOT NULL,
    org_id integer NOT NULL,
    balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    low_balance_threshold numeric(12,2) DEFAULT '10'::numeric,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    low_balance_email_enabled boolean DEFAULT true,
    last_low_balance_alert_at timestamp without time zone,
    locked_balance numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallets_id_seq OWNED BY public.wallets.id;


--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS webhooks (
    id integer NOT NULL,
    org_id integer NOT NULL,
    url text NOT NULL,
    events text[] DEFAULT '{}'::text[],
    secret text,
    is_active boolean DEFAULT true,
    last_triggered timestamp without time zone,
    failure_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: webhooks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS webhooks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhooks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webhooks_id_seq OWNED BY public.webhooks.id;


--
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    org_id integer,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    stripe_transfer_id text,
    stripe_payout_id text,
    admin_note text,
    rejection_reason text,
    requested_at timestamp without time zone DEFAULT now(),
    reviewed_at timestamp without time zone,
    reviewed_by integer,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS withdrawal_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: withdrawal_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.withdrawal_requests_id_seq OWNED BY public.withdrawal_requests.id;


--
-- Name: affiliate_clicks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliate_clicks ALTER COLUMN id SET DEFAULT nextval('public.affiliate_clicks_id_seq'::regclass);


--
-- Name: affiliate_commissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliate_commissions ALTER COLUMN id SET DEFAULT nextval('public.affiliate_commissions_id_seq'::regclass);


--
-- Name: affiliate_payouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliate_payouts ALTER COLUMN id SET DEFAULT nextval('public.affiliate_payouts_id_seq'::regclass);


--
-- Name: affiliates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliates ALTER COLUMN id SET DEFAULT nextval('public.affiliates_id_seq'::regclass);


--
-- Name: agent_assist_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_assist_sessions ALTER COLUMN id SET DEFAULT nextval('public.agent_assist_sessions_id_seq'::regclass);


--
-- Name: agent_flows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_flows ALTER COLUMN id SET DEFAULT nextval('public.agent_flows_id_seq'::regclass);


--
-- Name: agent_scorecards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_scorecards ALTER COLUMN id SET DEFAULT nextval('public.agent_scorecards_id_seq'::regclass);


--
-- Name: agents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agents ALTER COLUMN id SET DEFAULT nextval('public.agents_id_seq'::regclass);


--
-- Name: analytics_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_alerts ALTER COLUMN id SET DEFAULT nextval('public.analytics_alerts_id_seq'::regclass);


--
-- Name: analytics_daily_rollups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_daily_rollups ALTER COLUMN id SET DEFAULT nextval('public.analytics_daily_rollups_id_seq'::regclass);


--
-- Name: analytics_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_events ALTER COLUMN id SET DEFAULT nextval('public.analytics_events_id_seq'::regclass);


--
-- Name: analytics_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_sessions ALTER COLUMN id SET DEFAULT nextval('public.analytics_sessions_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: assist_suggestions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS assist_suggestions ALTER COLUMN id SET DEFAULT nextval('public.assist_suggestions_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: billing_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS billing_ledger ALTER COLUMN id SET DEFAULT nextval('public.billing_ledger_id_seq'::regclass);


--
-- Name: billing_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS billing_plans ALTER COLUMN id SET DEFAULT nextval('public.billing_plans_id_seq'::regclass);


--
-- Name: biometric_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS biometric_config ALTER COLUMN id SET DEFAULT nextval('public.biometric_config_id_seq'::regclass);


--
-- Name: biometric_fraud_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS biometric_fraud_alerts ALTER COLUMN id SET DEFAULT nextval('public.biometric_fraud_alerts_id_seq'::regclass);


--
-- Name: blog_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS blog_categories ALTER COLUMN id SET DEFAULT nextval('public.blog_categories_id_seq'::regclass);


--
-- Name: blog_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS blog_posts ALTER COLUMN id SET DEFAULT nextval('public.blog_posts_id_seq'::regclass);


--
-- Name: call_analytics_rollups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_analytics_rollups ALTER COLUMN id SET DEFAULT nextval('public.call_analytics_rollups_id_seq'::regclass);


--
-- Name: call_hops id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_hops ALTER COLUMN id SET DEFAULT nextval('public.call_hops_id_seq'::regclass);


--
-- Name: call_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_logs ALTER COLUMN id SET DEFAULT nextval('public.call_logs_id_seq'::regclass);


--
-- Name: call_topics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_topics ALTER COLUMN id SET DEFAULT nextval('public.call_topics_id_seq'::regclass);


--
-- Name: campaign_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS campaign_contacts ALTER COLUMN id SET DEFAULT nextval('public.campaign_contacts_id_seq'::regclass);


--
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- Name: canned_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS canned_responses ALTER COLUMN id SET DEFAULT nextval('public.canned_responses_id_seq'::regclass);


--
-- Name: case_studies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS case_studies ALTER COLUMN id SET DEFAULT nextval('public.case_studies_id_seq'::regclass);


--
-- Name: channel_billing_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS channel_billing_rules ALTER COLUMN id SET DEFAULT nextval('public.channel_billing_rules_id_seq'::regclass);


--
-- Name: channel_configurations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS channel_configurations ALTER COLUMN id SET DEFAULT nextval('public.channel_configurations_id_seq'::regclass);


--
-- Name: channel_health_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS channel_health_log ALTER COLUMN id SET DEFAULT nextval('public.channel_health_log_id_seq'::regclass);


--
-- Name: chat_leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS chat_leads ALTER COLUMN id SET DEFAULT nextval('public.chat_leads_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: coaching_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS coaching_rules ALTER COLUMN id SET DEFAULT nextval('public.coaching_rules_id_seq'::regclass);


--
-- Name: commission_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS commission_ledger ALTER COLUMN id SET DEFAULT nextval('public.commission_ledger_id_seq'::regclass);


--
-- Name: connector_interest id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS connector_interest ALTER COLUMN id SET DEFAULT nextval('public.connector_interest_id_seq'::regclass);


--
-- Name: consent_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS consent_records ALTER COLUMN id SET DEFAULT nextval('public.consent_records_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: cost_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS cost_config ALTER COLUMN id SET DEFAULT nextval('public.cost_config_id_seq'::regclass);


--
-- Name: cost_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS cost_events ALTER COLUMN id SET DEFAULT nextval('public.cost_events_id_seq'::regclass);


--
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


--
-- Name: country_compliance_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS country_compliance_profiles ALTER COLUMN id SET DEFAULT nextval('public.country_compliance_profiles_id_seq'::regclass);


--
-- Name: country_holidays id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS country_holidays ALTER COLUMN id SET DEFAULT nextval('public.country_holidays_id_seq'::regclass);


--
-- Name: country_rate_cards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS country_rate_cards ALTER COLUMN id SET DEFAULT nextval('public.country_rate_cards_id_seq'::regclass);


--
-- Name: data_connectors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS data_connectors ALTER COLUMN id SET DEFAULT nextval('public.data_connectors_id_seq'::regclass);


--
-- Name: demo_leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS demo_leads ALTER COLUMN id SET DEFAULT nextval('public.demo_leads_id_seq'::regclass);


--
-- Name: department_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS department_members ALTER COLUMN id SET DEFAULT nextval('public.department_members_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: deployment_model_changes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS deployment_model_changes ALTER COLUMN id SET DEFAULT nextval('public.deployment_model_changes_id_seq'::regclass);


--
-- Name: distribution_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS distribution_ledger ALTER COLUMN id SET DEFAULT nextval('public.distribution_ledger_id_seq'::regclass);


--
-- Name: do_not_call_list id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS do_not_call_list ALTER COLUMN id SET DEFAULT nextval('public.do_not_call_list_id_seq'::regclass);


--
-- Name: drafts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS drafts ALTER COLUMN id SET DEFAULT nextval('public.drafts_id_seq'::regclass);


--
-- Name: email_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS email_events ALTER COLUMN id SET DEFAULT nextval('public.email_events_id_seq'::regclass);


--
-- Name: failed_distributions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS failed_distributions ALTER COLUMN id SET DEFAULT nextval('public.failed_distributions_id_seq'::regclass);


--
-- Name: fin_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_accounts ALTER COLUMN id SET DEFAULT nextval('public.fin_accounts_id_seq'::regclass);


--
-- Name: fin_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_audit_log ALTER COLUMN id SET DEFAULT nextval('public.fin_audit_log_id_seq'::regclass);


--
-- Name: fin_bill_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_bill_lines ALTER COLUMN id SET DEFAULT nextval('public.fin_bill_lines_id_seq'::regclass);


--
-- Name: fin_bills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_bills ALTER COLUMN id SET DEFAULT nextval('public.fin_bills_id_seq'::regclass);


--
-- Name: fin_credit_note_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_credit_note_lines ALTER COLUMN id SET DEFAULT nextval('public.fin_credit_note_lines_id_seq'::regclass);


--
-- Name: fin_credit_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_credit_notes ALTER COLUMN id SET DEFAULT nextval('public.fin_credit_notes_id_seq'::regclass);


--
-- Name: fin_customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_customers ALTER COLUMN id SET DEFAULT nextval('public.fin_customers_id_seq'::regclass);


--
-- Name: fin_invoice_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_invoice_lines ALTER COLUMN id SET DEFAULT nextval('public.fin_invoice_lines_id_seq'::regclass);


--
-- Name: fin_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_invoices ALTER COLUMN id SET DEFAULT nextval('public.fin_invoices_id_seq'::regclass);


--
-- Name: fin_journal_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_journal_entries ALTER COLUMN id SET DEFAULT nextval('public.fin_journal_entries_id_seq'::regclass);


--
-- Name: fin_journal_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_journal_lines ALTER COLUMN id SET DEFAULT nextval('public.fin_journal_lines_id_seq'::regclass);


--
-- Name: fin_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_payments ALTER COLUMN id SET DEFAULT nextval('public.fin_payments_id_seq'::regclass);


--
-- Name: fin_suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_suppliers ALTER COLUMN id SET DEFAULT nextval('public.fin_suppliers_id_seq'::regclass);


--
-- Name: fin_tax_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_tax_codes ALTER COLUMN id SET DEFAULT nextval('public.fin_tax_codes_id_seq'::regclass);


--
-- Name: fin_workspaces id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_workspaces ALTER COLUMN id SET DEFAULT nextval('public.fin_workspaces_id_seq'::regclass);


--
-- Name: human_agents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS human_agents ALTER COLUMN id SET DEFAULT nextval('public.human_agents_id_seq'::regclass);


--
-- Name: industries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS industries ALTER COLUMN id SET DEFAULT nextval('public.industries_id_seq'::regclass);


--
-- Name: industry_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS industry_templates ALTER COLUMN id SET DEFAULT nextval('public.industry_templates_id_seq'::regclass);


--
-- Name: invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS invitations ALTER COLUMN id SET DEFAULT nextval('public.invitations_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: knowledge_chunks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS knowledge_chunks ALTER COLUMN id SET DEFAULT nextval('public.knowledge_chunks_id_seq'::regclass);


--
-- Name: knowledge_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS knowledge_documents ALTER COLUMN id SET DEFAULT nextval('public.knowledge_documents_id_seq'::regclass);


--
-- Name: lead_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS lead_activities ALTER COLUMN id SET DEFAULT nextval('public.lead_activities_id_seq'::regclass);


--
-- Name: message_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS message_templates ALTER COLUMN id SET DEFAULT nextval('public.message_templates_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: omnichannel_conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS omnichannel_conversations ALTER COLUMN id SET DEFAULT nextval('public.omnichannel_conversations_id_seq'::regclass);


--
-- Name: omnichannel_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS omnichannel_messages ALTER COLUMN id SET DEFAULT nextval('public.omnichannel_messages_id_seq'::regclass);


--
-- Name: org_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS org_members ALTER COLUMN id SET DEFAULT nextval('public.org_members_id_seq'::regclass);


--
-- Name: orgs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS orgs ALTER COLUMN id SET DEFAULT nextval('public.orgs_id_seq'::regclass);


--
-- Name: partner_agreements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partner_agreements ALTER COLUMN id SET DEFAULT nextval('public.partner_agreements_id_seq'::regclass);


--
-- Name: partner_clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partner_clients ALTER COLUMN id SET DEFAULT nextval('public.partner_clients_id_seq'::regclass);


--
-- Name: partner_lifecycle_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partner_lifecycle_events ALTER COLUMN id SET DEFAULT nextval('public.partner_lifecycle_events_id_seq'::regclass);


--
-- Name: partners id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partners ALTER COLUMN id SET DEFAULT nextval('public.partners_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: phone_numbers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS phone_numbers ALTER COLUMN id SET DEFAULT nextval('public.twilio_phone_numbers_id_seq'::regclass);


--
-- Name: platform_knowledge_chunks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS platform_knowledge_chunks ALTER COLUMN id SET DEFAULT nextval('public.platform_knowledge_chunks_id_seq'::regclass);


--
-- Name: platform_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS platform_settings ALTER COLUMN id SET DEFAULT nextval('public.platform_settings_id_seq'::regclass);


--
-- Name: provider_sub_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS provider_sub_accounts ALTER COLUMN id SET DEFAULT nextval('public.twilio_sub_accounts_id_seq'::regclass);


--
-- Name: public_conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS public_conversations ALTER COLUMN id SET DEFAULT nextval('public.public_conversations_id_seq'::regclass);


--
-- Name: rate_cards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rate_cards ALTER COLUMN id SET DEFAULT nextval('public.rate_cards_id_seq'::regclass);


--
-- Name: rate_limits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rate_limits ALTER COLUMN id SET DEFAULT nextval('public.rate_limits_id_seq'::regclass);


--
-- Name: response_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS response_cache ALTER COLUMN id SET DEFAULT nextval('public.response_cache_id_seq'::regclass);


--
-- Name: rigo_conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_conversations ALTER COLUMN id SET DEFAULT nextval('public.rigo_conversations_id_seq'::regclass);


--
-- Name: rigo_follow_ups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_follow_ups ALTER COLUMN id SET DEFAULT nextval('public.rigo_follow_ups_id_seq'::regclass);


--
-- Name: rigo_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_notes ALTER COLUMN id SET DEFAULT nextval('public.rigo_notes_id_seq'::regclass);


--
-- Name: rigo_reminders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_reminders ALTER COLUMN id SET DEFAULT nextval('public.rigo_reminders_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: social_analytics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_analytics ALTER COLUMN id SET DEFAULT nextval('public.social_analytics_id_seq'::regclass);


--
-- Name: social_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_posts ALTER COLUMN id SET DEFAULT nextval('public.social_posts_id_seq'::regclass);


--
-- Name: social_strategies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_strategies ALTER COLUMN id SET DEFAULT nextval('public.social_strategies_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: supervisor_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS supervisor_sessions ALTER COLUMN id SET DEFAULT nextval('public.supervisor_sessions_id_seq'::regclass);


--
-- Name: team_activity_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS team_activity_log ALTER COLUMN id SET DEFAULT nextval('public.team_activity_log_id_seq'::regclass);


--
-- Name: template_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS template_versions ALTER COLUMN id SET DEFAULT nextval('public.template_versions_id_seq'::regclass);


--
-- Name: tps_check_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS tps_check_results ALTER COLUMN id SET DEFAULT nextval('public.tps_check_results_id_seq'::regclass);


--
-- Name: unified_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS unified_contacts ALTER COLUMN id SET DEFAULT nextval('public.unified_contacts_id_seq'::regclass);


--
-- Name: usage_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS usage_records ALTER COLUMN id SET DEFAULT nextval('public.usage_records_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: voice_biometric_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voice_biometric_attempts ALTER COLUMN id SET DEFAULT nextval('public.voice_biometric_attempts_id_seq'::regclass);


--
-- Name: voice_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voice_profiles ALTER COLUMN id SET DEFAULT nextval('public.voice_profiles_id_seq'::regclass);


--
-- Name: voiceprints id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voiceprints ALTER COLUMN id SET DEFAULT nextval('public.voiceprints_id_seq'::regclass);


--
-- Name: wallet_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS wallet_transactions ALTER COLUMN id SET DEFAULT nextval('public.wallet_transactions_id_seq'::regclass);


--
-- Name: wallets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);


--
-- Name: webhooks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS webhooks ALTER COLUMN id SET DEFAULT nextval('public.webhooks_id_seq'::regclass);


--
-- Name: withdrawal_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS withdrawal_requests ALTER COLUMN id SET DEFAULT nextval('public.withdrawal_requests_id_seq'::regclass);


--
-- Name: active_call_billing_state active_call_billing_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS active_call_billing_state
    ADD CONSTRAINT active_call_billing_state_pkey PRIMARY KEY (call_control_id);


--
-- Name: affiliate_clicks affiliate_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_pkey PRIMARY KEY (id);


--
-- Name: affiliate_commissions affiliate_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliate_commissions
    ADD CONSTRAINT affiliate_commissions_pkey PRIMARY KEY (id);


--
-- Name: affiliate_payouts affiliate_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliate_payouts
    ADD CONSTRAINT affiliate_payouts_pkey PRIMARY KEY (id);


--
-- Name: affiliates affiliates_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliates
    ADD CONSTRAINT affiliates_code_unique UNIQUE (code);


--
-- Name: affiliates affiliates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliates
    ADD CONSTRAINT affiliates_pkey PRIMARY KEY (id);


--
-- Name: agent_assist_sessions agent_assist_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_assist_sessions
    ADD CONSTRAINT agent_assist_sessions_pkey PRIMARY KEY (id);


--
-- Name: agent_flows agent_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_flows
    ADD CONSTRAINT agent_flows_pkey PRIMARY KEY (id);


--
-- Name: agent_scorecards agent_scorecards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_scorecards
    ADD CONSTRAINT agent_scorecards_pkey PRIMARY KEY (id);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: analytics_alerts analytics_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_alerts
    ADD CONSTRAINT analytics_alerts_pkey PRIMARY KEY (id);


--
-- Name: analytics_daily_rollups analytics_daily_rollups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_daily_rollups
    ADD CONSTRAINT analytics_daily_rollups_pkey PRIMARY KEY (id);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: analytics_sessions analytics_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_sessions
    ADD CONSTRAINT analytics_sessions_pkey PRIMARY KEY (id);


--
-- Name: analytics_sessions analytics_sessions_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_sessions
    ADD CONSTRAINT analytics_sessions_session_id_unique UNIQUE (session_id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: assist_suggestions assist_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS assist_suggestions
    ADD CONSTRAINT assist_suggestions_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: billing_ledger billing_ledger_call_log_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS billing_ledger
    ADD CONSTRAINT billing_ledger_call_log_id_unique UNIQUE (call_log_id);


--
-- Name: billing_ledger billing_ledger_idempotency_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS billing_ledger
    ADD CONSTRAINT billing_ledger_idempotency_key_unique UNIQUE (idempotency_key);


--
-- Name: billing_ledger billing_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS billing_ledger
    ADD CONSTRAINT billing_ledger_pkey PRIMARY KEY (id);


--
-- Name: billing_plans billing_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS billing_plans
    ADD CONSTRAINT billing_plans_pkey PRIMARY KEY (id);


--
-- Name: biometric_config biometric_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS biometric_config
    ADD CONSTRAINT biometric_config_pkey PRIMARY KEY (id);


--
-- Name: biometric_fraud_alerts biometric_fraud_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS biometric_fraud_alerts
    ADD CONSTRAINT biometric_fraud_alerts_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS blog_categories
    ADD CONSTRAINT blog_categories_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS blog_categories
    ADD CONSTRAINT blog_categories_slug_unique UNIQUE (slug);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS blog_posts
    ADD CONSTRAINT blog_posts_slug_unique UNIQUE (slug);


--
-- Name: call_analytics_rollups call_analytics_rollups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_analytics_rollups
    ADD CONSTRAINT call_analytics_rollups_pkey PRIMARY KEY (id);


--
-- Name: call_hops call_hops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_hops
    ADD CONSTRAINT call_hops_pkey PRIMARY KEY (id);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: call_logs call_logs_provider_call_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_logs
    ADD CONSTRAINT call_logs_provider_call_id_unique UNIQUE (provider_call_id);


--
-- Name: call_topics call_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_topics
    ADD CONSTRAINT call_topics_pkey PRIMARY KEY (id);


--
-- Name: campaign_contacts campaign_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS campaign_contacts
    ADD CONSTRAINT campaign_contacts_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: canned_responses canned_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS canned_responses
    ADD CONSTRAINT canned_responses_pkey PRIMARY KEY (id);


--
-- Name: case_studies case_studies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS case_studies
    ADD CONSTRAINT case_studies_pkey PRIMARY KEY (id);


--
-- Name: case_studies case_studies_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS case_studies
    ADD CONSTRAINT case_studies_slug_unique UNIQUE (slug);


--
-- Name: channel_billing_rules channel_billing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS channel_billing_rules
    ADD CONSTRAINT channel_billing_rules_pkey PRIMARY KEY (id);


--
-- Name: channel_configurations channel_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS channel_configurations
    ADD CONSTRAINT channel_configurations_pkey PRIMARY KEY (id);


--
-- Name: channel_health_log channel_health_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS channel_health_log
    ADD CONSTRAINT channel_health_log_pkey PRIMARY KEY (id);


--
-- Name: chat_leads chat_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS chat_leads
    ADD CONSTRAINT chat_leads_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: coaching_rules coaching_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS coaching_rules
    ADD CONSTRAINT coaching_rules_pkey PRIMARY KEY (id);


--
-- Name: commission_ledger commission_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS commission_ledger
    ADD CONSTRAINT commission_ledger_pkey PRIMARY KEY (id);


--
-- Name: connector_interest connector_interest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS connector_interest
    ADD CONSTRAINT connector_interest_pkey PRIMARY KEY (id);


--
-- Name: consent_records consent_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS consent_records
    ADD CONSTRAINT consent_records_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: cost_config cost_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS cost_config
    ADD CONSTRAINT cost_config_pkey PRIMARY KEY (id);


--
-- Name: cost_events cost_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS cost_events
    ADD CONSTRAINT cost_events_pkey PRIMARY KEY (id);


--
-- Name: countries countries_iso_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS countries
    ADD CONSTRAINT countries_iso_code_unique UNIQUE (iso_code);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: country_compliance_profiles country_compliance_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS country_compliance_profiles
    ADD CONSTRAINT country_compliance_profiles_pkey PRIMARY KEY (id);


--
-- Name: country_holidays country_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS country_holidays
    ADD CONSTRAINT country_holidays_pkey PRIMARY KEY (id);


--
-- Name: country_rate_cards country_rate_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS country_rate_cards
    ADD CONSTRAINT country_rate_cards_pkey PRIMARY KEY (id);


--
-- Name: data_connectors data_connectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS data_connectors
    ADD CONSTRAINT data_connectors_pkey PRIMARY KEY (id);


--
-- Name: demo_leads demo_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS demo_leads
    ADD CONSTRAINT demo_leads_pkey PRIMARY KEY (id);


--
-- Name: department_members department_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS department_members
    ADD CONSTRAINT department_members_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: deployment_model_changes deployment_model_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS deployment_model_changes
    ADD CONSTRAINT deployment_model_changes_pkey PRIMARY KEY (id);


--
-- Name: distribution_ledger distribution_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS distribution_ledger
    ADD CONSTRAINT distribution_ledger_pkey PRIMARY KEY (id);


--
-- Name: do_not_call_list do_not_call_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS do_not_call_list
    ADD CONSTRAINT do_not_call_list_pkey PRIMARY KEY (id);


--
-- Name: drafts drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS drafts
    ADD CONSTRAINT drafts_pkey PRIMARY KEY (id);


--
-- Name: email_events email_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS email_events
    ADD CONSTRAINT email_events_pkey PRIMARY KEY (id);


--
-- Name: failed_distributions failed_distributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS failed_distributions
    ADD CONSTRAINT failed_distributions_pkey PRIMARY KEY (id);


--
-- Name: fin_accounts fin_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_accounts
    ADD CONSTRAINT fin_accounts_pkey PRIMARY KEY (id);


--
-- Name: fin_audit_log fin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_audit_log
    ADD CONSTRAINT fin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: fin_bill_lines fin_bill_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_bill_lines
    ADD CONSTRAINT fin_bill_lines_pkey PRIMARY KEY (id);


--
-- Name: fin_bills fin_bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_bills
    ADD CONSTRAINT fin_bills_pkey PRIMARY KEY (id);


--
-- Name: fin_credit_note_lines fin_credit_note_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_credit_note_lines
    ADD CONSTRAINT fin_credit_note_lines_pkey PRIMARY KEY (id);


--
-- Name: fin_credit_notes fin_credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_credit_notes
    ADD CONSTRAINT fin_credit_notes_pkey PRIMARY KEY (id);


--
-- Name: fin_customers fin_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_customers
    ADD CONSTRAINT fin_customers_pkey PRIMARY KEY (id);


--
-- Name: fin_invoice_lines fin_invoice_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_invoice_lines
    ADD CONSTRAINT fin_invoice_lines_pkey PRIMARY KEY (id);


--
-- Name: fin_invoices fin_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_invoices
    ADD CONSTRAINT fin_invoices_pkey PRIMARY KEY (id);


--
-- Name: fin_journal_entries fin_journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_journal_entries
    ADD CONSTRAINT fin_journal_entries_pkey PRIMARY KEY (id);


--
-- Name: fin_journal_lines fin_journal_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_journal_lines
    ADD CONSTRAINT fin_journal_lines_pkey PRIMARY KEY (id);


--
-- Name: fin_payments fin_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_payments
    ADD CONSTRAINT fin_payments_pkey PRIMARY KEY (id);


--
-- Name: fin_suppliers fin_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_suppliers
    ADD CONSTRAINT fin_suppliers_pkey PRIMARY KEY (id);


--
-- Name: fin_tax_codes fin_tax_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_tax_codes
    ADD CONSTRAINT fin_tax_codes_pkey PRIMARY KEY (id);


--
-- Name: fin_workspaces fin_workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_workspaces
    ADD CONSTRAINT fin_workspaces_pkey PRIMARY KEY (id);


--
-- Name: human_agents human_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS human_agents
    ADD CONSTRAINT human_agents_pkey PRIMARY KEY (id);


--
-- Name: industries industries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS industries
    ADD CONSTRAINT industries_pkey PRIMARY KEY (id);


--
-- Name: industries industries_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS industries
    ADD CONSTRAINT industries_slug_unique UNIQUE (slug);


--
-- Name: industry_templates industry_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS industry_templates
    ADD CONSTRAINT industry_templates_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS invitations
    ADD CONSTRAINT invitations_token_unique UNIQUE (token);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: knowledge_chunks knowledge_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_pkey PRIMARY KEY (id);


--
-- Name: knowledge_documents knowledge_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS knowledge_documents
    ADD CONSTRAINT knowledge_documents_pkey PRIMARY KEY (id);


--
-- Name: lead_activities lead_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: omnichannel_conversations omnichannel_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS omnichannel_conversations
    ADD CONSTRAINT omnichannel_conversations_pkey PRIMARY KEY (id);


--
-- Name: omnichannel_messages omnichannel_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS omnichannel_messages
    ADD CONSTRAINT omnichannel_messages_pkey PRIMARY KEY (id);


--
-- Name: org_members org_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS org_members
    ADD CONSTRAINT org_members_pkey PRIMARY KEY (id);


--
-- Name: orgs orgs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS orgs
    ADD CONSTRAINT orgs_pkey PRIMARY KEY (id);


--
-- Name: partner_agreements partner_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partner_agreements
    ADD CONSTRAINT partner_agreements_pkey PRIMARY KEY (id);


--
-- Name: partner_clients partner_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partner_clients
    ADD CONSTRAINT partner_clients_pkey PRIMARY KEY (id);


--
-- Name: partner_lifecycle_events partner_lifecycle_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partner_lifecycle_events
    ADD CONSTRAINT partner_lifecycle_events_pkey PRIMARY KEY (id);


--
-- Name: partners partners_partner_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partners
    ADD CONSTRAINT partners_partner_code_unique UNIQUE (partner_code);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_unique UNIQUE (token);


--
-- Name: phone_numbers phone_numbers_phone_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS phone_numbers
    ADD CONSTRAINT phone_numbers_phone_number_unique UNIQUE (phone_number);


--
-- Name: platform_knowledge_chunks platform_knowledge_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS platform_knowledge_chunks
    ADD CONSTRAINT platform_knowledge_chunks_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS platform_settings
    ADD CONSTRAINT platform_settings_key_unique UNIQUE (key);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: provider_sub_accounts provider_sub_accounts_org_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS provider_sub_accounts
    ADD CONSTRAINT provider_sub_accounts_org_id_unique UNIQUE (org_id);


--
-- Name: provider_sub_accounts provider_sub_accounts_provider_account_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS provider_sub_accounts
    ADD CONSTRAINT provider_sub_accounts_provider_account_id_unique UNIQUE (provider_account_id);


--
-- Name: public_conversations public_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS public_conversations
    ADD CONSTRAINT public_conversations_pkey PRIMARY KEY (id);


--
-- Name: public_conversations public_conversations_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS public_conversations
    ADD CONSTRAINT public_conversations_session_id_unique UNIQUE (session_id);


--
-- Name: rate_cards rate_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rate_cards
    ADD CONSTRAINT rate_cards_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: response_cache response_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS response_cache
    ADD CONSTRAINT response_cache_pkey PRIMARY KEY (id);


--
-- Name: rigo_conversations rigo_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_conversations
    ADD CONSTRAINT rigo_conversations_pkey PRIMARY KEY (id);


--
-- Name: rigo_follow_ups rigo_follow_ups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_follow_ups
    ADD CONSTRAINT rigo_follow_ups_pkey PRIMARY KEY (id);


--
-- Name: rigo_notes rigo_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_notes
    ADD CONSTRAINT rigo_notes_pkey PRIMARY KEY (id);


--
-- Name: rigo_reminders rigo_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_reminders
    ADD CONSTRAINT rigo_reminders_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS sessions
    ADD CONSTRAINT sessions_token_unique UNIQUE (token);


--
-- Name: social_analytics social_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_analytics
    ADD CONSTRAINT social_analytics_pkey PRIMARY KEY (id);


--
-- Name: social_posts social_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_posts
    ADD CONSTRAINT social_posts_pkey PRIMARY KEY (id);


--
-- Name: social_strategies social_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_strategies
    ADD CONSTRAINT social_strategies_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: supervisor_sessions supervisor_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS supervisor_sessions
    ADD CONSTRAINT supervisor_sessions_pkey PRIMARY KEY (id);


--
-- Name: team_activity_log team_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS team_activity_log
    ADD CONSTRAINT team_activity_log_pkey PRIMARY KEY (id);


--
-- Name: template_versions template_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS template_versions
    ADD CONSTRAINT template_versions_pkey PRIMARY KEY (id);


--
-- Name: tps_check_results tps_check_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS tps_check_results
    ADD CONSTRAINT tps_check_results_pkey PRIMARY KEY (id);


--
-- Name: phone_numbers twilio_phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS phone_numbers
    ADD CONSTRAINT twilio_phone_numbers_pkey PRIMARY KEY (id);


--
-- Name: provider_sub_accounts twilio_sub_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS provider_sub_accounts
    ADD CONSTRAINT twilio_sub_accounts_pkey PRIMARY KEY (id);


--
-- Name: unified_contacts unified_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS unified_contacts
    ADD CONSTRAINT unified_contacts_pkey PRIMARY KEY (id);


--
-- Name: usage_records usage_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS usage_records
    ADD CONSTRAINT usage_records_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: voice_biometric_attempts voice_biometric_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voice_biometric_attempts
    ADD CONSTRAINT voice_biometric_attempts_pkey PRIMARY KEY (id);


--
-- Name: voice_profiles voice_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voice_profiles
    ADD CONSTRAINT voice_profiles_pkey PRIMARY KEY (id);


--
-- Name: voice_profiles voice_profiles_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voice_profiles
    ADD CONSTRAINT voice_profiles_slug_unique UNIQUE (slug);


--
-- Name: voiceprints voiceprints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voiceprints
    ADD CONSTRAINT voiceprints_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_org_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS wallets
    ADD CONSTRAINT wallets_org_id_unique UNIQUE (org_id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: bill_ws_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS bill_ws_number ON public.fin_bills USING btree (workspace_id, bill_number);


--
-- Name: credit_note_ws_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS credit_note_ws_number ON public.fin_credit_notes USING btree (workspace_id, credit_note_number);


--
-- Name: idx_active_billing_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_active_billing_org ON public.active_call_billing_state USING btree (org_id);


--
-- Name: idx_active_billing_terminated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_active_billing_terminated ON public.active_call_billing_state USING btree (terminated);


--
-- Name: idx_aff_commission_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_aff_commission_org ON public.affiliate_commissions USING btree (org_id);


--
-- Name: idx_aff_commission_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_aff_commission_status ON public.affiliate_commissions USING btree (status);


--
-- Name: idx_affiliate_clicks_affiliate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_id ON public.affiliate_clicks USING btree (affiliate_id);


--
-- Name: idx_affiliates_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_affiliates_org ON public.affiliates USING btree (org_id);


--
-- Name: idx_affiliates_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_affiliates_owner ON public.affiliates USING btree (owner_type, owner_id);


--
-- Name: idx_affiliates_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_affiliates_status ON public.affiliates USING btree (status);


--
-- Name: idx_agent_flows_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_agent_flows_org_id ON public.agent_flows USING btree (org_id);


--
-- Name: idx_agents_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_agents_org_id ON public.agents USING btree (org_id);


--
-- Name: idx_agents_org_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_agents_org_status ON public.agents USING btree (org_id, status);


--
-- Name: idx_agents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents USING btree (user_id);


--
-- Name: idx_analytics_alerts_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_alerts_created ON public.analytics_alerts USING btree (created_at);


--
-- Name: idx_analytics_alerts_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_alerts_org_id ON public.analytics_alerts USING btree (org_id);


--
-- Name: idx_analytics_alerts_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_alerts_read ON public.analytics_alerts USING btree (org_id, is_read);


--
-- Name: idx_analytics_alerts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_alerts_type ON public.analytics_alerts USING btree (alert_type);


--
-- Name: idx_analytics_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events USING btree (created_at);


--
-- Name: idx_analytics_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events USING btree (event_type);


--
-- Name: idx_analytics_events_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_events_org_id ON public.analytics_events USING btree (org_id);


--
-- Name: idx_analytics_events_page; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_events_page ON public.analytics_events USING btree (page);


--
-- Name: idx_analytics_events_page_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_events_page_event_type ON public.analytics_events USING btree (page, event_type);


--
-- Name: idx_analytics_events_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events USING btree (session_id);


--
-- Name: idx_analytics_events_visitor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON public.analytics_events USING btree (visitor_id);


--
-- Name: idx_analytics_sessions_is_bounce; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_is_bounce ON public.analytics_sessions USING btree (is_bounce);


--
-- Name: idx_analytics_sessions_is_converted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_is_converted ON public.analytics_sessions USING btree (is_converted);


--
-- Name: idx_analytics_sessions_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_org_id ON public.analytics_sessions USING btree (org_id);


--
-- Name: idx_analytics_sessions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON public.analytics_sessions USING btree (session_id);


--
-- Name: idx_analytics_sessions_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON public.analytics_sessions USING btree (started_at);


--
-- Name: idx_analytics_sessions_visitor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor_id ON public.analytics_sessions USING btree (visitor_id);


--
-- Name: idx_api_keys_key_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_api_keys_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON public.api_keys USING btree (org_id);


--
-- Name: idx_assist_sessions_call_log; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_assist_sessions_call_log ON public.agent_assist_sessions USING btree (call_log_id);


--
-- Name: idx_assist_sessions_human_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_assist_sessions_human_agent ON public.agent_assist_sessions USING btree (human_agent_id);


--
-- Name: idx_assist_sessions_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_assist_sessions_org_id ON public.agent_assist_sessions USING btree (org_id);


--
-- Name: idx_assist_sessions_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_assist_sessions_started ON public.agent_assist_sessions USING btree (started_at);


--
-- Name: idx_assist_suggestions_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_assist_suggestions_session ON public.assist_suggestions USING btree (session_id);


--
-- Name: idx_assist_suggestions_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_assist_suggestions_source ON public.assist_suggestions USING btree (source_type);


--
-- Name: idx_assist_suggestions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_assist_suggestions_status ON public.assist_suggestions USING btree (status);


--
-- Name: idx_audit_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log USING btree (action);


--
-- Name: idx_audit_log_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log USING btree (actor_id);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log USING btree (created_at);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_billing_ledger_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_billing_ledger_created ON public.billing_ledger USING btree (created_at);


--
-- Name: idx_billing_ledger_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_billing_ledger_org_id ON public.billing_ledger USING btree (org_id);


--
-- Name: idx_billing_ledger_org_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_billing_ledger_org_status ON public.billing_ledger USING btree (org_id, status);


--
-- Name: idx_billing_ledger_provider_call_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_billing_ledger_provider_call_id ON public.billing_ledger USING btree (provider_call_id);


--
-- Name: idx_bio_attempts_call_log; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bio_attempts_call_log ON public.voice_biometric_attempts USING btree (call_log_id);


--
-- Name: idx_bio_attempts_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bio_attempts_created ON public.voice_biometric_attempts USING btree (created_at);


--
-- Name: idx_bio_attempts_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bio_attempts_org_id ON public.voice_biometric_attempts USING btree (org_id);


--
-- Name: idx_bio_attempts_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bio_attempts_result ON public.voice_biometric_attempts USING btree (result);


--
-- Name: idx_bio_attempts_voiceprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bio_attempts_voiceprint ON public.voice_biometric_attempts USING btree (voiceprint_id);


--
-- Name: idx_bio_fraud_alert_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bio_fraud_alert_type ON public.biometric_fraud_alerts USING btree (alert_type);


--
-- Name: idx_bio_fraud_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bio_fraud_org_id ON public.biometric_fraud_alerts USING btree (org_id);


--
-- Name: idx_bio_fraud_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bio_fraud_resolved ON public.biometric_fraud_alerts USING btree (is_resolved);


--
-- Name: idx_bio_fraud_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bio_fraud_severity ON public.biometric_fraud_alerts USING btree (severity);


--
-- Name: idx_bio_fraud_voiceprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bio_fraud_voiceprint ON public.biometric_fraud_alerts USING btree (voiceprint_id);


--
-- Name: idx_call_logs_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_logs_campaign ON public.call_logs USING btree (campaign_id);


--
-- Name: idx_call_logs_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_logs_country ON public.call_logs USING btree (destination_country);


--
-- Name: idx_call_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON public.call_logs USING btree (created_at);


--
-- Name: idx_call_logs_org_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_logs_org_agent ON public.call_logs USING btree (org_id, agent_id);


--
-- Name: idx_call_logs_org_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_logs_org_created ON public.call_logs USING btree (org_id, created_at);


--
-- Name: idx_call_logs_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_logs_org_id ON public.call_logs USING btree (org_id);


--
-- Name: idx_call_logs_org_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_logs_org_status ON public.call_logs USING btree (org_id, status);


--
-- Name: idx_call_logs_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON public.call_logs USING btree (started_at);


--
-- Name: idx_call_logs_transcript_fts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_logs_transcript_fts ON public.call_logs USING gin (to_tsvector('english'::regconfig, COALESCE(transcript, ''::text)));


--
-- Name: idx_call_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON public.call_logs USING btree (user_id);


--
-- Name: idx_call_rollups_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_rollups_org_id ON public.call_analytics_rollups USING btree (org_id);


--
-- Name: idx_call_rollups_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_rollups_period ON public.call_analytics_rollups USING btree (org_id, period);


--
-- Name: idx_call_rollups_period_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_rollups_period_start ON public.call_analytics_rollups USING btree (org_id, period_start);


--
-- Name: idx_call_topics_call_log; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_topics_call_log ON public.call_topics USING btree (call_log_id);


--
-- Name: idx_call_topics_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_topics_org_id ON public.call_topics USING btree (org_id);


--
-- Name: idx_call_topics_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_call_topics_topic ON public.call_topics USING btree (org_id, topic);


--
-- Name: idx_campaign_contacts_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign ON public.campaign_contacts USING btree (campaign_id);


--
-- Name: idx_campaign_contacts_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_org ON public.campaign_contacts USING btree (org_id);


--
-- Name: idx_campaign_contacts_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_phone ON public.campaign_contacts USING btree (phone_number_e164);


--
-- Name: idx_campaign_contacts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_campaign_contacts_status ON public.campaign_contacts USING btree (status);


--
-- Name: idx_campaigns_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_campaigns_country ON public.campaigns USING btree (country_code);


--
-- Name: idx_campaigns_org_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_campaigns_org_status ON public.campaigns USING btree (org_id, status);


--
-- Name: idx_canned_responses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_canned_responses_category ON public.canned_responses USING btree (org_id, category);


--
-- Name: idx_canned_responses_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_canned_responses_org_id ON public.canned_responses USING btree (org_id);


--
-- Name: idx_case_studies_industry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_case_studies_industry ON public.case_studies USING btree (industry_id);


--
-- Name: idx_case_studies_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_case_studies_published ON public.case_studies USING btree (published);


--
-- Name: idx_case_studies_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_case_studies_slug ON public.case_studies USING btree (slug);


--
-- Name: idx_channel_billing_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_channel_billing_active ON public.channel_billing_rules USING btree (is_active);


--
-- Name: idx_channel_billing_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_channel_billing_type ON public.channel_billing_rules USING btree (channel_type);


--
-- Name: idx_channel_config_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_channel_config_org_id ON public.channel_configurations USING btree (org_id);


--
-- Name: idx_channel_config_org_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_channel_config_org_type ON public.channel_configurations USING btree (org_id, channel_type);


--
-- Name: idx_channel_config_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_channel_config_status ON public.channel_configurations USING btree (status);


--
-- Name: idx_channel_health_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_channel_health_created ON public.channel_health_log USING btree (created_at);


--
-- Name: idx_channel_health_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_channel_health_org_id ON public.channel_health_log USING btree (org_id);


--
-- Name: idx_channel_health_org_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_channel_health_org_type ON public.channel_health_log USING btree (org_id, channel_type);


--
-- Name: idx_chat_leads_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_leads_created ON public.chat_leads USING btree (created_at);


--
-- Name: idx_chat_leads_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_leads_org_id ON public.chat_leads USING btree (org_id);


--
-- Name: idx_chat_leads_pipeline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_leads_pipeline ON public.chat_leads USING btree (pipeline_stage);


--
-- Name: idx_chat_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_leads_status ON public.chat_leads USING btree (status);


--
-- Name: idx_chat_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id);


--
-- Name: idx_chat_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages USING btree (created_at);


--
-- Name: idx_chat_messages_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_messages_lead_id ON public.chat_messages USING btree (lead_id);


--
-- Name: idx_coaching_rules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coaching_rules_active ON public.coaching_rules USING btree (org_id, is_active);


--
-- Name: idx_coaching_rules_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coaching_rules_org_id ON public.coaching_rules USING btree (org_id);


--
-- Name: idx_coaching_rules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coaching_rules_type ON public.coaching_rules USING btree (trigger_type);


--
-- Name: idx_commission_ledger_holding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_commission_ledger_holding ON public.commission_ledger USING btree (holding_until);


--
-- Name: idx_commission_ledger_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_commission_ledger_partner ON public.commission_ledger USING btree (partner_id);


--
-- Name: idx_commission_ledger_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_commission_ledger_status ON public.commission_ledger USING btree (status);


--
-- Name: idx_connector_interest_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_connector_interest_org ON public.connector_interest USING btree (org_id);


--
-- Name: idx_connector_interest_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_connector_interest_type ON public.connector_interest USING btree (connector_type);


--
-- Name: idx_consent_org_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_consent_org_phone ON public.consent_records USING btree (org_id, phone_number);


--
-- Name: idx_cost_events_call_log_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cost_events_call_log_id ON public.cost_events USING btree (call_log_id);


--
-- Name: idx_cost_events_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cost_events_category ON public.cost_events USING btree (category);


--
-- Name: idx_cost_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cost_events_created_at ON public.cost_events USING btree (created_at);


--
-- Name: idx_cost_events_org_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cost_events_org_category ON public.cost_events USING btree (org_id, category);


--
-- Name: idx_cost_events_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cost_events_org_id ON public.cost_events USING btree (org_id);


--
-- Name: idx_countries_iso_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_countries_iso_code ON public.countries USING btree (iso_code);


--
-- Name: idx_countries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_countries_status ON public.countries USING btree (status);


--
-- Name: idx_countries_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_countries_tier ON public.countries USING btree (tier);


--
-- Name: idx_country_rates_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_country_rates_country ON public.country_rate_cards USING btree (country_id);


--
-- Name: idx_country_rates_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_country_rates_model ON public.country_rate_cards USING btree (deployment_model);


--
-- Name: idx_data_connectors_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_data_connectors_org ON public.data_connectors USING btree (org_id);


--
-- Name: idx_data_connectors_org_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_data_connectors_org_status ON public.data_connectors USING btree (org_id, status);


--
-- Name: idx_data_connectors_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_data_connectors_type ON public.data_connectors USING btree (connector_type);


--
-- Name: idx_data_connectors_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_data_connectors_user ON public.data_connectors USING btree (user_id);


--
-- Name: idx_departments_manager_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON public.departments USING btree (manager_id);


--
-- Name: idx_departments_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_departments_org_id ON public.departments USING btree (org_id);


--
-- Name: idx_dept_members_dept_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_dept_members_dept_id ON public.department_members USING btree (department_id);


--
-- Name: idx_dept_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_dept_members_user_id ON public.department_members USING btree (user_id);


--
-- Name: idx_distribution_ledger_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_distribution_ledger_org ON public.distribution_ledger USING btree (org_id);


--
-- Name: idx_distribution_ledger_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_distribution_ledger_status ON public.distribution_ledger USING btree (status);


--
-- Name: idx_dnc_org_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_dnc_org_phone ON public.do_not_call_list USING btree (org_id, phone_number);


--
-- Name: idx_drafts_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_drafts_org ON public.drafts USING btree (org_id);


--
-- Name: idx_drafts_org_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_drafts_org_user ON public.drafts USING btree (org_id, user_id);


--
-- Name: idx_drafts_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_drafts_parent ON public.drafts USING btree (parent_draft_id);


--
-- Name: idx_drafts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_drafts_status ON public.drafts USING btree (status);


--
-- Name: idx_drafts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_drafts_type ON public.drafts USING btree (type);


--
-- Name: idx_email_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_email_events_created ON public.email_events USING btree (created_at);


--
-- Name: idx_email_events_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_email_events_email ON public.email_events USING btree (email);


--
-- Name: idx_email_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_email_events_type ON public.email_events USING btree (event_type);


--
-- Name: idx_fin_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_fin_audit_action ON public.fin_audit_log USING btree (action);


--
-- Name: idx_fin_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_fin_audit_created ON public.fin_audit_log USING btree (created_at);


--
-- Name: idx_fin_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_fin_audit_entity ON public.fin_audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_fin_audit_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_fin_audit_workspace ON public.fin_audit_log USING btree (workspace_id);


--
-- Name: idx_fin_payments_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_fin_payments_type ON public.fin_payments USING btree (type);


--
-- Name: idx_fin_payments_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_fin_payments_workspace_id ON public.fin_payments USING btree (workspace_id);


--
-- Name: idx_follow_up_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_follow_up_due ON public.rigo_follow_ups USING btree (due_at);


--
-- Name: idx_follow_up_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_follow_up_status ON public.rigo_follow_ups USING btree (status);


--
-- Name: idx_follow_up_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_follow_up_user ON public.rigo_follow_ups USING btree (user_id);


--
-- Name: idx_holidays_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_holidays_country ON public.country_holidays USING btree (country_id);


--
-- Name: idx_human_agents_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_human_agents_org_id ON public.human_agents USING btree (org_id);


--
-- Name: idx_human_agents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_human_agents_status ON public.human_agents USING btree (org_id, status);


--
-- Name: idx_human_agents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_human_agents_user_id ON public.human_agents USING btree (user_id);


--
-- Name: idx_industries_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_industries_active ON public.industries USING btree (is_active);


--
-- Name: idx_industries_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_industries_slug ON public.industries USING btree (slug);


--
-- Name: idx_industry_templates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_industry_templates_active ON public.industry_templates USING btree (is_active);


--
-- Name: idx_industry_templates_industry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_industry_templates_industry ON public.industry_templates USING btree (industry_id);


--
-- Name: idx_industry_templates_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_industry_templates_org ON public.industry_templates USING btree (org_id);


--
-- Name: idx_industry_templates_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_industry_templates_type ON public.industry_templates USING btree (template_type);


--
-- Name: idx_industry_templates_voice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_industry_templates_voice ON public.industry_templates USING btree (voice_profile_id);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations USING btree (email);


--
-- Name: idx_invitations_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON public.invitations USING btree (org_id);


--
-- Name: idx_invitations_status_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invitations_status_expires ON public.invitations USING btree (status, expires_at);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations USING btree (token);


--
-- Name: idx_jobs_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON public.jobs USING btree (status, created_at);


--
-- Name: idx_jobs_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON public.jobs USING btree (type, status);


--
-- Name: idx_knowledge_chunks_doc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc_id ON public.knowledge_chunks USING btree (document_id);


--
-- Name: idx_knowledge_chunks_embedding_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw ON public.knowledge_chunks USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_knowledge_chunks_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_org_id ON public.knowledge_chunks USING btree (org_id);


--
-- Name: idx_knowledge_docs_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_knowledge_docs_org_id ON public.knowledge_documents USING btree (org_id);


--
-- Name: idx_lead_activities_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities USING btree (lead_id);


--
-- Name: idx_lifecycle_events_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_partner ON public.partner_lifecycle_events USING btree (partner_id);


--
-- Name: idx_lifecycle_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_type ON public.partner_lifecycle_events USING btree (event_type);


--
-- Name: idx_msg_templates_approval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_msg_templates_approval ON public.message_templates USING btree (approval_status);


--
-- Name: idx_msg_templates_org_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_msg_templates_org_channel ON public.message_templates USING btree (org_id, channel_type);


--
-- Name: idx_msg_templates_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_msg_templates_org_id ON public.message_templates USING btree (org_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_omni_conv_assigned_human; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_omni_conv_assigned_human ON public.omnichannel_conversations USING btree (assigned_human_agent_id);


--
-- Name: idx_omni_conv_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_omni_conv_channel ON public.omnichannel_conversations USING btree (org_id, channel_type);


--
-- Name: idx_omni_conv_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_omni_conv_contact_id ON public.omnichannel_conversations USING btree (contact_id);


--
-- Name: idx_omni_conv_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_omni_conv_last_message ON public.omnichannel_conversations USING btree (last_message_at);


--
-- Name: idx_omni_conv_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_omni_conv_org_id ON public.omnichannel_conversations USING btree (org_id);


--
-- Name: idx_omni_conv_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_omni_conv_status ON public.omnichannel_conversations USING btree (org_id, status);


--
-- Name: idx_omni_msg_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_omni_msg_conversation_id ON public.omnichannel_messages USING btree (conversation_id);


--
-- Name: idx_omni_msg_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_omni_msg_created_at ON public.omnichannel_messages USING btree (created_at);


--
-- Name: idx_omni_msg_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_omni_msg_org_id ON public.omnichannel_messages USING btree (org_id);


--
-- Name: idx_omni_msg_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_omni_msg_status ON public.omnichannel_messages USING btree (status);


--
-- Name: idx_org_members_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members USING btree (org_id);


--
-- Name: idx_org_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members USING btree (user_id);


--
-- Name: idx_partner_agreements_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_partner_agreements_partner ON public.partner_agreements USING btree (partner_id);


--
-- Name: idx_partner_agreements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_partner_agreements_status ON public.partner_agreements USING btree (status);


--
-- Name: idx_partner_clients_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_partner_clients_org_id ON public.partner_clients USING btree (org_id);


--
-- Name: idx_partner_clients_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_partner_clients_partner_id ON public.partner_clients USING btree (partner_id);


--
-- Name: idx_partners_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_partners_org_id ON public.partners USING btree (org_id);


--
-- Name: idx_partners_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_partners_parent ON public.partners USING btree (parent_partner_id);


--
-- Name: idx_partners_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners USING btree (status);


--
-- Name: idx_phone_numbers_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_phone_numbers_country ON public.phone_numbers USING btree (country_code);


--
-- Name: idx_phone_numbers_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_phone_numbers_org ON public.phone_numbers USING btree (org_id);


--
-- Name: idx_platform_knowledge_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_platform_knowledge_category ON public.platform_knowledge_chunks USING btree (category);


--
-- Name: idx_platform_knowledge_embedding_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_platform_knowledge_embedding_hnsw ON public.platform_knowledge_chunks USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_provider_sub_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_provider_sub_org ON public.provider_sub_accounts USING btree (org_id);


--
-- Name: idx_public_conversations_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_public_conversations_channel ON public.public_conversations USING btree (channel);


--
-- Name: idx_public_conversations_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_public_conversations_session_id ON public.public_conversations USING btree (session_id);


--
-- Name: idx_public_conversations_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_public_conversations_started_at ON public.public_conversations USING btree (started_at);


--
-- Name: idx_pwd_reset_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pwd_reset_expires_at ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_pwd_reset_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pwd_reset_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_rate_limits_key_bucket_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_key_bucket_unique ON public.rate_limits USING btree (key, bucket);


--
-- Name: idx_rate_limits_window_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON public.rate_limits USING btree (window_end);


--
-- Name: idx_reminder_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminder_status ON public.rigo_reminders USING btree (status);


--
-- Name: idx_reminder_trigger; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminder_trigger ON public.rigo_reminders USING btree (trigger_at);


--
-- Name: idx_reminder_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminder_user ON public.rigo_reminders USING btree (user_id);


--
-- Name: idx_response_cache_embedding_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_response_cache_embedding_hnsw ON public.response_cache USING hnsw (query_embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_rigo_conv_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rigo_conv_created ON public.rigo_conversations USING btree (created_at);


--
-- Name: idx_rigo_conv_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rigo_conv_user ON public.rigo_conversations USING btree (user_id);


--
-- Name: idx_rigo_note_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rigo_note_org ON public.rigo_notes USING btree (org_id);


--
-- Name: idx_rigo_note_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rigo_note_user ON public.rigo_notes USING btree (user_id);


--
-- Name: idx_scorecards_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scorecards_agent_id ON public.agent_scorecards USING btree (agent_id);


--
-- Name: idx_scorecards_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scorecards_org_id ON public.agent_scorecards USING btree (org_id);


--
-- Name: idx_scorecards_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scorecards_period ON public.agent_scorecards USING btree (org_id, period);


--
-- Name: idx_scorecards_period_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scorecards_period_start ON public.agent_scorecards USING btree (agent_id, period_start);


--
-- Name: idx_sessions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions USING btree (token);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_social_analytics_fetched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_social_analytics_fetched ON public.social_analytics USING btree (fetched_at);


--
-- Name: idx_social_analytics_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_social_analytics_org ON public.social_analytics USING btree (org_id);


--
-- Name: idx_social_analytics_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_social_analytics_platform ON public.social_analytics USING btree (platform);


--
-- Name: idx_social_analytics_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_social_analytics_post ON public.social_analytics USING btree (post_id);


--
-- Name: idx_social_posts_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_social_posts_org ON public.social_posts USING btree (org_id);


--
-- Name: idx_social_posts_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON public.social_posts USING btree (scheduled_at);


--
-- Name: idx_social_posts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts USING btree (status);


--
-- Name: idx_social_posts_strategy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_social_posts_strategy ON public.social_posts USING btree (strategy_id);


--
-- Name: idx_social_strategies_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_social_strategies_org ON public.social_strategies USING btree (org_id);


--
-- Name: idx_social_strategies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_social_strategies_status ON public.social_strategies USING btree (status);


--
-- Name: idx_social_strategies_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_social_strategies_user ON public.social_strategies USING btree (user_id);


--
-- Name: idx_subscriptions_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions USING btree (org_id);


--
-- Name: idx_supervisor_sessions_call; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supervisor_sessions_call ON public.supervisor_sessions USING btree (call_log_id);


--
-- Name: idx_supervisor_sessions_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supervisor_sessions_org_id ON public.supervisor_sessions USING btree (org_id);


--
-- Name: idx_supervisor_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_supervisor_sessions_user ON public.supervisor_sessions USING btree (supervisor_user_id);


--
-- Name: idx_team_activity_org_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_team_activity_org_created ON public.team_activity_log USING btree (org_id, created_at);


--
-- Name: idx_team_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_team_activity_user ON public.team_activity_log USING btree (user_id);


--
-- Name: idx_template_versions_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_template_versions_template ON public.template_versions USING btree (template_id);


--
-- Name: idx_template_versions_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_versions_unique ON public.template_versions USING btree (template_id, version);


--
-- Name: idx_tps_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tps_expires ON public.tps_check_results USING btree (expires_at);


--
-- Name: idx_unified_contacts_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_unified_contacts_email ON public.unified_contacts USING btree (primary_email);


--
-- Name: idx_unified_contacts_org_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_unified_contacts_org_channel ON public.unified_contacts USING btree (org_id, last_channel);


--
-- Name: idx_unified_contacts_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_unified_contacts_org_id ON public.unified_contacts USING btree (org_id);


--
-- Name: idx_unified_contacts_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_unified_contacts_phone ON public.unified_contacts USING btree (primary_phone);


--
-- Name: idx_usage_records_org_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_usage_records_org_month ON public.usage_records USING btree (org_id, month);


--
-- Name: idx_voice_profiles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_voice_profiles_active ON public.voice_profiles USING btree (is_active);


--
-- Name: idx_voice_profiles_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_voice_profiles_org ON public.voice_profiles USING btree (org_id);


--
-- Name: idx_voice_profiles_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_voice_profiles_slug ON public.voice_profiles USING btree (slug);


--
-- Name: idx_voiceprints_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_voiceprints_org_id ON public.voiceprints USING btree (org_id);


--
-- Name: idx_voiceprints_org_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_voiceprints_org_phone ON public.voiceprints USING btree (org_id, contact_phone);


--
-- Name: idx_voiceprints_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_voiceprints_phone ON public.voiceprints USING btree (contact_phone);


--
-- Name: idx_voiceprints_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_voiceprints_status ON public.voiceprints USING btree (status);


--
-- Name: idx_wallet_txn_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_txn_created_at ON public.wallet_transactions USING btree (created_at);


--
-- Name: idx_wallet_txn_org_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_txn_org_created ON public.wallet_transactions USING btree (org_id, created_at);


--
-- Name: idx_wallet_txn_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_txn_org_id ON public.wallet_transactions USING btree (org_id);


--
-- Name: idx_wallet_txn_org_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_txn_org_type ON public.wallet_transactions USING btree (org_id, type);


--
-- Name: idx_wallet_txn_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_txn_ref ON public.wallet_transactions USING btree (reference_type, reference_id);


--
-- Name: idx_withdrawal_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_withdrawal_partner ON public.withdrawal_requests USING btree (partner_id);


--
-- Name: idx_withdrawal_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_withdrawal_requested_at ON public.withdrawal_requests USING btree (requested_at);


--
-- Name: idx_withdrawal_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON public.withdrawal_requests USING btree (status);


--
-- Name: invoice_ws_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS invoice_ws_number ON public.fin_invoices USING btree (workspace_id, invoice_number);


--
-- Name: uq_aff_commission_txn; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_aff_commission_txn ON public.affiliate_commissions USING btree (wallet_transaction_id, affiliate_id);


--
-- Name: uq_biometric_config_org; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_biometric_config_org ON public.biometric_config USING btree (org_id);


--
-- Name: uq_campaign_contact_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_contact_phone ON public.campaign_contacts USING btree (campaign_id, phone_number_e164);


--
-- Name: uq_compliance_country; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_compliance_country ON public.country_compliance_profiles USING btree (country_id);


--
-- Name: uq_country_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_country_rate ON public.country_rate_cards USING btree (country_id, deployment_model, direction, number_type);


--
-- Name: uq_dept_members_dept_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_dept_members_dept_user ON public.department_members USING btree (department_id, user_id);


--
-- Name: uq_distribution_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_distribution_ref ON public.distribution_ledger USING btree (reference_id);


--
-- Name: uq_email_events_sg_event; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_events_sg_event ON public.email_events USING btree (sg_event_id);


--
-- Name: uq_human_agents_user_org; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_human_agents_user_org ON public.human_agents USING btree (user_id, org_id);


--
-- Name: uq_org_members_org_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_members_org_user ON public.org_members USING btree (org_id, user_id);


--
-- Name: uq_partner_client_org; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_client_org ON public.partner_clients USING btree (partner_id, org_id);


--
-- Name: uq_tps_phone_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_tps_phone_hash ON public.tps_check_results USING btree (phone_hash);


--
-- Name: uq_usage_records_org_month_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_usage_records_org_month_user ON public.usage_records USING btree (org_id, month, user_id);


--
-- Name: uq_wallet_txn_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_txn_idempotency ON public.wallet_transactions USING btree (idempotency_key);


--
-- Name: active_call_billing_state active_call_billing_state_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS active_call_billing_state
    ADD CONSTRAINT active_call_billing_state_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: affiliate_clicks affiliate_clicks_affiliate_id_affiliates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_affiliate_id_affiliates_id_fk FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id);


--
-- Name: affiliate_clicks affiliate_clicks_converted_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_converted_org_id_orgs_id_fk FOREIGN KEY (converted_org_id) REFERENCES public.orgs(id);


--
-- Name: affiliate_commissions affiliate_commissions_affiliate_id_affiliates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliate_commissions
    ADD CONSTRAINT affiliate_commissions_affiliate_id_affiliates_id_fk FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id);


--
-- Name: affiliate_commissions affiliate_commissions_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliate_commissions
    ADD CONSTRAINT affiliate_commissions_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: affiliate_payouts affiliate_payouts_affiliate_id_affiliates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliate_payouts
    ADD CONSTRAINT affiliate_payouts_affiliate_id_affiliates_id_fk FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id);


--
-- Name: affiliates affiliates_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliates
    ADD CONSTRAINT affiliates_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: affiliates affiliates_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS affiliates
    ADD CONSTRAINT affiliates_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: agent_assist_sessions agent_assist_sessions_call_log_id_call_logs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_assist_sessions
    ADD CONSTRAINT agent_assist_sessions_call_log_id_call_logs_id_fk FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id);


--
-- Name: agent_assist_sessions agent_assist_sessions_human_agent_id_human_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_assist_sessions
    ADD CONSTRAINT agent_assist_sessions_human_agent_id_human_agents_id_fk FOREIGN KEY (human_agent_id) REFERENCES public.human_agents(id);


--
-- Name: agent_assist_sessions agent_assist_sessions_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_assist_sessions
    ADD CONSTRAINT agent_assist_sessions_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: agent_flows agent_flows_entry_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_flows
    ADD CONSTRAINT agent_flows_entry_agent_id_agents_id_fk FOREIGN KEY (entry_agent_id) REFERENCES public.agents(id);


--
-- Name: agent_flows agent_flows_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_flows
    ADD CONSTRAINT agent_flows_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: agent_scorecards agent_scorecards_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_scorecards
    ADD CONSTRAINT agent_scorecards_agent_id_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: agent_scorecards agent_scorecards_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agent_scorecards
    ADD CONSTRAINT agent_scorecards_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: agents agents_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agents
    ADD CONSTRAINT agents_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: agents agents_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS agents
    ADD CONSTRAINT agents_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: analytics_alerts analytics_alerts_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_alerts
    ADD CONSTRAINT analytics_alerts_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: analytics_events analytics_events_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_events
    ADD CONSTRAINT analytics_events_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: analytics_events analytics_events_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_events
    ADD CONSTRAINT analytics_events_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: analytics_sessions analytics_sessions_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_sessions
    ADD CONSTRAINT analytics_sessions_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: analytics_sessions analytics_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS analytics_sessions
    ADD CONSTRAINT analytics_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: api_keys api_keys_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS api_keys
    ADD CONSTRAINT api_keys_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: api_keys api_keys_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS api_keys
    ADD CONSTRAINT api_keys_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: assist_suggestions assist_suggestions_knowledge_doc_id_knowledge_documents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS assist_suggestions
    ADD CONSTRAINT assist_suggestions_knowledge_doc_id_knowledge_documents_id_fk FOREIGN KEY (knowledge_doc_id) REFERENCES public.knowledge_documents(id);


--
-- Name: assist_suggestions assist_suggestions_session_id_agent_assist_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS assist_suggestions
    ADD CONSTRAINT assist_suggestions_session_id_agent_assist_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.agent_assist_sessions(id);


--
-- Name: billing_ledger billing_ledger_call_log_id_call_logs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS billing_ledger
    ADD CONSTRAINT billing_ledger_call_log_id_call_logs_id_fk FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id);


--
-- Name: billing_ledger billing_ledger_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS billing_ledger
    ADD CONSTRAINT billing_ledger_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: biometric_config biometric_config_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS biometric_config
    ADD CONSTRAINT biometric_config_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: biometric_fraud_alerts biometric_fraud_alerts_call_log_id_call_logs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS biometric_fraud_alerts
    ADD CONSTRAINT biometric_fraud_alerts_call_log_id_call_logs_id_fk FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id);


--
-- Name: biometric_fraud_alerts biometric_fraud_alerts_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS biometric_fraud_alerts
    ADD CONSTRAINT biometric_fraud_alerts_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: biometric_fraud_alerts biometric_fraud_alerts_resolved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS biometric_fraud_alerts
    ADD CONSTRAINT biometric_fraud_alerts_resolved_by_users_id_fk FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: biometric_fraud_alerts biometric_fraud_alerts_voiceprint_id_voiceprints_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS biometric_fraud_alerts
    ADD CONSTRAINT biometric_fraud_alerts_voiceprint_id_voiceprints_id_fk FOREIGN KEY (voiceprint_id) REFERENCES public.voiceprints(id);


--
-- Name: blog_posts blog_posts_category_id_blog_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS blog_posts
    ADD CONSTRAINT blog_posts_category_id_blog_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.blog_categories(id);


--
-- Name: call_analytics_rollups call_analytics_rollups_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_analytics_rollups
    ADD CONSTRAINT call_analytics_rollups_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: call_hops call_hops_call_log_id_call_logs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_hops
    ADD CONSTRAINT call_hops_call_log_id_call_logs_id_fk FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id);


--
-- Name: call_hops call_hops_from_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_hops
    ADD CONSTRAINT call_hops_from_agent_id_agents_id_fk FOREIGN KEY (from_agent_id) REFERENCES public.agents(id);


--
-- Name: call_hops call_hops_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_hops
    ADD CONSTRAINT call_hops_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: call_hops call_hops_to_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_hops
    ADD CONSTRAINT call_hops_to_agent_id_agents_id_fk FOREIGN KEY (to_agent_id) REFERENCES public.agents(id);


--
-- Name: call_logs call_logs_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_logs
    ADD CONSTRAINT call_logs_agent_id_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: call_logs call_logs_campaign_contact_id_campaign_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_logs
    ADD CONSTRAINT call_logs_campaign_contact_id_campaign_contacts_id_fk FOREIGN KEY (campaign_contact_id) REFERENCES public.campaign_contacts(id);


--
-- Name: call_logs call_logs_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_logs
    ADD CONSTRAINT call_logs_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: call_logs call_logs_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_logs
    ADD CONSTRAINT call_logs_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: call_logs call_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_logs
    ADD CONSTRAINT call_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: call_topics call_topics_call_log_id_call_logs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_topics
    ADD CONSTRAINT call_topics_call_log_id_call_logs_id_fk FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id);


--
-- Name: call_topics call_topics_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS call_topics
    ADD CONSTRAINT call_topics_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: campaign_contacts campaign_contacts_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS campaign_contacts
    ADD CONSTRAINT campaign_contacts_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: campaign_contacts campaign_contacts_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS campaign_contacts
    ADD CONSTRAINT campaign_contacts_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: campaigns campaigns_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS campaigns
    ADD CONSTRAINT campaigns_agent_id_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: campaigns campaigns_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS campaigns
    ADD CONSTRAINT campaigns_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: canned_responses canned_responses_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS canned_responses
    ADD CONSTRAINT canned_responses_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: case_studies case_studies_industry_id_industries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS case_studies
    ADD CONSTRAINT case_studies_industry_id_industries_id_fk FOREIGN KEY (industry_id) REFERENCES public.industries(id);


--
-- Name: channel_configurations channel_configurations_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS channel_configurations
    ADD CONSTRAINT channel_configurations_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: channel_health_log channel_health_log_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS channel_health_log
    ADD CONSTRAINT channel_health_log_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: chat_messages chat_messages_conversation_id_public_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_public_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.public_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_lead_id_chat_leads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS chat_messages
    ADD CONSTRAINT chat_messages_lead_id_chat_leads_id_fk FOREIGN KEY (lead_id) REFERENCES public.chat_leads(id) ON DELETE CASCADE;


--
-- Name: coaching_rules coaching_rules_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS coaching_rules
    ADD CONSTRAINT coaching_rules_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: commission_ledger commission_ledger_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS commission_ledger
    ADD CONSTRAINT commission_ledger_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: commission_ledger commission_ledger_partner_id_partners_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS commission_ledger
    ADD CONSTRAINT commission_ledger_partner_id_partners_id_fk FOREIGN KEY (partner_id) REFERENCES public.partners(id);


--
-- Name: connector_interest connector_interest_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS connector_interest
    ADD CONSTRAINT connector_interest_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: connector_interest connector_interest_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS connector_interest
    ADD CONSTRAINT connector_interest_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: consent_records consent_records_call_log_id_call_logs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS consent_records
    ADD CONSTRAINT consent_records_call_log_id_call_logs_id_fk FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id);


--
-- Name: consent_records consent_records_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS consent_records
    ADD CONSTRAINT consent_records_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: cost_events cost_events_call_log_id_call_logs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS cost_events
    ADD CONSTRAINT cost_events_call_log_id_call_logs_id_fk FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id);


--
-- Name: cost_events cost_events_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS cost_events
    ADD CONSTRAINT cost_events_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: country_compliance_profiles country_compliance_profiles_country_id_countries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS country_compliance_profiles
    ADD CONSTRAINT country_compliance_profiles_country_id_countries_id_fk FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: country_holidays country_holidays_country_id_countries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS country_holidays
    ADD CONSTRAINT country_holidays_country_id_countries_id_fk FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: country_rate_cards country_rate_cards_country_id_countries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS country_rate_cards
    ADD CONSTRAINT country_rate_cards_country_id_countries_id_fk FOREIGN KEY (country_id) REFERENCES public.countries(id);


--
-- Name: data_connectors data_connectors_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS data_connectors
    ADD CONSTRAINT data_connectors_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: data_connectors data_connectors_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS data_connectors
    ADD CONSTRAINT data_connectors_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: department_members department_members_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS department_members
    ADD CONSTRAINT department_members_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: department_members department_members_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS department_members
    ADD CONSTRAINT department_members_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: departments departments_manager_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS departments
    ADD CONSTRAINT departments_manager_id_users_id_fk FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: departments departments_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS departments
    ADD CONSTRAINT departments_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: deployment_model_changes deployment_model_changes_initiated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS deployment_model_changes
    ADD CONSTRAINT deployment_model_changes_initiated_by_users_id_fk FOREIGN KEY (initiated_by) REFERENCES public.users(id);


--
-- Name: deployment_model_changes deployment_model_changes_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS deployment_model_changes
    ADD CONSTRAINT deployment_model_changes_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: distribution_ledger distribution_ledger_billing_ledger_id_billing_ledger_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS distribution_ledger
    ADD CONSTRAINT distribution_ledger_billing_ledger_id_billing_ledger_id_fk FOREIGN KEY (billing_ledger_id) REFERENCES public.billing_ledger(id);


--
-- Name: distribution_ledger distribution_ledger_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS distribution_ledger
    ADD CONSTRAINT distribution_ledger_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: do_not_call_list do_not_call_list_added_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS do_not_call_list
    ADD CONSTRAINT do_not_call_list_added_by_users_id_fk FOREIGN KEY (added_by) REFERENCES public.users(id);


--
-- Name: do_not_call_list do_not_call_list_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS do_not_call_list
    ADD CONSTRAINT do_not_call_list_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: drafts drafts_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS drafts
    ADD CONSTRAINT drafts_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: drafts drafts_published_to_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS drafts
    ADD CONSTRAINT drafts_published_to_agent_id_agents_id_fk FOREIGN KEY (published_to_agent_id) REFERENCES public.agents(id);


--
-- Name: drafts drafts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS drafts
    ADD CONSTRAINT drafts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: failed_distributions failed_distributions_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS failed_distributions
    ADD CONSTRAINT failed_distributions_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: fin_accounts fin_accounts_workspace_id_fin_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_accounts
    ADD CONSTRAINT fin_accounts_workspace_id_fin_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.fin_workspaces(id);


--
-- Name: fin_audit_log fin_audit_log_workspace_id_fin_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_audit_log
    ADD CONSTRAINT fin_audit_log_workspace_id_fin_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.fin_workspaces(id);


--
-- Name: fin_bill_lines fin_bill_lines_bill_id_fin_bills_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_bill_lines
    ADD CONSTRAINT fin_bill_lines_bill_id_fin_bills_id_fk FOREIGN KEY (bill_id) REFERENCES public.fin_bills(id);


--
-- Name: fin_bills fin_bills_supplier_id_fin_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_bills
    ADD CONSTRAINT fin_bills_supplier_id_fin_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.fin_suppliers(id);


--
-- Name: fin_bills fin_bills_workspace_id_fin_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_bills
    ADD CONSTRAINT fin_bills_workspace_id_fin_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.fin_workspaces(id);


--
-- Name: fin_credit_note_lines fin_credit_note_lines_account_id_fin_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_credit_note_lines
    ADD CONSTRAINT fin_credit_note_lines_account_id_fin_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.fin_accounts(id);


--
-- Name: fin_credit_note_lines fin_credit_note_lines_credit_note_id_fin_credit_notes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_credit_note_lines
    ADD CONSTRAINT fin_credit_note_lines_credit_note_id_fin_credit_notes_id_fk FOREIGN KEY (credit_note_id) REFERENCES public.fin_credit_notes(id);


--
-- Name: fin_credit_notes fin_credit_notes_customer_id_fin_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_credit_notes
    ADD CONSTRAINT fin_credit_notes_customer_id_fin_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.fin_customers(id);


--
-- Name: fin_credit_notes fin_credit_notes_invoice_id_fin_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_credit_notes
    ADD CONSTRAINT fin_credit_notes_invoice_id_fin_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.fin_invoices(id);


--
-- Name: fin_credit_notes fin_credit_notes_workspace_id_fin_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_credit_notes
    ADD CONSTRAINT fin_credit_notes_workspace_id_fin_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.fin_workspaces(id);


--
-- Name: fin_customers fin_customers_workspace_id_fin_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_customers
    ADD CONSTRAINT fin_customers_workspace_id_fin_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.fin_workspaces(id);


--
-- Name: fin_invoice_lines fin_invoice_lines_invoice_id_fin_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_invoice_lines
    ADD CONSTRAINT fin_invoice_lines_invoice_id_fin_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.fin_invoices(id);


--
-- Name: fin_invoices fin_invoices_customer_id_fin_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_invoices
    ADD CONSTRAINT fin_invoices_customer_id_fin_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.fin_customers(id);


--
-- Name: fin_invoices fin_invoices_workspace_id_fin_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_invoices
    ADD CONSTRAINT fin_invoices_workspace_id_fin_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.fin_workspaces(id);


--
-- Name: fin_journal_entries fin_journal_entries_workspace_id_fin_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_journal_entries
    ADD CONSTRAINT fin_journal_entries_workspace_id_fin_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.fin_workspaces(id);


--
-- Name: fin_journal_lines fin_journal_lines_account_id_fin_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_journal_lines
    ADD CONSTRAINT fin_journal_lines_account_id_fin_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.fin_accounts(id);


--
-- Name: fin_journal_lines fin_journal_lines_journal_entry_id_fin_journal_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_journal_lines
    ADD CONSTRAINT fin_journal_lines_journal_entry_id_fin_journal_entries_id_fk FOREIGN KEY (journal_entry_id) REFERENCES public.fin_journal_entries(id);


--
-- Name: fin_payments fin_payments_workspace_id_fin_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_payments
    ADD CONSTRAINT fin_payments_workspace_id_fin_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.fin_workspaces(id);


--
-- Name: fin_suppliers fin_suppliers_workspace_id_fin_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_suppliers
    ADD CONSTRAINT fin_suppliers_workspace_id_fin_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.fin_workspaces(id);


--
-- Name: fin_tax_codes fin_tax_codes_workspace_id_fin_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_tax_codes
    ADD CONSTRAINT fin_tax_codes_workspace_id_fin_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.fin_workspaces(id);


--
-- Name: fin_workspaces fin_workspaces_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS fin_workspaces
    ADD CONSTRAINT fin_workspaces_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: human_agents human_agents_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS human_agents
    ADD CONSTRAINT human_agents_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: human_agents human_agents_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS human_agents
    ADD CONSTRAINT human_agents_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: industry_templates industry_templates_industry_id_industries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS industry_templates
    ADD CONSTRAINT industry_templates_industry_id_industries_id_fk FOREIGN KEY (industry_id) REFERENCES public.industries(id);


--
-- Name: industry_templates industry_templates_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS industry_templates
    ADD CONSTRAINT industry_templates_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: industry_templates industry_templates_voice_profile_id_voice_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS industry_templates
    ADD CONSTRAINT industry_templates_voice_profile_id_voice_profiles_id_fk FOREIGN KEY (voice_profile_id) REFERENCES public.voice_profiles(id);


--
-- Name: invitations invitations_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS invitations
    ADD CONSTRAINT invitations_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: invitations invitations_invited_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS invitations
    ADD CONSTRAINT invitations_invited_by_id_users_id_fk FOREIGN KEY (invited_by_id) REFERENCES public.users(id);


--
-- Name: invitations invitations_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS invitations
    ADD CONSTRAINT invitations_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: knowledge_chunks knowledge_chunks_document_id_knowledge_documents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_document_id_knowledge_documents_id_fk FOREIGN KEY (document_id) REFERENCES public.knowledge_documents(id);


--
-- Name: knowledge_chunks knowledge_chunks_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: knowledge_documents knowledge_documents_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS knowledge_documents
    ADD CONSTRAINT knowledge_documents_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: lead_activities lead_activities_lead_id_chat_leads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS lead_activities
    ADD CONSTRAINT lead_activities_lead_id_chat_leads_id_fk FOREIGN KEY (lead_id) REFERENCES public.chat_leads(id) ON DELETE CASCADE;


--
-- Name: message_templates message_templates_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS message_templates
    ADD CONSTRAINT message_templates_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: messages messages_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS messages
    ADD CONSTRAINT messages_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS notifications
    ADD CONSTRAINT notifications_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: omnichannel_conversations omnichannel_conversations_assigned_ai_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS omnichannel_conversations
    ADD CONSTRAINT omnichannel_conversations_assigned_ai_agent_id_agents_id_fk FOREIGN KEY (assigned_ai_agent_id) REFERENCES public.agents(id);


--
-- Name: omnichannel_conversations omnichannel_conversations_contact_id_unified_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS omnichannel_conversations
    ADD CONSTRAINT omnichannel_conversations_contact_id_unified_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.unified_contacts(id);


--
-- Name: omnichannel_conversations omnichannel_conversations_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS omnichannel_conversations
    ADD CONSTRAINT omnichannel_conversations_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: omnichannel_messages omnichannel_messages_conversation_id_omnichannel_conversations_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS omnichannel_messages
    ADD CONSTRAINT omnichannel_messages_conversation_id_omnichannel_conversations_ FOREIGN KEY (conversation_id) REFERENCES public.omnichannel_conversations(id);


--
-- Name: omnichannel_messages omnichannel_messages_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS omnichannel_messages
    ADD CONSTRAINT omnichannel_messages_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: org_members org_members_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS org_members
    ADD CONSTRAINT org_members_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: org_members org_members_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS org_members
    ADD CONSTRAINT org_members_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: partner_agreements partner_agreements_partner_id_partners_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partner_agreements
    ADD CONSTRAINT partner_agreements_partner_id_partners_id_fk FOREIGN KEY (partner_id) REFERENCES public.partners(id);


--
-- Name: partner_clients partner_clients_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partner_clients
    ADD CONSTRAINT partner_clients_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: partner_clients partner_clients_partner_id_partners_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partner_clients
    ADD CONSTRAINT partner_clients_partner_id_partners_id_fk FOREIGN KEY (partner_id) REFERENCES public.partners(id);


--
-- Name: partner_lifecycle_events partner_lifecycle_events_partner_id_partners_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partner_lifecycle_events
    ADD CONSTRAINT partner_lifecycle_events_partner_id_partners_id_fk FOREIGN KEY (partner_id) REFERENCES public.partners(id);


--
-- Name: partners partners_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS partners
    ADD CONSTRAINT partners_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: phone_numbers phone_numbers_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS phone_numbers
    ADD CONSTRAINT phone_numbers_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: provider_sub_accounts provider_sub_accounts_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS provider_sub_accounts
    ADD CONSTRAINT provider_sub_accounts_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: public_conversations public_conversations_lead_id_chat_leads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS public_conversations
    ADD CONSTRAINT public_conversations_lead_id_chat_leads_id_fk FOREIGN KEY (lead_id) REFERENCES public.chat_leads(id) ON DELETE SET NULL;


--
-- Name: response_cache response_cache_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS response_cache
    ADD CONSTRAINT response_cache_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: rigo_conversations rigo_conversations_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_conversations
    ADD CONSTRAINT rigo_conversations_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: rigo_conversations rigo_conversations_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_conversations
    ADD CONSTRAINT rigo_conversations_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: rigo_follow_ups rigo_follow_ups_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_follow_ups
    ADD CONSTRAINT rigo_follow_ups_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: rigo_follow_ups rigo_follow_ups_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_follow_ups
    ADD CONSTRAINT rigo_follow_ups_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: rigo_notes rigo_notes_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_notes
    ADD CONSTRAINT rigo_notes_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: rigo_notes rigo_notes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_notes
    ADD CONSTRAINT rigo_notes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: rigo_reminders rigo_reminders_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_reminders
    ADD CONSTRAINT rigo_reminders_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: rigo_reminders rigo_reminders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS rigo_reminders
    ADD CONSTRAINT rigo_reminders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: social_analytics social_analytics_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_analytics
    ADD CONSTRAINT social_analytics_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: social_analytics social_analytics_post_id_social_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_analytics
    ADD CONSTRAINT social_analytics_post_id_social_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.social_posts(id);


--
-- Name: social_posts social_posts_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_posts
    ADD CONSTRAINT social_posts_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: social_posts social_posts_strategy_id_social_strategies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_posts
    ADD CONSTRAINT social_posts_strategy_id_social_strategies_id_fk FOREIGN KEY (strategy_id) REFERENCES public.social_strategies(id);


--
-- Name: social_posts social_posts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_posts
    ADD CONSTRAINT social_posts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: social_strategies social_strategies_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_strategies
    ADD CONSTRAINT social_strategies_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: social_strategies social_strategies_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS social_strategies
    ADD CONSTRAINT social_strategies_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: subscriptions subscriptions_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS subscriptions
    ADD CONSTRAINT subscriptions_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: subscriptions subscriptions_plan_id_billing_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS subscriptions
    ADD CONSTRAINT subscriptions_plan_id_billing_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.billing_plans(id);


--
-- Name: subscriptions subscriptions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS subscriptions
    ADD CONSTRAINT subscriptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: supervisor_sessions supervisor_sessions_call_log_id_call_logs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS supervisor_sessions
    ADD CONSTRAINT supervisor_sessions_call_log_id_call_logs_id_fk FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id);


--
-- Name: supervisor_sessions supervisor_sessions_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS supervisor_sessions
    ADD CONSTRAINT supervisor_sessions_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: supervisor_sessions supervisor_sessions_supervisor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS supervisor_sessions
    ADD CONSTRAINT supervisor_sessions_supervisor_user_id_users_id_fk FOREIGN KEY (supervisor_user_id) REFERENCES public.users(id);


--
-- Name: team_activity_log team_activity_log_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS team_activity_log
    ADD CONSTRAINT team_activity_log_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: team_activity_log team_activity_log_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS team_activity_log
    ADD CONSTRAINT team_activity_log_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: template_versions template_versions_changed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS template_versions
    ADD CONSTRAINT template_versions_changed_by_users_id_fk FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: template_versions template_versions_template_id_industry_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS template_versions
    ADD CONSTRAINT template_versions_template_id_industry_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.industry_templates(id);


--
-- Name: unified_contacts unified_contacts_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS unified_contacts
    ADD CONSTRAINT unified_contacts_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: usage_records usage_records_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS usage_records
    ADD CONSTRAINT usage_records_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: usage_records usage_records_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS usage_records
    ADD CONSTRAINT usage_records_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: voice_biometric_attempts voice_biometric_attempts_call_log_id_call_logs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voice_biometric_attempts
    ADD CONSTRAINT voice_biometric_attempts_call_log_id_call_logs_id_fk FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id);


--
-- Name: voice_biometric_attempts voice_biometric_attempts_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voice_biometric_attempts
    ADD CONSTRAINT voice_biometric_attempts_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: voice_biometric_attempts voice_biometric_attempts_voiceprint_id_voiceprints_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voice_biometric_attempts
    ADD CONSTRAINT voice_biometric_attempts_voiceprint_id_voiceprints_id_fk FOREIGN KEY (voiceprint_id) REFERENCES public.voiceprints(id);


--
-- Name: voice_profiles voice_profiles_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voice_profiles
    ADD CONSTRAINT voice_profiles_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: voiceprints voiceprints_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS voiceprints
    ADD CONSTRAINT voiceprints_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: wallet_transactions wallet_transactions_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS wallet_transactions
    ADD CONSTRAINT wallet_transactions_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: wallets wallets_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS wallets
    ADD CONSTRAINT wallets_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: webhooks webhooks_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS webhooks
    ADD CONSTRAINT webhooks_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: withdrawal_requests withdrawal_requests_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: withdrawal_requests withdrawal_requests_partner_id_partners_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE IF EXISTS withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_partner_id_partners_id_fk FOREIGN KEY (partner_id) REFERENCES public.partners(id);


--
-- PostgreSQL database dump complete
--


