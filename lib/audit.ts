import { db } from "@/lib/db";
import { auditLog } from "@/shared/schema";

export async function logAudit(params: {
  actorId?: number | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await db.insert(auditLog).values({
    actorId: params.actorId ?? undefined,
    actorEmail: params.actorEmail ?? undefined,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? undefined,
    details: params.details ?? undefined,
    ipAddress: params.ipAddress ?? undefined,
  });
}
