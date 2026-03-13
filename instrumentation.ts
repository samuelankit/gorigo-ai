export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      console.error("[process] Unhandled rejection:", reason);
    });

    process.on("uncaughtException", (err) => {
      console.error("[process] Uncaught exception:", err.message, err.stack);
    });

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn("[GoRigo] ⚠ STRIPE_WEBHOOK_SECRET is not set. Stripe webhooks will be rejected.");
    }

    if (process.env.NODE_ENV === "production") {
      await ensureProductionSchema();
      await ensureProductionAdminUser();
      await ensureProductionFullSchema();
      await ensureDemoAgents();

      const { ensureServicesStarted } = await import("@/lib/lazy-init");
      ensureServicesStarted().catch((err) => {
        console.error("[GoRigo] Failed to start background services:", err);
      });
      console.log("[GoRigo] Production instrumentation: starting background services");
    } else {
      console.log("[GoRigo] Dev instrumentation registered (services start on first API request)");
    }
  }
}

async function ensureProductionSchema() {
  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");

    const introspect = await db.execute(sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'sessions', 'rate_limits', 'orgs', 'org_members', 'wallets')
      ORDER BY table_name, ordinal_position
    `);
    const existing = new Set(
      (introspect.rows as Array<{ table_name: string; column_name: string }>)
        .map((r) => `${r.table_name}.${r.column_name}`)
    );
    const tables = new Set(
      (introspect.rows as Array<{ table_name: string }>).map((r) => r.table_name)
    );

    console.log(`[GoRigo] Production DB tables found: ${[...tables].join(", ")}`);
    console.log(`[GoRigo] Production DB users columns: ${[...existing].filter(c => c.startsWith("users.")).map(c => c.split(".")[1]).join(", ")}`);

    const stmts: string[] = [];

    if (!tables.has("rate_limits")) {
      stmts.push(`CREATE TABLE IF NOT EXISTS rate_limits (id serial PRIMARY KEY, key varchar(255) NOT NULL, bucket varchar(64) NOT NULL, count integer DEFAULT 1 NOT NULL, window_start timestamp DEFAULT now() NOT NULL, window_end timestamp NOT NULL)`);
    }
    stmts.push(`CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_key_bucket_unique ON rate_limits (key, bucket)`);
    stmts.push(`CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits (window_end)`);

    const userCols: Record<string, string> = {
      "failed_login_attempts": "integer DEFAULT 0",
      "locked_until": "timestamp",
      "global_role": "text DEFAULT 'CLIENT'",
      "email_verified": "boolean DEFAULT false",
      "email_verification_token": "text",
      "email_verification_expires_at": "timestamp",
      "terms_accepted_at": "timestamp",
      "terms_version": "text",
      "must_change_password": "boolean DEFAULT false",
      "deleted_at": "timestamp",
      "is_demo": "boolean DEFAULT false",
    };
    for (const [col, type] of Object.entries(userCols)) {
      if (!existing.has(`users.${col}`)) {
        stmts.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      }
    }

    const sessionCols: Record<string, string> = {
      "ip_address": "text",
      "user_agent": "text",
      "created_at": "timestamp DEFAULT now()",
      "last_seen_at": "timestamp DEFAULT now()",
      "active_org_id": "integer",
      "rotated_at": "timestamp DEFAULT now()",
      "expires_at": "timestamp",
      "user_id": "integer",
    };
    for (const [col, type] of Object.entries(sessionCols)) {
      if (!existing.has(`sessions.${col}`)) {
        stmts.push(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      }
    }

    for (const stmt of stmts) {
      try {
        await db.execute(sql.raw(stmt));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("already exists") && !msg.includes("does not exist")) {
          console.warn(`[GoRigo] Schema stmt failed: ${msg.substring(0, 120)}`);
        }
      }
    }

    console.log("[GoRigo] Production schema verified");
  } catch (e) {
    console.error("[GoRigo] Schema verification failed:", e instanceof Error ? e.message : e);
  }
}

async function ensureProductionFullSchema() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");

    const sqlFilePath = path.join(process.cwd(), "lib", "migrations", "full_schema.sql");
    if (!fs.existsSync(sqlFilePath)) {
      console.warn("[GoRigo] Full schema migration file not found — skipping");
      return;
    }

    const sqlText = fs.readFileSync(sqlFilePath, "utf-8");
    const statements = sqlText
      .split(/;\s*\n/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && !s.startsWith("--"));

    let applied = 0;
    let skipped = 0;
    for (const stmt of statements) {
      if (!stmt || stmt.trim().length < 4) continue;
      try {
        await db.execute(sql.raw(stmt + (stmt.endsWith(";") ? "" : ";")));
        applied++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("already exists") || msg.includes("does not exist") || msg.includes("duplicate")) {
          skipped++;
        } else {
          console.warn(`[GoRigo] Schema stmt: ${msg.substring(0, 100)}`);
        }
      }
    }
    console.log(`[GoRigo] Full schema migration: applied=${applied}, skipped=${skipped}`);
  } catch (e) {
    console.error("[GoRigo] Full schema migration failed:", e instanceof Error ? e.message : e);
  }
}

async function ensureDemoAgents() {
  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");

    const DEMO_ORG_ID = 2;
    const DEMO_USER_ID = 1;

    await db.execute(sql.raw(`
      INSERT INTO orgs (id, name, timezone, currency, status)
      VALUES (${DEMO_ORG_ID}, 'GoRigo Demo', 'UTC', 'GBP', 'active')
      ON CONFLICT (id) DO NOTHING
    `));

    await db.execute(sql.raw(
      `SELECT setval('orgs_id_seq', GREATEST((SELECT MAX(id) FROM orgs), ${DEMO_ORG_ID}))`
    ));

    await db.execute(sql.raw(`
      INSERT INTO org_members (org_id, user_id, role)
      VALUES (${DEMO_ORG_ID}, ${DEMO_USER_ID}, 'OWNER')
      ON CONFLICT DO NOTHING
    `));

    const demoAgents = [
      {
        name: "Ava",
        dept: "Sales",
        greeting: "Hi there! I'm Ava, GoRigo's AI sales specialist. I'd love to show you how our platform can automate your call centre. What kind of business are you running, and what are you looking to automate?",
        faqs: JSON.stringify([
          { question: "What is GoRigo", answer: "GoRigo is an AI-powered voice platform that automates outbound and inbound calling for businesses. You get intelligent AI agents, campaign management, compliance tools, and real-time analytics — all in one platform." },
          { question: "How much does GoRigo cost", answer: "GoRigo uses a talk-time-only billing model. Individual plan: £0.20/min. Team plan: £0.18/min. Enterprise: custom pricing. You only pay for actual call minutes — no hidden monthly fees. Minimum wallet top-up is £50." },
          { question: "Is there a free trial", answer: "GoRigo doesn't offer free trials — we're a prepaid platform. You top up your wallet with a minimum of £50 and only pay for actual talk time. No wasted budget on subscriptions." },
          { question: "What features does GoRigo have", answer: "GoRigo includes: AI voice agents with natural conversation, outbound campaign management, inbound call handling, knowledge base RAG, compliance tools (DNC, TPS, TCPA), real-time analytics, multi-agent management, and a mobile app for on-the-go control." },
        ]),
      },
      {
        name: "Max",
        dept: "Support",
        greeting: "Hello! I'm Max from GoRigo Support. How can I help you today?",
        faqs: JSON.stringify([
          { question: "How do I top up my wallet", answer: "Go to Dashboard > Finance > Wallet, click 'Top Up', and complete the Stripe checkout. Minimum top-up is £50. Top-ups are non-refundable except for platform errors." },
          { question: "How do I reset my password", answer: "Click 'Forgot Password' on the login page, enter your email, and follow the link we send you. Links expire after 1 hour." },
          { question: "Why did my call fail", answer: "Common reasons: insufficient wallet balance (minimum £1.00 required), DNC/TPS compliance block, or invalid phone number format. Check your Call History for the exact failure reason." },
        ]),
      },
      {
        name: "Zara",
        dept: "Onboarding",
        greeting: "Welcome to GoRigo! I'm Zara and I'll help you get set up. Shall we start with creating your first AI agent?",
        faqs: JSON.stringify([
          { question: "How do I get started", answer: "Welcome! 3 steps to get started: 1) Top up your wallet (minimum £50). 2) Create your AI agent in Agents & Flow. 3) Add your phone number and launch a campaign. That's it — your AI is live!" },
          { question: "How do I create an agent", answer: "Go to Agents & Flow > Create Agent. Give it a name, set the greeting message, add FAQ entries, and configure the voice. Your agent is ready in under 5 minutes." },
          { question: "How do I run a campaign", answer: "Go to Campaigns > Create Campaign. Choose your agent, upload a contact list (CSV), set your calling hours and budget cap, then click Approve. The platform handles everything automatically." },
        ]),
      },
    ];

    for (const agent of demoAgents) {
      await db.execute(sql.raw(`
        INSERT INTO agents (user_id, org_id, name, greeting, faq_entries, department_name, status, outbound_enabled, inbound_enabled)
        VALUES (
          ${DEMO_USER_ID},
          ${DEMO_ORG_ID},
          '${agent.name}',
          '${agent.greeting.replace(/'/g, "''")}',
          '${agent.faqs.replace(/'/g, "''")}'::jsonb,
          '${agent.dept}',
          'active',
          true,
          true
        )
        ON CONFLICT DO NOTHING
      `));
    }
    console.log("[GoRigo] Demo agents seeded (Ava, Max, Zara)");
  } catch (e) {
    console.error("[GoRigo] Demo agents seeding failed:", e instanceof Error ? e.message : e);
  }
}

async function ensureProductionAdminUser() {
  try {
    const { db } = await import("@/lib/db");
    const { users, orgs, orgMembers, wallets } = await import("@/shared/schema");
    const { eq } = await import("drizzle-orm");
    const bcrypt = await import("bcryptjs");

    const [existing] = await db
      .select({ id: users.id, globalRole: users.globalRole })
      .from(users)
      .where(eq(users.email, "admin@gorigo.ai"))
      .limit(1);

    if (existing) {
      if (existing.globalRole !== "SUPERADMIN") {
        await db
          .update(users)
          .set({ globalRole: "SUPERADMIN", mustChangePassword: false })
          .where(eq(users.email, "admin@gorigo.ai"));
        console.log("[GoRigo] Admin user promoted to SUPERADMIN");
      } else {
        console.log("[GoRigo] Production admin user exists (id=" + existing.id + ")");
      }
      return;
    }

    console.log("[GoRigo] Creating production admin user...");
    const passwordHash = await bcrypt.hash("admin123", 12);
    const [newUser] = await db
      .insert(users)
      .values({
        email: "admin@gorigo.ai",
        password: passwordHash,
        businessName: "GoRigo Platform",
        globalRole: "SUPERADMIN",
        isDemo: false,
        emailVerified: true,
        mustChangePassword: false,
      })
      .onConflictDoNothing()
      .returning();

    if (newUser) {
      const [newOrg] = await db.insert(orgs).values({ name: "GoRigo Platform" }).returning();
      if (newOrg) {
        await db.insert(orgMembers).values({ orgId: newOrg.id, userId: newUser.id, role: "OWNER" });
        await db
          .insert(wallets)
          .values({ orgId: newOrg.id, balance: "0", currency: "GBP" })
          .onConflictDoNothing();
      }
      console.log("[GoRigo] Production admin user created: admin@gorigo.ai / admin123");
    }
  } catch (e) {
    console.error("[GoRigo] Admin user seeding failed:", e instanceof Error ? e.message : e);
  }
}
