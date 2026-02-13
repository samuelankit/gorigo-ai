import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doNotCallList, consentRecords, orgs, callLogs } from "@/shared/schema";
import { eq, sql, and, desc, like, ilike, gte, lte, or } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAudit } from "@/lib/audit";

async function requireSuperAdmin() {
  const auth = await getAuthenticatedUser();
  if (!auth || auth.globalRole !== "SUPERADMIN") return null;
  return auth;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "overview";
    const search = searchParams.get("search") || "";
    const orgFilter = searchParams.get("orgId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    if (tab === "overview") {
      const [dncStats, consentStats, callComplianceStats] = await Promise.all([
        db.select({
          totalEntries: sql<number>`count(*)`,
          uniqueOrgs: sql<number>`count(distinct ${doNotCallList.orgId})`,
          recentAdded: sql<number>`count(*) filter (where ${doNotCallList.createdAt} >= ${sinceDate})`,
        }).from(doNotCallList),

        db.select({
          totalRecords: sql<number>`count(*)`,
          activeConsents: sql<number>`count(*) filter (where ${consentRecords.consentGiven} = true and ${consentRecords.revokedAt} is null)`,
          revokedConsents: sql<number>`count(*) filter (where ${consentRecords.revokedAt} is not null)`,
          recentRecords: sql<number>`count(*) filter (where ${consentRecords.createdAt} >= ${sinceDate})`,
        }).from(consentRecords),

        db.select({
          totalCalls: sql<number>`count(*)`,
          disclosurePlayed: sql<number>`count(*) filter (where ${callLogs.aiDisclosurePlayed} = true)`,
          recorded: sql<number>`count(*) filter (where ${callLogs.recordingUrl} is not null)`,
          qualityScored: sql<number>`count(*) filter (where ${callLogs.qualityScore} is not null)`,
          sentimentAnalysed: sql<number>`count(*) filter (where ${callLogs.sentimentLabel} is not null)`,
        }).from(callLogs).where(gte(callLogs.startedAt, sinceDate)),
      ]);

      const dncByOrg = await db
        .select({
          orgId: doNotCallList.orgId,
          orgName: orgs.name,
          entryCount: sql<number>`count(*)`,
        })
        .from(doNotCallList)
        .innerJoin(orgs, eq(orgs.id, doNotCallList.orgId))
        .groupBy(doNotCallList.orgId, orgs.name)
        .orderBy(sql`count(*) desc`)
        .limit(10);

      return NextResponse.json({
        dnc: dncStats[0],
        consent: consentStats[0],
        callCompliance: callComplianceStats[0],
        dncByOrg,
      });
    }

    if (tab === "dnc") {
      const conditions: any[] = [];

      if (search) {
        conditions.push(
          or(
            ilike(doNotCallList.phoneNumber, `%${search}%`),
            ilike(doNotCallList.reason, `%${search}%`)
          )
        );
      }

      if (orgFilter) {
        conditions.push(eq(doNotCallList.orgId, parseInt(orgFilter, 10)));
      }

      const [entries, countResult] = await Promise.all([
        db
          .select({
            id: doNotCallList.id,
            orgId: doNotCallList.orgId,
            phoneNumber: doNotCallList.phoneNumber,
            reason: doNotCallList.reason,
            source: doNotCallList.source,
            notes: doNotCallList.notes,
            expiresAt: doNotCallList.expiresAt,
            createdAt: doNotCallList.createdAt,
            orgName: orgs.name,
          })
          .from(doNotCallList)
          .innerJoin(orgs, eq(orgs.id, doNotCallList.orgId))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(doNotCallList.createdAt))
          .limit(limit)
          .offset(offset),

        db
          .select({ count: sql<number>`count(*)` })
          .from(doNotCallList)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ]);

      return NextResponse.json({ entries, total: Number(countResult[0]?.count || 0) });
    }

    if (tab === "consent") {
      const conditions: any[] = [];

      if (search) {
        conditions.push(
          or(
            ilike(consentRecords.phoneNumber, `%${search}%`),
            ilike(consentRecords.consentType, `%${search}%`)
          )
        );
      }

      if (orgFilter) {
        conditions.push(eq(consentRecords.orgId, parseInt(orgFilter, 10)));
      }

      const statusFilter = searchParams.get("status");
      if (statusFilter === "active") {
        conditions.push(eq(consentRecords.consentGiven, true));
        conditions.push(sql`${consentRecords.revokedAt} is null`);
      } else if (statusFilter === "revoked") {
        conditions.push(sql`${consentRecords.revokedAt} is not null`);
      }

      const [records, countResult] = await Promise.all([
        db
          .select({
            id: consentRecords.id,
            orgId: consentRecords.orgId,
            phoneNumber: consentRecords.phoneNumber,
            consentType: consentRecords.consentType,
            consentGiven: consentRecords.consentGiven,
            consentMethod: consentRecords.consentMethod,
            revokedAt: consentRecords.revokedAt,
            revokedReason: consentRecords.revokedReason,
            expiresAt: consentRecords.expiresAt,
            createdAt: consentRecords.createdAt,
            orgName: orgs.name,
          })
          .from(consentRecords)
          .innerJoin(orgs, eq(orgs.id, consentRecords.orgId))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(consentRecords.createdAt))
          .limit(limit)
          .offset(offset),

        db
          .select({ count: sql<number>`count(*)` })
          .from(consentRecords)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ]);

      return NextResponse.json({ records, total: Number(countResult[0]?.count || 0) });
    }

    return NextResponse.json({ error: "Invalid tab parameter" }, { status: 400 });
  } catch (error) {
    console.error("Admin compliance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await requireSuperAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") || "dnc";

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const entryId = parseInt(id, 10);
    if (isNaN(entryId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    if (type === "dnc") {
      const [deleted] = await db
        .delete(doNotCallList)
        .where(eq(doNotCallList.id, entryId))
        .returning();

      if (!deleted) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }

      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "admin.dnc_removed",
        entityType: "do_not_call_list",
        entityId: entryId,
        details: { phoneNumber: deleted.phoneNumber, orgId: deleted.orgId },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Admin compliance delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
