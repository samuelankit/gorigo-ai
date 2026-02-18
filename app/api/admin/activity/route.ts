import { db } from "@/lib/db";
import { auditLog, partners } from "@/shared/schema";
import { desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
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

    const recentAudit = await db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(10);

    const recentPartners = await db
      .select()
      .from(partners)
      .orderBy(desc(partners.createdAt))
      .limit(5);

    const feed = [
      ...recentAudit.map((entry) => ({
        type: "audit" as const,
        id: `audit-${entry.id}`,
        date: entry.createdAt,
        description: `${entry.actorEmail ?? "System"} performed ${entry.action} on ${entry.entityType}`,
        details: entry,
      })),
      ...recentPartners.map((partner) => ({
        type: "partner_registration" as const,
        id: `partner-${partner.id}`,
        date: partner.createdAt,
        description: `New partner registered: ${partner.name}`,
        details: partner,
      })),
    ].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ feed });
  } catch (error) {
    return handleRouteError(error, "AdminActivity");
  }
}
