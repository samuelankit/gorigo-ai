import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import {
  agents,
  knowledgeDocuments,
  callLogs,
  wallets,
  phoneNumbers,
  campaigns,
  webhooks,
  orgMembers,
  orgs,
  platformSettings,
  departments,
  dataConnectors,
  chatLeads,
  usageRecords,
} from "@/shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  whyItMatters: string;
  timeEstimate: number;
  completed: boolean;
  link: string;
  isEssential: boolean;
  packageRequirement: null | "team" | "custom";
  skipped: boolean;
}

interface OnboardingPhase {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  allComplete: boolean;
  celebration: string;
}

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const orgId = auth.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const [
      [agentResult],
      [knowledgeResult],
      [callResult],
      [walletResult],
      [phoneResult],
      [campaignResult],
      [webhookResult],
      [memberResult],
      [departmentResult],
      [connectorResult],
      [leadResult],
      [orgData],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(agents).where(eq(agents.orgId, orgId)),
      db.select({ count: sql<number>`count(*)::int` }).from(knowledgeDocuments).where(eq(knowledgeDocuments.orgId, orgId)),
      db.select({ count: sql<number>`count(*)::int` }).from(callLogs).where(eq(callLogs.orgId, orgId)),
      db.select({ balance: wallets.balance }).from(wallets).where(eq(wallets.orgId, orgId)),
      db.select({ count: sql<number>`count(*)::int` }).from(phoneNumbers).where(eq(phoneNumbers.orgId, orgId)),
      db.select({ count: sql<number>`count(*)::int` }).from(campaigns).where(eq(campaigns.orgId, orgId)),
      db.select({ count: sql<number>`count(*)::int` }).from(webhooks).where(eq(webhooks.orgId, orgId)),
      db.select({ count: sql<number>`count(*)::int` }).from(orgMembers).where(eq(orgMembers.orgId, orgId)),
      db.select({ count: sql<number>`count(*)::int` }).from(departments).where(eq(departments.orgId, orgId)),
      db.select({ count: sql<number>`count(*)::int` }).from(dataConnectors).where(and(eq(dataConnectors.orgId, orgId), eq(dataConnectors.status, "active"))),
      db.select({ count: sql<number>`count(*)::int` }).from(chatLeads).where(eq(chatLeads.orgId, orgId)),
      db.select({
        businessHours: orgs.businessHours,
        timezone: orgs.timezone,
        currency: orgs.currency,
        deploymentModel: orgs.deploymentModel,
        name: orgs.name,
      }).from(orgs).where(eq(orgs.id, orgId)),
    ]);

    const agentCount = agentResult?.count ?? 0;
    const knowledgeCount = knowledgeResult?.count ?? 0;
    const callCount = callResult?.count ?? 0;
    const walletBalance = walletResult ? Number(walletResult.balance) : 0;
    const phoneCount = phoneResult?.count ?? 0;
    const campaignCount = campaignResult?.count ?? 0;
    const webhookCount = webhookResult?.count ?? 0;
    const memberCount = memberResult?.count ?? 0;
    const departmentCount = departmentResult?.count ?? 0;
    const connectorCount = connectorResult?.count ?? 0;
    const leadCount = leadResult?.count ?? 0;
    const deploymentModel = orgData?.deploymentModel ?? "individual";
    const orgName = orgData?.name ?? "Your Business";
    const hasBusinessHours = !!(orgData?.businessHours && typeof orgData.businessHours === "object" && Object.keys(orgData.businessHours as object).length > 0);
    const hasConfiguredTimezone = orgData?.timezone !== "UTC";
    const hasWalletFunded = walletBalance > 0;

    let agentHasCustomGreeting = false;
    let agentHasFaqs = false;
    if (agentCount > 0) {
      const [firstAgent] = await db
        .select({ greeting: agents.greeting, faqEntries: agents.faqEntries })
        .from(agents)
        .where(eq(agents.orgId, orgId))
        .limit(1);
      if (firstAgent) {
        agentHasCustomGreeting = !!(firstAgent.greeting && firstAgent.greeting !== "Hello, thank you for calling. How can I help you today?");
        const faqs = firstAgent.faqEntries as unknown[];
        agentHasFaqs = Array.isArray(faqs) && faqs.length > 0;
      }
    }

    let wizardState: { state: string; skippedSteps: string[] } = { state: "visible", skippedSteps: [] };
    try {
      const [setting] = await db
        .select({ value: platformSettings.value })
        .from(platformSettings)
        .where(eq(platformSettings.key, `wizard_state_org_${orgId}`));
      if (setting?.value) {
        wizardState = JSON.parse(setting.value);
      }
    } catch {
    }

    const skippedSet = new Set(wizardState.skippedSteps || []);

    let hasSpendingCap = false;
    try {
      const [usageRec] = await db
        .select({ spendingCap: usageRecords.spendingCap })
        .from(usageRecords)
        .where(eq(usageRecords.orgId, orgId))
        .limit(1);
      hasSpendingCap = usageRec ? Number(usageRec.spendingCap ?? 0) > 0 : false;
    } catch {
    }

    const allSteps: OnboardingStep[] = [
      {
        id: "top_up_wallet",
        title: "Top up your wallet",
        description: "Add credits to power calls, AI queries, and campaigns.",
        whyItMatters: "Your wallet powers everything — calls, AI queries, campaigns. Add credits so your agents can start working.",
        timeEstimate: 2,
        completed: hasWalletFunded,
        link: "/dashboard/wallet",
        isEssential: true,
        packageRequirement: null,
        skipped: skippedSet.has("top_up_wallet"),
      },
      {
        id: "set_business_hours",
        title: "Set business hours",
        description: "Define when your AI agents should take calls.",
        whyItMatters: "Your AI agents will only take calls during business hours. Set them so callers get the right experience at the right time.",
        timeEstimate: 2,
        completed: hasBusinessHours,
        link: "/dashboard/settings",
        isEssential: true,
        packageRequirement: null,
        skipped: skippedSet.has("set_business_hours"),
      },
      {
        id: "configure_timezone",
        title: "Configure timezone & currency",
        description: "Align reports, billing, and scheduling to your location.",
        whyItMatters: "Ensures your reports, billing, and call scheduling align with your actual operating location.",
        timeEstimate: 1,
        completed: hasConfiguredTimezone,
        link: "/dashboard/settings",
        isEssential: false,
        packageRequirement: null,
        skipped: skippedSet.has("configure_timezone"),
      },
      {
        id: "create_agent",
        title: "Create your first AI agent",
        description: "Set up an AI voice agent to answer calls and handle conversations.",
        whyItMatters: "This is your AI employee. It answers calls, qualifies leads, and handles conversations 24/7. Give it a name, role, and voice.",
        timeEstimate: 3,
        completed: agentCount > 0,
        link: "/dashboard/agent",
        isEssential: true,
        packageRequirement: null,
        skipped: skippedSet.has("create_agent"),
      },
      {
        id: "customise_greeting",
        title: "Customise greeting & personality",
        description: "Set a warm, professional greeting for every call.",
        whyItMatters: "First impressions matter. A warm, professional greeting sets the tone for every call.",
        timeEstimate: 2,
        completed: agentHasCustomGreeting,
        link: "/dashboard/agent",
        isEssential: true,
        packageRequirement: null,
        skipped: skippedSet.has("customise_greeting"),
      },
      {
        id: "add_faqs",
        title: "Add FAQ entries",
        description: "Give your agent instant answers to common questions.",
        whyItMatters: "FAQs give your agent instant answers to common questions. The more you add, the smarter it sounds.",
        timeEstimate: 5,
        completed: agentHasFaqs,
        link: "/dashboard/agent",
        isEssential: false,
        packageRequirement: null,
        skipped: skippedSet.has("add_faqs"),
      },
      {
        id: "upload_knowledge",
        title: "Upload knowledge documents",
        description: "Upload PDFs, guides, or product sheets for AI-powered answers.",
        whyItMatters: "PDFs, guides, product sheets — upload them and your agent uses RAG to answer questions accurately from your real data. No hallucination.",
        timeEstimate: 3,
        completed: knowledgeCount > 0,
        link: "/dashboard/knowledge",
        isEssential: true,
        packageRequirement: null,
        skipped: skippedSet.has("upload_knowledge"),
      },
      {
        id: "connect_data_source",
        title: "Connect a data source",
        description: "Pull live data from Google Sheets, HubSpot, or CSV files.",
        whyItMatters: "Pull live data from Google Sheets, HubSpot, or CSV files so your agent always has current information.",
        timeEstimate: 3,
        completed: connectorCount > 0,
        link: "/dashboard/data-sources",
        isEssential: false,
        packageRequirement: null,
        skipped: skippedSet.has("connect_data_source"),
      },
      {
        id: "try_smart_drafts",
        title: "Try Smart Drafts",
        description: "Let AI generate call scripts, email templates, and FAQ answers.",
        whyItMatters: "Let AI generate call scripts, email templates, and FAQ answers for you. Save hours of manual writing.",
        timeEstimate: 2,
        completed: false,
        link: "/dashboard/drafts",
        isEssential: false,
        packageRequirement: null,
        skipped: skippedSet.has("try_smart_drafts"),
      },
      {
        id: "get_phone_number",
        title: "Get a phone number",
        description: "Browse and purchase a phone number for your agent.",
        whyItMatters: "Your agent needs a phone number to receive calls. Browse and purchase one directly from the platform.",
        timeEstimate: 2,
        completed: phoneCount > 0,
        link: "/dashboard/phone-numbers",
        isEssential: true,
        packageRequirement: null,
        skipped: skippedSet.has("get_phone_number"),
      },
      {
        id: "make_test_call",
        title: "Make a test call",
        description: "Call your agent and hear it in action.",
        whyItMatters: "Call your agent and hear it in action. This is your chance to fine-tune before going live with real customers.",
        timeEstimate: 2,
        completed: callCount > 0,
        link: "/dashboard/calls",
        isEssential: true,
        packageRequirement: null,
        skipped: skippedSet.has("make_test_call"),
      },
      {
        id: "setup_compliance",
        title: "Set up compliance",
        description: "Configure AI disclosure, TPS/DNC checking, and GDPR consent.",
        whyItMatters: "Configure AI disclosure, TPS/DNC checking, and GDPR consent. These are legally required for UK/EU operations — not optional.",
        timeEstimate: 3,
        completed: false,
        link: "/dashboard/compliance",
        isEssential: true,
        packageRequirement: null,
        skipped: skippedSet.has("setup_compliance"),
      },
      {
        id: "configure_spending_caps",
        title: "Configure spending caps & alerts",
        description: "Set low-balance alerts and spending limits.",
        whyItMatters: "Set low-balance alerts and spending limits so you never get surprised by unexpected charges.",
        timeEstimate: 2,
        completed: hasSpendingCap,
        link: "/dashboard/settings",
        isEssential: false,
        packageRequirement: null,
        skipped: skippedSet.has("configure_spending_caps"),
      },
      {
        id: "setup_lead_pipeline",
        title: "Set up lead pipeline",
        description: "Organise leads with stages, scoring, and enrichment.",
        whyItMatters: "Organise your leads with stages, scoring, and enrichment. Every call and campaign feeds into your pipeline automatically.",
        timeEstimate: 3,
        completed: leadCount > 0,
        link: "/dashboard/leads",
        isEssential: true,
        packageRequirement: null,
        skipped: skippedSet.has("setup_lead_pipeline"),
      },
      {
        id: "explore_social_marketing",
        title: "Explore social media marketing",
        description: "Create and manage social media content.",
        whyItMatters: "Create and manage social media content to drive inbound interest alongside your voice campaigns.",
        timeEstimate: 2,
        completed: false,
        link: "/dashboard/social-marketing",
        isEssential: false,
        packageRequirement: null,
        skipped: skippedSet.has("explore_social_marketing"),
      },
      {
        id: "setup_omnichannel",
        title: "Set up omnichannel messaging",
        description: "Unify WhatsApp, SMS, email, and web chat into one inbox.",
        whyItMatters: "Unify WhatsApp, SMS, email, and web chat into one inbox so no customer message gets missed.",
        timeEstimate: 3,
        completed: false,
        link: "/dashboard/settings",
        isEssential: false,
        packageRequirement: "team",
        skipped: skippedSet.has("setup_omnichannel"),
      },
      {
        id: "review_gdpr",
        title: "Review GDPR settings",
        description: "Ensure data export, consent tracking, and PII redaction are configured.",
        whyItMatters: "Ensure data export, consent tracking, and PII redaction are configured correctly for full compliance.",
        timeEstimate: 2,
        completed: false,
        link: "/dashboard/compliance",
        isEssential: true,
        packageRequirement: null,
        skipped: skippedSet.has("review_gdpr"),
      },
      {
        id: "check_tps_dnc",
        title: "Check TPS/DNC configuration",
        description: "Verify the Telephone Preference Service is active.",
        whyItMatters: "Mandatory for UK calling. GoRigo checks the Telephone Preference Service automatically — verify it's active.",
        timeEstimate: 2,
        completed: false,
        link: "/dashboard/compliance",
        isEssential: true,
        packageRequirement: null,
        skipped: skippedSet.has("check_tps_dnc"),
      },
      {
        id: "enable_quality_scoring",
        title: "Enable call quality scoring",
        description: "Automatically score every call for quality and sentiment.",
        whyItMatters: "Automatically score every call for quality, sentiment, and compliance. Catch issues before they become problems.",
        timeEstimate: 1,
        completed: false,
        link: "/dashboard/analytics",
        isEssential: false,
        packageRequirement: null,
        skipped: skippedSet.has("enable_quality_scoring"),
      },
      {
        id: "create_campaign",
        title: "Create your first campaign",
        description: "Set up an outbound calling campaign to reach new prospects.",
        whyItMatters: "Set up an outbound calling campaign to reach new prospects at scale.",
        timeEstimate: 5,
        completed: campaignCount > 0,
        link: "/dashboard/campaigns/create",
        isEssential: false,
        packageRequirement: null,
        skipped: skippedSet.has("create_campaign"),
      },
      {
        id: "invite_team",
        title: "Invite team members",
        description: "Add colleagues with role-based permissions.",
        whyItMatters: "Add colleagues with role-based permissions so your team can collaborate on the platform.",
        timeEstimate: 2,
        completed: memberCount > 1,
        link: "/dashboard/team",
        isEssential: false,
        packageRequirement: "team",
        skipped: skippedSet.has("invite_team"),
      },
      {
        id: "setup_departments",
        title: "Set up departments",
        description: "Organise your team into departments with budgets and permissions.",
        whyItMatters: "Organise your team into departments with their own agents, budgets, and permissions.",
        timeEstimate: 3,
        completed: departmentCount > 0,
        link: "/dashboard/team",
        isEssential: false,
        packageRequirement: "team",
        skipped: skippedSet.has("setup_departments"),
      },
      {
        id: "setup_webhooks",
        title: "Set up webhooks",
        description: "Connect GoRigo to your CRM, Zapier, or other systems.",
        whyItMatters: "Connect GoRigo to your CRM, Zapier, or other systems so data flows automatically.",
        timeEstimate: 2,
        completed: webhookCount > 0,
        link: "/dashboard/webhooks",
        isEssential: false,
        packageRequirement: null,
        skipped: skippedSet.has("setup_webhooks"),
      },
      {
        id: "explore_analytics",
        title: "Explore analytics dashboard",
        description: "See call volumes, agent performance, and conversion rates.",
        whyItMatters: "See call volumes, agent performance, conversion rates, and costs — all in real-time.",
        timeEstimate: 2,
        completed: false,
        link: "/dashboard/analytics",
        isEssential: false,
        packageRequirement: null,
        skipped: skippedSet.has("explore_analytics"),
      },
    ];

    const filteredSteps = allSteps.filter((step) => {
      if (!step.packageRequirement) return true;
      if (step.packageRequirement === "team") {
        return deploymentModel === "team" || deploymentModel === "custom";
      }
      if (step.packageRequirement === "custom") {
        return deploymentModel === "custom";
      }
      return true;
    });

    const phaseDefinitions = [
      {
        id: "foundation",
        title: "Foundation",
        description: "Get your basics right before anything else",
        icon: "Building",
        stepIds: ["top_up_wallet", "set_business_hours", "configure_timezone"],
        celebration: "Foundation complete — you're ready to build!",
      },
      {
        id: "build_agent",
        title: "Build Your Agent",
        description: "Create your first AI voice agent",
        icon: "Bot",
        stepIds: ["create_agent", "customise_greeting", "add_faqs"],
        celebration: "Agent ready — your AI employee is set up!",
      },
      {
        id: "knowledge",
        title: "Knowledge & Intelligence",
        description: "Make your agent smarter with your business data",
        icon: "Brain",
        stepIds: ["upload_knowledge", "connect_data_source", "try_smart_drafts"],
        celebration: "Intelligence loaded — your agent is smarter than ever!",
      },
      {
        id: "go_live",
        title: "Go Live",
        description: "Start taking real calls",
        icon: "Rocket",
        stepIds: ["get_phone_number", "make_test_call", "setup_compliance", "configure_spending_caps"],
        celebration: "You're live — real calls are now flowing!",
      },
      {
        id: "communicate",
        title: "Communicate",
        description: "Reach customers across every channel",
        icon: "MessageSquare",
        stepIds: ["setup_lead_pipeline", "explore_social_marketing", "setup_omnichannel"],
        celebration: "Channels connected — you're reaching customers everywhere!",
      },
      {
        id: "compliance_safety",
        title: "Compliance & Safety",
        description: "Protect your business and your customers",
        icon: "Shield",
        stepIds: ["review_gdpr", "check_tps_dnc", "enable_quality_scoring"],
        celebration: "Compliance secured — your business is protected!",
      },
      {
        id: "grow",
        title: "Grow",
        description: "Scale your business with campaigns, teams, and analytics",
        icon: "TrendingUp",
        stepIds: ["create_campaign", "invite_team", "setup_departments", "setup_webhooks", "explore_analytics"],
        celebration: "Growth unlocked — you're ready to scale!",
      },
    ];

    const stepMap = new Map(filteredSteps.map((s) => [s.id, s]));

    const phases: OnboardingPhase[] = phaseDefinitions.map((phaseDef) => {
      const phaseSteps = phaseDef.stepIds
        .map((id) => stepMap.get(id))
        .filter((s): s is OnboardingStep => !!s);
      const completed = phaseSteps.filter((s) => s.completed || s.skipped).length;
      return {
        id: phaseDef.id,
        title: phaseDef.title,
        description: phaseDef.description,
        icon: phaseDef.icon,
        steps: phaseSteps,
        completedCount: completed,
        totalSteps: phaseSteps.length,
        allComplete: phaseSteps.length > 0 && completed === phaseSteps.length,
        celebration: phaseDef.celebration,
      };
    });

    const essentialSteps = filteredSteps.filter((s) => s.isEssential);
    const essentialCompleted = essentialSteps.filter((s) => s.completed || s.skipped).length;
    const completedCount = filteredSteps.filter((s) => s.completed || s.skipped).length;
    const totalSteps = filteredSteps.length;

    const essentialIncompleteSteps = essentialSteps.filter((s) => !s.completed && !s.skipped);
    const estimatedMinutesRemaining = essentialIncompleteSteps.reduce((sum, s) => sum + s.timeEstimate, 0);

    return NextResponse.json({
      phases,
      completedCount,
      essentialCount: essentialSteps.length,
      essentialCompleted,
      totalSteps,
      allEssentialComplete: essentialCompleted === essentialSteps.length,
      allComplete: completedCount === totalSteps,
      wizardState: wizardState.state,
      estimatedMinutesRemaining,
      orgName,
      deploymentModel,
    });
  } catch (error) {
    return handleRouteError(error, "Onboarding");
  }
}
