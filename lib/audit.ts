import { db } from "@/lib/db";
import { auditLog } from "@/shared/schema";
import { headers } from "next/headers";

async function getRequestInfo(): Promise<{ ip: string; ua: string }> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const ua = h.get("user-agent") || "unknown";
    return { ip, ua };
  } catch {
    return { ip: "unknown", ua: "unknown" };
  }
}

export async function logAudit(params: {
  actorId?: number | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  try {
    const ip = params.ipAddress ?? (await getRequestInfo()).ip;
    await db.insert(auditLog).values({
      actorId: params.actorId ?? undefined,
      actorEmail: params.actorEmail ?? undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? undefined,
      details: params.details ?? undefined,
      ipAddress: ip,
    });
  } catch (error) {
    console.error("[Audit] Failed to write audit log:", error);
  }
}

export async function logAuthEvent(
  action: string,
  userId: number | null,
  email: string,
  details?: Record<string, unknown>
) {
  return logAudit({
    actorId: userId,
    actorEmail: email,
    action,
    entityType: "auth",
    details,
  });
}

export async function logSessionEvent(
  action: string,
  userId: number,
  details?: Record<string, unknown>
) {
  return logAudit({
    actorId: userId,
    action,
    entityType: "session",
    details,
  });
}

export async function logWalletEvent(
  action: string,
  userId: number,
  orgId: number,
  details?: Record<string, unknown>
) {
  return logAudit({
    actorId: userId,
    action,
    entityType: "wallet",
    entityId: orgId,
    details,
  });
}

export async function logPermissionEvent(
  action: string,
  userId: number,
  details?: Record<string, unknown>
) {
  return logAudit({
    actorId: userId,
    action,
    entityType: "permission",
    details,
  });
}

export async function logAdminEvent(
  action: string,
  userId: number,
  details?: Record<string, unknown>
) {
  return logAudit({
    actorId: userId,
    action,
    entityType: "admin",
    details,
  });
}
