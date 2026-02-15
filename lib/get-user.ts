import { db } from "@/lib/db";
import { users, sessions, orgMembers, apiKeys } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getSessionCookie, hashToken } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";
import { hasScope } from "@/lib/api-key-auth";

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthResult {
  user: typeof users.$inferSelect;
  orgId: number | null;
  role: string | null;
  isDemo: boolean;
  globalRole: string;
  authMethod?: "session" | "api_key";
  apiKeyScopes?: string[];
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function authenticateViaApiKey(): Promise<AuthResult | null> {
  let headersList;
  try {
    headersList = await headers();
  } catch {
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
    .catch(() => {});

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

export async function getAuthenticatedUser(): Promise<AuthResult | null> {
  const token = await getSessionCookie();
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

  db.update(sessions)
    .set({ lastSeenAt: now })
    .where(eq(sessions.id, session.id))
    .execute()
    .catch(() => {});

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id))
    .limit(1);

  const orgId = membership?.orgId ?? null;
  const role = membership?.role ?? null;
  const isDemo = user.isDemo ?? false;
  const globalRole = user.globalRole ?? "CLIENT";

  return { user, orgId, role, isDemo, globalRole, authMethod: "session" };
}

export function requireWriteAccess(auth: { isDemo: boolean } | null) {
  if (!auth) return { allowed: false, error: "Not authenticated" };
  if (auth.isDemo) return { allowed: false, error: "Demo accounts cannot modify data" };
  return { allowed: true, error: null };
}

export function requireEmailVerified(auth: AuthResult | null): { allowed: boolean; error: string | null; status?: number } {
  if (!auth) return { allowed: false, error: "Not authenticated", status: 401 };
  if (auth.user.emailVerified === false) {
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
