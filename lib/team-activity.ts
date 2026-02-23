import { db } from "@/lib/db";
import { teamActivityLog, orgs } from "@/shared/schema";
import { eq, lt } from "drizzle-orm";

export type TeamAction =
  | "agent_created"
  | "agent_updated"
  | "agent_deleted"
  | "agent_visibility_changed"
  | "knowledge_uploaded"
  | "knowledge_deleted"
  | "campaign_created"
  | "campaign_started"
  | "campaign_paused"
  | "member_invited"
  | "member_bulk_invited"
  | "member_removed"
  | "member_role_changed"
  | "department_created"
  | "department_updated"
  | "department_budget_set"
  | "department_budget_exceeded"
  | "settings_updated"
  | "wallet_topped_up";

export async function logTeamActivity(
  orgId: number,
  userId: number,
  action: TeamAction,
  entityType?: string,
  entityId?: number,
  details?: Record<string, any>,
  ipAddress?: string,
) {
  try {
    const [org] = await db
      .select({ deploymentModel: orgs.deploymentModel })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!org || (org.deploymentModel !== "team" && org.deploymentModel !== "custom")) {
      return;
    }

    await db.insert(teamActivityLog).values({
      orgId,
      userId,
      action,
      entityType: entityType || null,
      entityId: entityId || null,
      details: details || null,
      ipAddress: ipAddress || null,
    });
  } catch (err) {
    console.error("[TeamActivity] Failed to log activity:", err instanceof Error ? err.message : err);
  }
}

export async function cleanupOldActivityLogs() {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    await db
      .delete(teamActivityLog)
      .where(lt(teamActivityLog.createdAt, ninetyDaysAgo));
  } catch (err) {
    console.error("[TeamActivity] Cleanup failed:", err instanceof Error ? err.message : err);
  }
}
