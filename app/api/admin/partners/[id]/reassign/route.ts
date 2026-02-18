import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { partners, partnerClients, orgs, partnerLifecycleEvents } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin, requireEmailVerified } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const reassignSchema = z.object({
  targetPartnerId: z.number().int().positive().nullable(),
  clientOrgIds: z.array(z.number().int().positive()).min(1),
  rateStrategy: z.enum(["keep_current", "apply_new_partner", "apply_d2c_default"]).default("keep_current"),
  d2cRatePerMinute: z.number().min(0).max(10).optional(),
  notifyClients: z.boolean().default(true),
  reason: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const emailCheck = requireEmailVerified(auth);
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: emailCheck.status || 403 });
    }

    const { id } = await params;
    const sourcePartnerId = parseInt(id, 10);
    if (isNaN(sourcePartnerId)) {
      return NextResponse.json({ error: "Invalid partner ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = reassignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const { targetPartnerId, clientOrgIds, rateStrategy, d2cRatePerMinute, reason } = parsed.data;

    const [sourcePartner] = await db.select().from(partners).where(eq(partners.id, sourcePartnerId)).limit(1);
    if (!sourcePartner) {
      return NextResponse.json({ error: "Source partner not found" }, { status: 404 });
    }

    let targetPartner = null;
    if (targetPartnerId) {
      const [tp] = await db.select().from(partners).where(eq(partners.id, targetPartnerId)).limit(1);
      if (!tp) return NextResponse.json({ error: "Target partner not found" }, { status: 404 });
      if (tp.status !== "active") return NextResponse.json({ error: "Target partner must be active" }, { status: 400 });
      targetPartner = tp;
    }

    const results: Array<{ orgId: number; orgName: string; status: string; previousRate: string | null; newRate: string | null }> = [];
    const errors: string[] = [];

    for (const orgId of clientOrgIds) {
      try {
        const [clientLink] = await db
          .select()
          .from(partnerClients)
          .where(and(eq(partnerClients.partnerId, sourcePartnerId), eq(partnerClients.orgId, orgId)))
          .limit(1);

        if (!clientLink) {
          errors.push(`Org ${orgId} is not a client of partner ${sourcePartnerId}`);
          continue;
        }

        const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
        if (!org) {
          errors.push(`Org ${orgId} not found`);
          continue;
        }

        let newRate: string | null = clientLink.retailRatePerMinute;

        if (rateStrategy === "apply_new_partner" && targetPartner) {
          newRate = targetPartner.wholesaleRatePerMinute;
        } else if (rateStrategy === "apply_d2c_default") {
          newRate = d2cRatePerMinute ? String(d2cRatePerMinute) : "0.20";
        }

        if (targetPartnerId) {
          await db
            .update(partnerClients)
            .set({
              partnerId: targetPartnerId,
              retailRatePerMinute: newRate,
              status: "active",
              notes: `Reassigned from partner ${sourcePartner.name} (ID: ${sourcePartnerId}). Reason: ${reason}. Previous rate: ${clientLink.retailRatePerMinute}`,
            })
            .where(eq(partnerClients.id, clientLink.id));

          await db
            .update(orgs)
            .set({
              channelType: targetPartner!.partnerType === "business_partner" ? "partner" : "reseller",
              status: "active",
              suspendedAt: null,
              suspendedReason: null,
            })
            .where(eq(orgs.id, orgId));
        } else {
          await db
            .update(partnerClients)
            .set({
              status: "reassigned_d2c",
              notes: `Reassigned to D2C from partner ${sourcePartner.name} (ID: ${sourcePartnerId}). Reason: ${reason}`,
            })
            .where(eq(partnerClients.id, clientLink.id));

          await db
            .update(orgs)
            .set({
              channelType: "d2c",
              status: "active",
              suspendedAt: null,
              suspendedReason: null,
            })
            .where(eq(orgs.id, orgId));
        }

        results.push({
          orgId,
          orgName: org.name,
          status: "reassigned",
          previousRate: clientLink.retailRatePerMinute,
          newRate,
        });
      } catch (err) {
        errors.push(`Failed to reassign org ${orgId}: ${String(err)}`);
      }
    }

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "partner.clients_reassigned",
      entityType: "partner",
      entityId: sourcePartnerId,
      details: {
        targetPartnerId,
        targetPartnerName: targetPartner?.name || "D2C (Direct)",
        clientsReassigned: results.length,
        rateStrategy,
        reason,
        results,
        errors,
      },
    });

    await db.insert(partnerLifecycleEvents).values({
      partnerId: sourcePartnerId,
      eventType: "clients_reassigned",
      fromStatus: sourcePartner.status,
      toStatus: sourcePartner.status,
      reason,
      initiatedBy: auth!.user.id,
      affectedClients: results.length,
      metadata: {
        targetPartnerId,
        targetPartnerName: targetPartner?.name || "D2C",
        rateStrategy,
        results,
        errors,
      },
    });

    return NextResponse.json({
      ok: true,
      reassigned: results.length,
      failed: errors.length,
      results,
      errors,
      message: `Reassigned ${results.length} client(s) to ${targetPartner?.name || "D2C"}. ${errors.length} error(s).`,
    });
  } catch (error) {
    return handleRouteError(error, "PartnerReassign");
  }
}
