import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const result = await db.execute(
      sql`SELECT key, value FROM platform_settings WHERE key LIKE 'seo_verification_%'`
    );
    const codes: Record<string, string> = {};
    for (const row of result.rows as any[]) {
      const engine = row.key.replace("seo_verification_", "");
      codes[engine] = row.value;
    }
    return NextResponse.json(codes);
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json();
    const { engine, code } = body;

    const validEngines = ["google", "bing", "yandex", "baidu", "pinterest"];
    if (!engine || !code || !validEngines.includes(engine)) {
      return NextResponse.json({ error: "Invalid engine or missing code" }, { status: 400 });
    }

    const sanitizedCode = String(code).trim().slice(0, 200);
    const key = `seo_verification_${engine}`;
    await db.execute(
      sql`INSERT INTO platform_settings (key, value) VALUES (${key}, ${sanitizedCode}) ON CONFLICT (key) DO UPDATE SET value = ${sanitizedCode}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save verification code" }, { status: 500 });
  }
}
