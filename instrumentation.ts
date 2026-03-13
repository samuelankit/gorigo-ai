export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      console.error("[process] Unhandled rejection:", reason);
    });

    process.on("uncaughtException", (err) => {
      console.error("[process] Uncaught exception:", err.message, err.stack);
    });

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn("[GoRigo] ⚠ STRIPE_WEBHOOK_SECRET is not set. Stripe webhooks will be rejected in production. Set this secret before going live.");
    }

    if (process.env.NODE_ENV === "production") {
      await runDatabaseMigrations();
      await ensureProductionSchemaColumns();
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

async function runDatabaseMigrations() {
  const { execSync } = await import("child_process");
  const path = await import("path");
  const fs = await import("fs");

  try {
    const possibleRoots = [
      process.cwd(),
      path.resolve("."),
      path.dirname(process.argv[1] ?? ""),
    ];

    let projectRoot = process.cwd();
    for (const root of possibleRoots) {
      if (fs.existsSync(path.join(root, "drizzle.config.ts"))) {
        projectRoot = root;
        break;
      }
    }

    const drizzleKitBin = path.join(projectRoot, "node_modules", ".bin", "drizzle-kit");

    if (fs.existsSync(drizzleKitBin)) {
      console.log("[GoRigo] Running drizzle-kit push to sync DB schema...");
      execSync(`${drizzleKitBin} push --force --config=${path.join(projectRoot, "drizzle.config.ts")}`, {
        env: { ...process.env },
        cwd: projectRoot,
        stdio: "pipe",
        timeout: 120_000,
      });
      console.log("[GoRigo] DB schema sync complete");
      return;
    }
  } catch (e) {
    console.warn("[GoRigo] drizzle-kit push failed, falling back to migrate:", e instanceof Error ? e.message : e);
  }

  try {
    const path2 = await import("path");
    const fs2 = await import("fs");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { db } = await import("@/lib/db");

    const possiblePaths = [
      path2.resolve("migrations"),
      path2.join(process.cwd(), "migrations"),
    ];

    let migrationsFolder = possiblePaths[0];
    for (const p of possiblePaths) {
      if (fs2.existsSync(p)) {
        migrationsFolder = p;
        break;
      }
    }

    if (fs2.existsSync(migrationsFolder)) {
      console.log(`[GoRigo] Running migrations from ${migrationsFolder}`);
      await migrate(db, { migrationsFolder });
      console.log("[GoRigo] DB migrations complete");
    } else {
      console.warn("[GoRigo] No migrations folder found, skipping");
    }
  } catch (e) {
    console.error("[GoRigo] DB migration failed:", e instanceof Error ? e.message : e);
  }
}

async function ensureProductionSchemaColumns() {
  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");

    const alterStatements = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamp`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS global_role text DEFAULT 'CLIENT'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token text`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at timestamp`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version text`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamp`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false`,
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address text`,
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent text`,
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()`,
      `ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS key text`,
      `CREATE TABLE IF NOT EXISTS rate_limits (id serial PRIMARY KEY, key text NOT NULL, bucket text NOT NULL, count integer DEFAULT 1, window_start timestamp DEFAULT now(), window_end timestamp NOT NULL DEFAULT now())`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_key_bucket_unique ON rate_limits (key, bucket)`,
      `CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits (window_end)`,
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at timestamp`,
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id integer`,
    ];

    for (const stmt of alterStatements) {
      try {
        await db.execute(sql.raw(stmt));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("already exists") && !msg.includes("does not exist")) {
          console.warn(`[GoRigo] Schema fix skipped: ${msg.substring(0, 100)}`);
        }
      }
    }
    console.log("[GoRigo] Production schema columns verified");
  } catch (e) {
    console.error("[GoRigo] Schema column fix failed:", e instanceof Error ? e.message : e);
  }
}

async function ensureProductionAdminUser() {
  try {
    const { db } = await import("@/lib/db");
    const { users, orgs, orgMembers, wallets } = await import("@/shared/schema");
    const { eq } = await import("drizzle-orm");
    const bcrypt = await import("bcryptjs");

    const [existing] = await db.select({ id: users.id, globalRole: users.globalRole }).from(users).where(eq(users.email, "admin@gorigo.ai")).limit(1);
    if (existing) {
      if (existing.globalRole !== "SUPERADMIN") {
        await db.update(users).set({ globalRole: "SUPERADMIN", mustChangePassword: false }).where(eq(users.email, "admin@gorigo.ai"));
        console.log("[GoRigo] Admin user promoted to SUPERADMIN");
      } else {
        console.log("[GoRigo] Production admin user exists");
      }
      return;
    }

    console.log("[GoRigo] Creating production admin user...");
    const passwordHash = await bcrypt.hash("admin123", 12);
    const [newUser] = await db.insert(users).values({
      email: "admin@gorigo.ai",
      password: passwordHash,
      businessName: "GoRigo Platform",
      globalRole: "SUPERADMIN",
      isDemo: false,
      emailVerified: true,
      mustChangePassword: false,
    }).onConflictDoNothing().returning();

    if (newUser) {
      const [newOrg] = await db.insert(orgs).values({ name: "GoRigo Platform" }).returning();
      if (newOrg) {
        await db.insert(orgMembers).values({ orgId: newOrg.id, userId: newUser.id, role: "OWNER" });
        await db.insert(wallets).values({ orgId: newOrg.id, balance: "0", currency: "GBP" }).onConflictDoNothing();
      }
      console.log("[GoRigo] Production admin user created: admin@gorigo.ai / admin123");
    }
  } catch (e) {
    console.error("[GoRigo] Admin user seeding failed:", e instanceof Error ? e.message : e);
  }
}
