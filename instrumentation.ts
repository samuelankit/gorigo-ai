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
