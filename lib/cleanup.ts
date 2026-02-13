import { db } from "@/lib/db";
import { sessions, responseCache, knowledgeDocuments, jobs } from "@/shared/schema";
import { lt, eq, and, sql } from "drizzle-orm";
import { retryFailedDistributions } from "@/lib/distribution";

export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const absoluteCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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

export async function runAllCleanupJobs(): Promise<{ sessions: number; cache: number; documents: number; distributions: { total: number; resolved: number } }> {
  const [sessions, cache, documents, distributions] = await Promise.allSettled([
    cleanupExpiredSessions(),
    cleanupExpiredCache(),
    retryFailedDocuments(),
    retryFailedDistributions(),
  ]);

  return {
    sessions: sessions.status === "fulfilled" ? sessions.value : 0,
    cache: cache.status === "fulfilled" ? cache.value : 0,
    documents: documents.status === "fulfilled" ? documents.value : 0,
    distributions: distributions.status === "fulfilled" ? distributions.value : { total: 0, resolved: 0 },
  };
}

let cleanupInterval: NodeJS.Timeout | null = null;

export function startPeriodicCleanup(intervalMs: number = 5 * 60 * 1000) {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(async () => {
    try {
      const result = await runAllCleanupJobs();
      if (result.sessions > 0 || result.cache > 0 || result.documents > 0 || result.distributions.total > 0) {
        console.log("[Cleanup]", JSON.stringify(result));
      }
    } catch (err) {
      console.error("[Cleanup] Error:", err);
    }
  }, intervalMs);
}
