import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

function splitSqlStatements(sqlText: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inDollarQuote = false;
  let dollarTag = "";

  const lines = sqlText.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--")) continue;

    if (!inDollarQuote) {
      const dollarMatch = trimmed.match(/\$\w*\$/);
      if (dollarMatch) {
        inDollarQuote = true;
        dollarTag = dollarMatch[0];
      }
    } else {
      if (trimmed.includes(dollarTag)) {
        inDollarQuote = false;
        dollarTag = "";
      }
    }

    current += line + "\n";

    if (!inDollarQuote && trimmed.endsWith(";")) {
      const stmt = current.trim();
      if (stmt.length > 1) statements.push(stmt);
      current = "";
    }
  }
  if (current.trim().length > 1) statements.push(current.trim());
  return statements;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sqlFilePath = path.join(process.cwd(), "lib", "migrations", "full_schema.sql");
    if (!fs.existsSync(sqlFilePath)) {
      return NextResponse.json({ error: "Migration file not found" }, { status: 500 });
    }

    const sqlText = fs.readFileSync(sqlFilePath, "utf-8");
    const statements = splitSqlStatements(sqlText);

    let applied = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const stmt of statements) {
      try {
        await db.execute(sql.raw(stmt));
        applied++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (
          msg.includes("already exists") ||
          msg.includes("does not exist") ||
          msg.includes("duplicate")
        ) {
          skipped++;
        } else {
          errors.push(msg.substring(0, 120));
        }
      }
    }

    console.log(`[DBMigrate] Applied: ${applied}, Skipped: ${skipped}, Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      total: statements.length,
      applied,
      skipped,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error("[DBMigrate] Fatal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 }
    );
  }
}
