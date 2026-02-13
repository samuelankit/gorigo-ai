import { db } from "@/lib/db";
import { callLogs, orgs } from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";

export async function getActiveCalls(orgId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(callLogs)
    .where(and(
      eq(callLogs.orgId, orgId),
      sql`${callLogs.status} IN ('in-progress', 'ringing', 'initiating')`
    ));
  return Number(result?.count || 0);
}

export async function canStartCall(orgId: number): Promise<{ allowed: boolean; reason?: string; activeCalls?: number; maxCalls?: number }> {
  const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
  if (!org) return { allowed: false, reason: "Organization not found" };

  const maxConcurrent = org.maxConcurrentCalls || 5;
  const activeCalls = await getActiveCalls(orgId);

  if (activeCalls >= maxConcurrent) {
    return { 
      allowed: false, 
      reason: `Maximum concurrent calls reached (${activeCalls}/${maxConcurrent}). Please wait for active calls to complete.`,
      activeCalls,
      maxCalls: maxConcurrent,
    };
  }

  return { allowed: true, activeCalls, maxCalls: maxConcurrent };
}

export async function getMinCallBalance(orgId: number): Promise<number> {
  const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
  return Number(org?.minCallBalance) || 1.00;
}
