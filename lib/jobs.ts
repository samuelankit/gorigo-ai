import { db } from "@/lib/db";
import { jobs, callLogs, billingLedger } from "@/shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { calculateCallCost } from "@/lib/billing";
import { generateCallSummary } from "@/lib/ai";
import { deductFromWallet } from "@/lib/wallet";

import { createLogger } from "@/lib/logger";

const jobLogger = createLogger("JobProcessor");

export type JobType = "POST_CALL_SUMMARY" | "LEDGER_POST" | "RETENTION_PURGE" | "AI_RETRY" | "DOCUMENT_PROCESS" | "CAMPAIGN_DIAL";

export async function createJob(type: JobType, payload: Record<string, unknown>, runAt?: Date) {
  const [job] = await db
    .insert(jobs)
    .values({
      type,
      payload,
      runAt: runAt || new Date(),
    })
    .returning();
  return job;
}

export async function processPostCallSummary(payload: { callLogId: number }) {
  const [log] = await db
    .select()
    .from(callLogs)
    .where(eq(callLogs.id, payload.callLogId))
    .limit(1);

  if (!log || !log.transcript) return { success: false, reason: "No transcript" };

  const summary = await generateCallSummary(log.transcript);

  await db
    .update(callLogs)
    .set({ summary })
    .where(eq(callLogs.id, log.id));

  return { success: true, summary };
}

export async function processLedgerPost(payload: {
  callLogId: number;
  orgId: number;
  ratePerMinute: number;
  provider?: string;
}) {
  const existing = await db
    .select()
    .from(billingLedger)
    .where(eq(billingLedger.callLogId, payload.callLogId))
    .limit(1);

  if (existing.length > 0) return { success: false, reason: "Ledger entry already exists" };

  const [log] = await db
    .select()
    .from(callLogs)
    .where(eq(callLogs.id, payload.callLogId))
    .limit(1);

  if (!log) return { success: false, reason: "Call log not found" };
  if (log.orgId !== payload.orgId) return { success: false, reason: "Org mismatch" };

  const connectedAt = log.startedAt;
  const endedAt = log.endedAt;
  const { billableSeconds, cost } = calculateCallCost(
    connectedAt,
    endedAt,
    payload.ratePerMinute
  );

  return await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(billingLedger)
      .values({
        orgId: payload.orgId,
        callLogId: payload.callLogId,
        providerCallId: log.providerCallId,
        startedAt: log.startedAt,
        connectedAt,
        endedAt,
        billableSeconds,
        ratePerMinute: String(payload.ratePerMinute),
        cost: String(cost),
        provider: payload.provider || "gorigo",
        status: "posted",
      })
      .returning();

    if (cost > 0) {
      try {
        await deductFromWallet(
          payload.orgId,
          cost,
          `Call charge: ${billableSeconds}s at ${payload.ratePerMinute}/min`,
          "call",
          String(entry.id)
        );
      } catch (walletError) {
        await tx
          .update(billingLedger)
          .set({ status: "unpaid" })
          .where(eq(billingLedger.id, entry.id));
        console.warn("Wallet deduction failed, ledger marked unpaid:", walletError);
      }
    }

    return { success: true, ledgerEntryId: entry.id, cost };
  });
}

export async function processRetentionPurge(payload: { retentionDays: number }) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - payload.retentionDays);

  const result = await db
    .update(callLogs)
    .set({ transcript: null, summary: null })
    .where(lt(callLogs.createdAt, cutoff));

  return { success: true, purgedBefore: cutoff.toISOString() };
}

export async function processPendingJobs() {
  const pendingJobs = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "pending"),
        lt(jobs.runAt, new Date())
      )
    )
    .limit(10);

  const results = [];

  for (const job of pendingJobs) {
    if ((job.attempts ?? 0) >= (job.maxAttempts ?? 3)) {
      await db.update(jobs).set({ status: "failed" }).where(eq(jobs.id, job.id));
      continue;
    }

    const [claimed] = await db
      .update(jobs)
      .set({ status: "running", attempts: (job.attempts ?? 0) + 1 })
      .where(and(eq(jobs.id, job.id), eq(jobs.status, "pending")))
      .returning({ id: jobs.id });

    if (!claimed) continue;

    try {
      let result: Record<string, unknown> = {};
      const p = job.payload as Record<string, unknown>;

      switch (job.type) {
        case "POST_CALL_SUMMARY":
          result = await processPostCallSummary(p as { callLogId: number });
          break;
        case "LEDGER_POST":
          result = await processLedgerPost(p as {
            callLogId: number;
            orgId: number;
            ratePerMinute: number;
            provider?: string;
          });
          break;
        case "RETENTION_PURGE":
          result = await processRetentionPurge(p as { retentionDays: number });
          break;
        case "AI_RETRY":
          result = { success: true, note: "AI retry placeholder" };
          break;
        case "DOCUMENT_PROCESS":
          const { processDocument } = await import("@/lib/rag");
          const docPayload = p as { documentId: number; orgId: number };
          await processDocument(docPayload.documentId, docPayload.orgId);
          result = { success: true, documentId: docPayload.documentId };
          break;
        case "CAMPAIGN_DIAL":
          const { dialCampaignContact } = await import("@/lib/campaign-executor");
          const dialPayload = p as { campaignId: number; contactId: number; orgId: number };
          result = await dialCampaignContact(dialPayload.campaignId, dialPayload.contactId, dialPayload.orgId);
          break;
        default:
          result = { success: false, reason: "Unknown job type" };
      }

      await db
        .update(jobs)
        .set({ status: "completed", result })
        .where(eq(jobs.id, job.id));

      results.push({ jobId: job.id, status: "completed", result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await db
        .update(jobs)
        .set({ status: "pending", result: { error: errorMessage } })
        .where(eq(jobs.id, job.id));

      results.push({ jobId: job.id, status: "retried", error: errorMessage });
    }
  }

  return results;
}

let jobProcessorRunning = false;
let jobProcessorIntervalId: ReturnType<typeof setInterval> | null = null;

export function startJobProcessor(intervalMs: number): void {
  if ((globalThis as any).__jobProcessorStarted) return;
  (globalThis as any).__jobProcessorStarted = true;

  const guardedRun = () => {
    if (jobProcessorRunning) return;
    jobProcessorRunning = true;
    processPendingJobs()
      .then((results) => {
        if (results.length > 0) {
          jobLogger.info(`Processed ${results.length} jobs`, { results: results.map(r => ({ id: r.jobId, status: r.status })) });
        }
      })
      .catch((err) => {
        jobLogger.error("Job processor cycle failed", err instanceof Error ? err : undefined);
      })
      .finally(() => {
        jobProcessorRunning = false;
      });
  };

  setTimeout(guardedRun, 10_000);
  jobProcessorIntervalId = setInterval(guardedRun, intervalMs);
}
