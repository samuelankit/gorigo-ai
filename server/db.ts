import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";

if (!process.env.DATABASE_URL && typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  console.warn("DATABASE_URL not set. Database operations will not be available.");
}

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString,
  max: isProduction ? 20 : 10,
  min: isProduction ? 2 : 0,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  allowExitOnIdle: !isProduction,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error on idle client:", err.message);
});

export const db = drizzle(pool, { schema });
