import { db } from "@/lib/db";
import { 
  users, orgs, orgMembers, agents, callLogs, usageRecords, 
  billingPlans, subscriptions, billingLedger, partners, 
  partnerClients, platformSettings, auditLog, channelBillingRules 
} from "@/shared/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Starting admin seed...");

  const existingRules = await db.select().from(channelBillingRules).limit(1);
  if (existingRules.length === 0) {
    await db.insert(channelBillingRules).values([
      { channelType: "voice_call", talkTimeEquivalentMinutes: "1.0000", providerCostPerUnit: "0.0150", marginPercent: "50.00", isActive: true },
      { channelType: "ai_drafts", talkTimeEquivalentMinutes: "0.5000", providerCostPerUnit: "0.0030", marginPercent: "60.00", isActive: true },
      { channelType: "knowledge_embedding", talkTimeEquivalentMinutes: "0.2000", providerCostPerUnit: "0.0001", marginPercent: "70.00", isActive: true },
      { channelType: "knowledge_query", talkTimeEquivalentMinutes: "0.1000", providerCostPerUnit: "0.0005", marginPercent: "65.00", isActive: true },
      { channelType: "ai_chat", talkTimeEquivalentMinutes: "0.3000", providerCostPerUnit: "0.0020", marginPercent: "60.00", isActive: true },
      { channelType: "ai_summary", talkTimeEquivalentMinutes: "0.2000", providerCostPerUnit: "0.0015", marginPercent: "60.00", isActive: true },
      { channelType: "sms_outbound", talkTimeEquivalentMinutes: "0.1000", providerCostPerUnit: "0.0100", marginPercent: "55.00", isActive: true },
      { channelType: "email_outbound", talkTimeEquivalentMinutes: "0.0500", providerCostPerUnit: "0.0020", marginPercent: "70.00", isActive: true },
      { channelType: "rigo_assistant", talkTimeEquivalentMinutes: "0.1000", providerCostPerUnit: "0.0050", marginPercent: "50.00", isActive: true },
      { channelType: "transcription", talkTimeEquivalentMinutes: "1.0000", providerCostPerUnit: "0.0060", marginPercent: "60.00", isActive: true },
    ]);
    console.log("Channel billing rules seeded (10 channel types)");
  } else {
    console.log("Channel billing rules already exist, skipping.");
  }

  const existingVatSetting = await db.select().from(platformSettings).where(eq(platformSettings.key, "vat_registered")).limit(1);
  if (existingVatSetting.length === 0) {
    await db.insert(platformSettings).values([
      { key: "vat_registered", value: "false", description: "Whether International Business Exchange Limited is VAT registered" },
      { key: "vat_number", value: "", description: "VAT registration number (e.g. GB 123456789)" },
    ]);
    console.log("VAT platform settings seeded (not registered)");
  }

  const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@gorigo.ai")).limit(1);
  if (existingAdmin.length > 0) {
    console.log("Admin user already exists. Updating globalRole...");
    await db.update(users).set({ globalRole: "SUPERADMIN" }).where(eq(users.email, "admin@gorigo.ai"));
    console.log("Checking if partners exist...");
    const existingPartners = await db.select().from(partners).limit(1);
    if (existingPartners.length > 0) {
      console.log("Seed data already exists. Skipping.");
      return;
    }
  }

  let adminUser;
  if (existingAdmin.length === 0) {
    const hashedPw = await hashPassword("admin123");
    [adminUser] = await db.insert(users).values({
      email: "admin@gorigo.ai",
      password: hashedPw,
      businessName: "GoRigo Platform",
      globalRole: "SUPERADMIN",
      isDemo: false,
    }).returning();
    console.log("Created superadmin user: admin@gorigo.ai / admin123");

    const [adminOrg] = await db.insert(orgs).values({ name: "GoRigo Platform" }).returning();
    await db.insert(orgMembers).values({ orgId: adminOrg.id, userId: adminUser.id, role: "OWNER" });
  } else {
    adminUser = existingAdmin[0];
  }

  const existingDemo = await db.select().from(users).where(eq(users.email, "demo@gorigo.ai")).limit(1);
  if (existingDemo.length > 0) {
    await db.update(users).set({ globalRole: "CLIENT" }).where(eq(users.email, "demo@gorigo.ai"));
  }

  const plans = await db.select().from(billingPlans).limit(1);
  let planIds: number[] = [];
  if (plans.length === 0) {
    const insertedPlans = await db.insert(billingPlans).values([
      { name: "Starter", minutesIncluded: 100, pricePerMonth: "29", overagePerMinute: "0.15" },
      { name: "Professional", minutesIncluded: 500, pricePerMonth: "99", overagePerMinute: "0.10" },
      { name: "Enterprise", minutesIncluded: 2000, pricePerMonth: "299", overagePerMinute: "0.07" },
    ]).returning();
    planIds = insertedPlans.map(p => p.id);
  } else {
    const allPlans = await db.select().from(billingPlans);
    planIds = allPlans.map(p => p.id);
  }

  console.log("Creating demo partners...");
  const [partner1] = await db.insert(partners).values({
    name: "BrightCall Marketing",
    contactEmail: "sarah@brightcall.io",
    contactName: "Sarah Chen",
    brandingCompanyName: "BrightCall",
    brandingPrimaryColor: "#10B981",
    whitelabelMode: "white-label",
    tier: "GOLD",
    status: "active",
    wholesaleRatePerMinute: "0.04",
    monthlyPlatformFee: "500",
    maxClients: 100,
    featuresEnabled: ["voice_inbound", "voice_outbound", "call_logs", "agent_config", "billing", "analytics"],
    notes: "Top performing partner. Manages enterprise clients.",
  }).returning();

  const [partner2] = await db.insert(partners).values({
    name: "LeadGen Pro",
    contactEmail: "mike@leadgenpro.com",
    contactName: "Mike Torres",
    brandingCompanyName: "LeadGen Pro AI",
    brandingPrimaryColor: "#8B5CF6",
    whitelabelMode: "co-branded",
    tier: "SILVER",
    status: "active",
    wholesaleRatePerMinute: "0.05",
    monthlyPlatformFee: "200",
    maxClients: 50,
    featuresEnabled: ["voice_inbound", "call_logs", "agent_config", "billing"],
    notes: "Growing partner focused on SMB lead generation.",
  }).returning();

  const [partner3] = await db.insert(partners).values({
    name: "CallWave Solutions",
    contactEmail: "raj@callwave.dev",
    contactName: "Raj Patel",
    brandingCompanyName: "CallWave",
    brandingPrimaryColor: "#F59E0B",
    whitelabelMode: "white-label",
    tier: "BRONZE",
    status: "suspended",
    suspendedAt: new Date(),
    wholesaleRatePerMinute: "0.06",
    monthlyPlatformFee: "100",
    maxClients: 25,
    featuresEnabled: ["voice_inbound", "call_logs", "agent_config"],
    notes: "Suspended due to overdue payment. Pending resolution.",
  }).returning();

  console.log("Creating demo clients for partners...");

  async function createClient(name: string, email: string, partnerId: number | null, retailRate: number | null) {
    const hashedPw = await hashPassword("demo123");
    const [clientUser] = await db.insert(users).values({
      email,
      password: hashedPw,
      businessName: name,
      globalRole: "CLIENT",
      isDemo: true,
    }).returning();

    const [clientOrg] = await db.insert(orgs).values({ name }).returning();
    await db.insert(orgMembers).values({ orgId: clientOrg.id, userId: clientUser.id, role: "OWNER" });
    await db.insert(agents).values({ userId: clientUser.id, orgId: clientOrg.id, name: `${name} Agent`, businessDescription: `AI agent for ${name}` });

    if (partnerId) {
      await db.insert(partnerClients).values({ partnerId, orgId: clientOrg.id, retailRatePerMinute: retailRate != null ? String(retailRate) : null, status: "active" });
    }

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const callCount = Math.floor(Math.random() * 80) + 20;
    const minutesUsed = Math.floor(Math.random() * 200) + 50;
    const leadsCaptured = Math.floor(Math.random() * 30) + 5;

    await db.insert(usageRecords).values({
      userId: clientUser.id,
      orgId: clientOrg.id,
      month,
      minutesUsed: String(minutesUsed),
      callCount,
      leadsCaptured,
    });

    if (planIds.length > 0) {
      const planId = planIds[Math.floor(Math.random() * planIds.length)];
      await db.insert(subscriptions).values({
        userId: clientUser.id,
        orgId: clientOrg.id,
        planId,
        status: "active",
      });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.orgId, clientOrg.id)).limit(1);
    const agentId = agent?.id ?? 1;

    const statuses = ["completed", "completed", "completed", "completed", "missed", "failed"];
    const directions = ["inbound", "inbound", "inbound", "outbound"];
    const summaries = [
      "Customer inquired about pricing. Provided tier information and scheduled follow-up.",
      "Lead captured. Customer interested in enterprise plan. Booked demo call.",
      "Support call about billing question. Resolved account inquiry.",
      "Outbound follow-up call. Customer confirmed meeting for next week.",
      "Customer asked about product availability. Transferred to sales team.",
      "Quick inquiry about operating hours. Provided information.",
    ];

    for (let i = 0; i < Math.min(callCount, 15); i++) {
      const duration = Math.floor(Math.random() * 300) + 30;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const callDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const endDate = new Date(callDate.getTime() + duration * 1000);

      const [callLog] = await db.insert(callLogs).values({
        agentId,
        userId: clientUser.id,
        orgId: clientOrg.id,
        direction,
        callerNumber: `+44${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
        duration,
        status,
        summary: summaries[Math.floor(Math.random() * summaries.length)],
        leadCaptured: Math.random() > 0.6,
        leadName: Math.random() > 0.5 ? `Contact ${i + 1}` : null,
        leadEmail: Math.random() > 0.5 ? `contact${i + 1}@example.com` : null,
        currentState: status === "completed" ? "CLOSE" : "FAILSAFE",
        turnCount: Math.floor(Math.random() * 8) + 2,
        lastConfidence: String(Math.random() * 0.4 + 0.6),
        finalOutcome: status === "completed" ? "resolved" : status === "missed" ? "no_answer" : "error",
        startedAt: callDate,
        endedAt: status === "completed" ? endDate : null,
        aiDisclosurePlayed: true,
        aiDisclosureVersion: "v1.0",
      }).returning();

      if (status === "completed") {
        const billableSeconds = Math.max(duration, 30);
        const rate = retailRate ?? 0.10;
        const cost = (billableSeconds / 60) * rate;
        await db.insert(billingLedger).values({
          orgId: clientOrg.id,
          callLogId: callLog.id,
          startedAt: callDate,
          connectedAt: callDate,
          endedAt: endDate,
          billableSeconds,
          minChargeSeconds: 30,
          ratePerMinute: String(rate),
          cost: String(Math.round(cost * 100) / 100),
          currency: "GBP",
          provider: "gorigo",
          status: "settled",
        });
      }
    }

    return { user: clientUser, org: clientOrg };
  }

  await createClient("Stellar Dental Clinic", "stellar@demo.gorigo.ai", partner1.id, 0.12);
  await createClient("GreenLeaf Properties", "greenleaf@demo.gorigo.ai", partner1.id, 0.10);
  await createClient("FastTrack Auto Service", "fasttrack@demo.gorigo.ai", partner2.id, 0.15);
  await createClient("Bloom Beauty Spa", "bloom@demo.gorigo.ai", partner2.id, 0.12);
  await createClient("Peak Fitness Studio", "peak@demo.gorigo.ai", null, null);
  await createClient("Urban Eats Restaurant", "urban@demo.gorigo.ai", null, null);

  console.log("Seeding platform settings...");
  const defaultSettings = [
    { key: "default_wholesale_rate", value: "0.05", description: "Default wholesale rate per minute for new partners (GBP)" },
    { key: "default_overage_rate", value: "0.10", description: "Default overage rate per minute (GBP)" },
    { key: "min_charge_seconds", value: "30", description: "Minimum charge in seconds per call" },
    { key: "max_partners", value: "100", description: "Maximum number of partners allowed" },
    { key: "max_clients_per_partner", value: "50", description: "Default max clients per partner" },
    { key: "auto_suspend_days_overdue", value: "30", description: "Auto-suspend partners after N days overdue" },
    { key: "enable_outbound_calling", value: "true", description: "Enable outbound calling feature" },
    { key: "enable_whitelabel", value: "true", description: "Enable full white-label mode for partners" },
    { key: "enable_co_branding", value: "true", description: "Enable co-branding mode for partners" },
  ];

  for (const setting of defaultSettings) {
    const existing = await db.select().from(platformSettings).where(eq(platformSettings.key, setting.key)).limit(1);
    if (existing.length === 0) {
      await db.insert(platformSettings).values(setting);
    }
  }

  console.log("Creating audit log entries...");
  await db.insert(auditLog).values([
    { actorId: adminUser.id, actorEmail: "admin@gorigo.ai", action: "partner_created", entityType: "partner", entityId: partner1.id, details: { name: "BrightCall Marketing", tier: "GOLD" } },
    { actorId: adminUser.id, actorEmail: "admin@gorigo.ai", action: "partner_created", entityType: "partner", entityId: partner2.id, details: { name: "LeadGen Pro", tier: "SILVER" } },
    { actorId: adminUser.id, actorEmail: "admin@gorigo.ai", action: "partner_created", entityType: "partner", entityId: partner3.id, details: { name: "CallWave Solutions", tier: "BRONZE" } },
    { actorId: adminUser.id, actorEmail: "admin@gorigo.ai", action: "partner_suspended", entityType: "partner", entityId: partner3.id, details: { reason: "Overdue payment" } },
    { actorId: adminUser.id, actorEmail: "admin@gorigo.ai", action: "settings_updated", entityType: "platform", details: { keys: ["default_wholesale_rate", "min_charge_seconds"] } },
    { actorId: adminUser.id, actorEmail: "admin@gorigo.ai", action: "client_onboarded", entityType: "org", details: { name: "Stellar Dental Clinic", partner: "BrightCall Marketing" } },
    { actorId: adminUser.id, actorEmail: "admin@gorigo.ai", action: "client_onboarded", entityType: "org", details: { name: "Peak Fitness Studio", channel: "D2C" } },
  ]);

  console.log("Seed completed successfully!");
  console.log("---");
  console.log("SuperAdmin login: admin@gorigo.ai / admin123");
  console.log("Demo client login: demo@gorigo.ai / 12345");
  console.log("3 partners created: BrightCall Marketing (GOLD), LeadGen Pro (SILVER), CallWave Solutions (BRONZE/suspended)");
  console.log("6 clients created: 2 under BrightCall, 2 under LeadGen Pro, 2 D2C");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
