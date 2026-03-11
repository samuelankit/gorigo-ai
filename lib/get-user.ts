import { db } from "@/lib/db";
import { users, sessions, orgMembers, apiKeys, orgs } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getSessionCookie, hashToken } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";
import { hasScope } from "@/lib/api-key-auth";

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;
const ROTATION_INTERVAL_MS = 15 * 60 * 1000;

export interface AuthResult {
  user: typeof users.$inferSelect;
  orgId: number | null;
  role: string | null;
  isDemo: boolean;
  globalRole: string;
  authMethod?: "session" | "api_key";
  apiKeyScopes?: string[];
  sessionId?: number;
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function authenticateViaApiKey(): Promise<AuthResult | null> {
  let headersList;
  try {
    headersList = await headers();
  } catch (error) {
    return null;
  }
  const apiKeyHeader = headersList.get("x-api-key");
  if (!apiKeyHeader) return null;

  const keyHash = hashApiKey(apiKeyHeader);

  const [keyRecord] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isRevoked, false)))
    .limit(1);

  if (!keyRecord) return null;

  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) return null;

  const [user] = await db.select().from(users).where(eq(users.id, keyRecord.userId)).limit(1);
  if (!user || user.deletedAt) return null;

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id))
    .limit(1);

  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRecord.id))
    .execute()
    .catch((error) => { console.error("Update API key lastUsedAt failed:", error); });

  return {
    user,
    orgId: keyRecord.orgId,
    role: membership?.role ?? null,
    isDemo: user.isDemo ?? false,
    globalRole: user.globalRole ?? "CLIENT",
    authMethod: "api_key",
    apiKeyScopes: (keyRecord.scopes as string[]) || [],
  };
}

async function getBearerToken(): Promise<string | null> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
  } catch (error) {
    console.error("Bearer token extraction failed:", error);
  }
  return null;
}

export async function getAuthenticatedUser(): Promise<AuthResult | null> {
  let token = await getSessionCookie();
  if (!token) {
    token = (await getBearerToken()) ?? undefined;
  }
  if (!token) {
    return authenticateViaApiKey();
  }

  const tokenHash = hashToken(token);
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, tokenHash))
    .limit(1);

  if (!session) return authenticateViaApiKey();

  const now = new Date();
  if (new Date(session.expiresAt) < now) return null;

  if (session.createdAt) {
    const absoluteExpiry = new Date(session.createdAt.getTime() + ABSOLUTE_TIMEOUT_MS);
    if (now > absoluteExpiry) return null;
  }

  if (session.lastSeenAt) {
    const idleExpiry = new Date(session.lastSeenAt.getTime() + IDLE_TIMEOUT_MS);
    if (now > idleExpiry) return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || user.deletedAt) return null;

  const updates: Record<string, unknown> = { lastSeenAt: now };

  const rotatedAt = session.rotatedAt || session.createdAt;
  if (rotatedAt && now.getTime() - rotatedAt.getTime() > ROTATION_INTERVAL_MS) {
    const newToken = crypto.randomBytes(32).toString("hex");
    const newTokenHash = hashToken(newToken);
    updates.token = newTokenHash;
    updates.rotatedAt = now;

    try {
      await db.update(sessions).set(updates).where(eq(sessions.id, session.id)).execute();
      const { setSessionCookie } = await import("@/lib/auth");
      await setSessionCookie(newToken);
    } catch (error) {
      console.error("Session token rotation failed:", error);
      db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, session.id)).execute().catch(() => {});
    }
  } else {
    db.update(sessions)
      .set(updates)
      .where(eq(sessions.id, session.id))
      .execute()
      .catch((error) => { console.error("Update session lastSeenAt failed:", error); });
  }

  let orgId: number | null = null;
  let role: string | null = null;

  if (session.activeOrgId) {
    const [activeMembership] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.userId, user.id), eq(orgMembers.orgId, session.activeOrgId)))
      .limit(1);
    if (activeMembership) {
      orgId = activeMembership.orgId;
      role = activeMembership.role;
    }
  }

  if (!orgId) {
    const [membership] = await db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, user.id))
      .limit(1);
    orgId = membership?.orgId ?? null;
    role = membership?.role ?? null;
  }

  const isDemo = user.isDemo ?? false;
  const globalRole = user.globalRole ?? "CLIENT";

  return { user, orgId, role, isDemo, globalRole, authMethod: "session", sessionId: session.id };
}

export function requireReadAccess(auth: { globalRole: string } | null) {
  if (!auth) return { allowed: false as const, error: "Not authenticated" };
  if (!["SUPERADMIN", "ADMIN", "CLIENT"].includes(auth.globalRole)) return { allowed: false as const, error: "Access denied" };
  return { allowed: true as const, error: null };
}

export function requireWriteAccess(auth: { isDemo: boolean } | null) {
  if (!auth) return { allowed: false, error: "Not authenticated" };
  if (auth.isDemo) return { allowed: false, error: "Demo accounts cannot modify data" };
  return { allowed: true, error: null };
}

export function requireEmailVerified(auth: AuthResult | null): { allowed: boolean; error: string | null; status?: number } {
  if (!auth) return { allowed: false, error: "Not authenticated", status: 401 };
  const smtpConfigured = !!(process.env.SMTP_HOST || process.env.SENDGRID_API_KEY || process.env.EMAIL_HOST);
  if (smtpConfigured && auth.user.emailVerified === false) {
    return { allowed: false, error: "Email verification required. Please verify your email address before using this feature.", status: 403 };
  }
  return { allowed: true, error: null };
}

export function requireSuperAdmin(auth: { globalRole: string } | null) {
  if (!auth) return { allowed: false, error: "Not authenticated" };
  if (auth.globalRole !== "SUPERADMIN") return { allowed: false, error: "Access denied" };
  return { allowed: true, error: null };
}

export function requireApiKeyScope(auth: AuthResult | null, scope: string): { allowed: boolean; error: string | null; status?: number } {
  if (!auth) return { allowed: false, error: "Not authenticated", status: 401 };
  if (auth.authMethod !== "api_key") return { allowed: true, error: null };

  const scopes = auth.apiKeyScopes || [];
  if (!hasScope(scopes, scope)) {
    return { allowed: false, error: `Insufficient API key scope. Required: ${scope}`, status: 403 };
  }
  return { allowed: true, error: null };
}

export async function getVerifiedUser(): Promise<AuthResult | null> {
  const auth = await getAuthenticatedUser();
  if (!auth) return null;
  const smtpConfigured = !!(process.env.SMTP_HOST || process.env.SENDGRID_API_KEY || process.env.EMAIL_HOST);
  if (smtpConfigured && auth.user.emailVerified === false) return null;
  return auth;
}

export function requirePasswordChanged(auth: AuthResult | null): { allowed: boolean; error: string | null; status?: number } {
  if (!auth) return { allowed: false, error: "Not authenticated", status: 401 };
  if (auth.user.mustChangePassword) {
    return { allowed: false, error: "Password change required. Please change your password before continuing.", status: 403 };
  }
  return { allowed: true, error: null };
}

export async function requireVerifiedAuth(): Promise<{ auth: AuthResult | null; error: Response | null }> {
  const { NextResponse } = await import("next/server");
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return { auth: null, error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (auth.user.mustChangePassword) {
    return {
      auth: null,
      error: NextResponse.json(
        { error: "Password change required. Please change your password before continuing.", code: "MUST_CHANGE_PASSWORD", mustChangePassword: true },
        { status: 403 }
      ),
    };
  }
  const smtpConfigured = !!(process.env.SMTP_HOST || process.env.SENDGRID_API_KEY || process.env.EMAIL_HOST);
  if (smtpConfigured && auth.user.emailVerified === false) {
    return {
      auth: null,
      error: NextResponse.json(
        { error: "Email verification required. Please verify your email address.", code: "EMAIL_NOT_VERIFIED" },
        { status: 403 }
      ),
    };
  }
  return { auth, error: null };
}

export async function requireOrgActive(orgId: number): Promise<{ allowed: boolean; error?: string; status?: number }> {
  const [org] = await db.select({ status: orgs.status }).from(orgs).where(eq(orgs.id, orgId)).limit(1);
  if (!org) {
    return { allowed: false, error: "Organisation not found.", status: 404 };
  }
  if (org.status === "suspended" || org.status === "terminated") {
    return { allowed: false, error: "Your organisation account is currently suspended. Please contact support.", status: 403 };
  }
  return { allowed: true };
}
