import { db } from "@/lib/db";
import { sessions, responseCache, knowledgeDocuments, jobs, publicConversations, rateLimits, passwordResetTokens, invitations } from "@/shared/schema";
import { lt, eq, and, sql, or, inArray } from "drizzle-orm";
import { retryFailedDistributions } from "@/lib/distribution";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Cleanup");

export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const absoluteCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const result = await db.delete(sessions).where(
    sql`${sessions.expiresAt} < ${now}
      OR (${sessions.lastSeenAt} IS NOT NULL AND ${sessions.lastSeenAt} < ${idleCutoff})
      OR (${sessions.createdAt} IS NOT NULL AND ${sessions.createdAt} < ${absoluteCutoff})`
  ).returning({ id: sessions.id });
  return result.length;
}

export async function cleanupExpiredCache(): Promise<number> {
  const result = await db.delete(responseCache).where(
    and(
      lt(responseCache.expiresAt, new Date()),
      sql`${responseCache.expiresAt} IS NOT NULL`
    )
  ).returning({ id: responseCache.id });
  return result.length;
}

export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await db.delete(rateLimits).where(
    lt(rateLimits.windowEnd, new Date())
  ).returning({ id: rateLimits.id });
  return result.length;
}

export async function cleanupExpiredPasswordResetTokens(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await db.delete(passwordResetTokens).where(
    or(
      lt(passwordResetTokens.expiresAt, new Date()),
      and(
        sql`${passwordResetTokens.usedAt} IS NOT NULL`,
        lt(passwordResetTokens.createdAt, cutoff)
      )
    )
  ).returning({ id: passwordResetTokens.id });
  return result.length;
}

export async function cleanupExpiredInvitations(): Promise<number> {
  const result = await db
    .update(invitations)
    .set({ status: "expired" })
    .where(
      and(
        eq(invitations.status, "pending"),
        lt(invitations.expiresAt, new Date())
      )
    )
    .returning({ id: invitations.id });
  return result.length;
}

export async function cleanupStaleJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = await db.delete(jobs).where(
    and(
      inArray(jobs.status, ["completed", "failed"]),
      lt(jobs.createdAt, cutoff)
    )
  ).returning({ id: jobs.id });
  return result.length;
}

export async function retryFailedDocuments(): Promise<number> {
  const failedDocs = await db
    .select({ id: knowledgeDocuments.id, orgId: knowledgeDocuments.orgId })
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.status, "error"))
    .limit(5);

  let retried = 0;
  for (const doc of failedDocs) {
    const existingJob = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.type, "DOCUMENT_PROCESS"),
          eq(jobs.status, "pending"),
          sql`${jobs.payload}->>'documentId' = ${String(doc.id)}`
        )
      )
      .limit(1);

    if (existingJob.length === 0) {
      await db.insert(jobs).values({
        type: "DOCUMENT_PROCESS",
        payload: { documentId: doc.id, orgId: doc.orgId },
        status: "pending",
        maxAttempts: 3,
      });
      retried++;
    }
  }
  return retried;
}

export async function cleanupStaleConversations(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const result = await db
    .update(publicConversations)
    .set({ status: "ended", endedAt: new Date() })
    .where(
      and(
        eq(publicConversations.status, "active"),
        lt(publicConversations.startedAt, cutoff)
      )
    )
    .returning({ id: publicConversations.id });
  return result.length;
}

interface CleanupResult {
  sessions: number;
  cache: number;
  rateLimits: number;
  passwordTokens: number;
  invitations: number;
  staleJobs: number;
  documents: number;
  distributions: { total: number; resolved: number };
  staleConversations: number;
}

export async function runAllCleanupJobs(): Promise<CleanupResult> {
  const [
    sessionsResult,
    cacheResult,
    rateLimitsResult,
    passwordTokensResult,
    invitationsResult,
    staleJobsResult,
    documentsResult,
    distributionsResult,
    staleConversationsResult,
  ] = await Promise.allSettled([
    cleanupExpiredSessions(),
    cleanupExpiredCache(),
    cleanupExpiredRateLimits(),
    cleanupExpiredPasswordResetTokens(),
    cleanupExpiredInvitations(),
    cleanupStaleJobs(),
    retryFailedDocuments(),
    retryFailedDistributions(),
    cleanupStaleConversations(),
  ]);

  return {
    sessions: sessionsResult.status === "fulfilled" ? sessionsResult.value : 0,
    cache: cacheResult.status === "fulfilled" ? cacheResult.value : 0,
    rateLimits: rateLimitsResult.status === "fulfilled" ? rateLimitsResult.value : 0,
    passwordTokens: passwordTokensResult.status === "fulfilled" ? passwordTokensResult.value : 0,
    invitations: invitationsResult.status === "fulfilled" ? invitationsResult.value : 0,
    staleJobs: staleJobsResult.status === "fulfilled" ? staleJobsResult.value : 0,
    documents: documentsResult.status === "fulfilled" ? documentsResult.value : 0,
    distributions: distributionsResult.status === "fulfilled" ? distributionsResult.value : { total: 0, resolved: 0 },
    staleConversations: staleConversationsResult.status === "fulfilled" ? staleConversationsResult.value : 0,
  };
}

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startPeriodicCleanup(intervalMs: number = 5 * 60 * 1000) {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(async () => {
    try {
      const result = await runAllCleanupJobs();
      const totalCleaned = result.sessions + result.cache + result.rateLimits +
        result.passwordTokens + result.invitations + result.staleJobs +
        result.documents + result.distributions.total + result.staleConversations;
      if (totalCleaned > 0) {
        logger.info("Cleanup completed", result as unknown as Record<string, unknown>);
      }
    } catch (err) {
      logger.error("Cleanup cycle failed", err);
    }
  }, intervalMs);
  (cleanupInterval as unknown as { unref?: () => void })?.unref?.();
}
