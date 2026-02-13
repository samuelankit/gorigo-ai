import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";

if (!process.env.DATABASE_URL && typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  console.warn("DATABASE_URL not set. Database operations will not be available.");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
