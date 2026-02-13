import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import crypto from "crypto";
import { logAudit } from "@/lib/audit";
import { apiKeyLimiter } from "@/lib/rate-limit";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): { fullKey: string; prefix: string } {
  const prefix = "grg_" + crypto.randomBytes(4).toString("hex");
  const secret = crypto.randomBytes(24).toString("hex");
  const fullKey = `${prefix}_${secret}`;
  return { fullKey, prefix };
}

export async function GET(request: NextRequest) {
  try {
    const rl = await apiKeyLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        isRevoked: apiKeys.isRevoked,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.orgId, auth.orgId))
      .orderBy(desc(apiKeys.createdAt));

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("List API keys error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await apiKeyLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const { name, scopes, expiresInDays } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Key name is required" }, { status: 400 });
    }

    const existingKeys = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.orgId, auth.orgId), eq(apiKeys.isRevoked, false)));

    if (existingKeys.length >= 10) {
      return NextResponse.json({ error: "Maximum 10 active API keys per organization" }, { status: 400 });
    }

    const { fullKey, prefix } = generateApiKey();
    const keyHash = hashKey(fullKey);

    let expiresAt: Date | null = null;
    if (expiresInDays && typeof expiresInDays === "number" && expiresInDays > 0) {
      expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    }

    const [created] = await db
      .insert(apiKeys)
      .values({
        orgId: auth.orgId,
        userId: auth.user.id,
        name: name.trim(),
        keyPrefix: prefix,
        keyHash,
        scopes: Array.isArray(scopes) ? scopes : [],
        expiresAt,
      })
      .returning();

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "api_key_create",
        entityType: "api_key",
        entityId: created.id,
        details: { name: created.name, keyPrefix: created.keyPrefix },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({
      key: {
        id: created.id,
        name: created.name,
        keyPrefix: created.keyPrefix,
        scopes: created.scopes,
        expiresAt: created.expiresAt,
        createdAt: created.createdAt,
      },
      secretKey: fullKey,
    });
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
