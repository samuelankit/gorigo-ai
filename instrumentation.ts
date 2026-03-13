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
