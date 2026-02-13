import { db } from "@/lib/db";
import { notifications } from "@/shared/schema";

type NotificationType =
  | "low_balance"
  | "spending_cap"
  | "call_failure"
  | "campaign_complete"
  | "webhook_failure"
  | "system"
  | "security";

interface CreateNotificationParams {
  userId: number;
  orgId?: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: params.userId,
        orgId: params.orgId ?? null,
        type: params.type,
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl ?? null,
        metadata: params.metadata ?? null,
      })
      .returning();
    return notification;
  } catch (error) {
    console.error("[Notifications] Failed to create notification:", error);
    return null;
  }
}

export async function createBulkNotifications(
  userIds: number[],
  params: Omit<CreateNotificationParams, "userId">
) {
  try {
    const values = userIds.map((userId) => ({
      userId,
      orgId: params.orgId ?? null,
      type: params.type,
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl ?? null,
      metadata: params.metadata ?? null,
    }));
    await db.insert(notifications).values(values);
  } catch (error) {
    console.error("[Notifications] Failed to create bulk notifications:", error);
  }
}
