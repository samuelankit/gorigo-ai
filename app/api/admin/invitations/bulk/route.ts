import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations, users, orgMembers, departments, orgs } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { requireOrgRole } from "@/lib/permissions";
import { generalLimiter } from "@/lib/rate-limit";
import { sendInvitationEmail } from "@/lib/email";
import { z } from "zod";
import crypto from "crypto";
import { handleRouteError } from "@/lib/api-error";
import { logTeamActivity } from "@/lib/team-activity";

const bulkInviteItemSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  name: z.string().max(255).optional(),
  orgRole: z.enum(["ADMIN", "MANAGER", "AGENT", "VIEWER"]).default("AGENT"),
  departmentId: z.number().int().positive().optional().nullable(),
  departmentRole: z.enum(["MANAGER", "AGENT", "VIEWER"]).optional(),
});

const bulkInviteSchema = z.object({
  invites: z.array(bulkInviteItemSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    const perm = requireOrgRole(auth, "ADMIN");
    if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status || 403 });

    const body = await request.json();
    const parsed = bulkInviteSchema.parse(body);

    const orgId = auth!.orgId!;

    let orgName = "your organization";
    try {
      const [org] = await db.select({ name: orgs.name }).from(orgs).where(eq(orgs.id, orgId)).limit(1);
      if (org?.name) orgName = org.name;
    } catch {}

    const existingEmails = new Set<string>();
    const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
    const usersByEmail = new Map(allUsers.map(u => [u.email.toLowerCase(), u.id]));

    const orgMemberRows = await db.select({ userId: orgMembers.userId }).from(orgMembers).where(eq(orgMembers.orgId, orgId));
    const orgMemberUserIds = new Set(orgMemberRows.map(m => m.userId));

    const pendingInvites = await db.select({ email: invitations.email })
      .from(invitations)
      .where(and(eq(invitations.orgId, orgId), eq(invitations.status, "pending")));
    const pendingEmails = new Set(pendingInvites.map(i => i.email.toLowerCase()));

    const orgDepts = await db.select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.orgId, orgId));
    const validDeptIds = new Set(orgDepts.map(d => d.id));
    const deptNameMap = new Map(orgDepts.map(d => [d.id, d.name]));

    const results: { email: string; status: "sent" | "skipped"; reason?: string }[] = [];
    let sentCount = 0;
    let skippedCount = 0;

    const seenInBatch = new Set<string>();

    for (const invite of parsed.invites) {
      const email = invite.email.toLowerCase();

      if (seenInBatch.has(email)) {
        results.push({ email, status: "skipped", reason: "Duplicate in batch" });
        skippedCount++;
        continue;
      }
      seenInBatch.add(email);

      const existingUserId = usersByEmail.get(email);
      if (existingUserId && orgMemberUserIds.has(existingUserId)) {
        results.push({ email, status: "skipped", reason: "Already a member" });
        skippedCount++;
        continue;
      }

      if (pendingEmails.has(email)) {
        results.push({ email, status: "skipped", reason: "Pending invitation exists" });
        skippedCount++;
        continue;
      }

      if (invite.departmentId && !validDeptIds.has(invite.departmentId)) {
        results.push({ email, status: "skipped", reason: "Invalid department" });
        skippedCount++;
        continue;
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      try {
        await db.insert(invitations).values({
          orgId,
          email,
          token,
          orgRole: invite.orgRole,
          departmentId: invite.departmentId || null,
          departmentRole: invite.departmentRole || (invite.departmentId ? "AGENT" : null),
          invitedById: auth!.user.id,
          status: "pending",
          expiresAt,
        });

        const deptName = invite.departmentId ? deptNameMap.get(invite.departmentId) : undefined;

        setTimeout(() => {
          sendInvitationEmail(
            email,
            token,
            orgName,
            invite.orgRole,
            deptName || undefined,
            auth!.user.businessName || auth!.user.email
          ).catch((err) => console.error("[BulkInvite] Email send failed for", email, err));
        }, sentCount * 1000);

        pendingEmails.add(email);
        results.push({ email, status: "sent" });
        sentCount++;
      } catch (err) {
        results.push({ email, status: "skipped", reason: "Database error" });
        skippedCount++;
      }
    }

    if (sentCount > 0) {
      logTeamActivity(orgId, auth!.user.id, "member_bulk_invited", "member", undefined, { sent: sentCount, skipped: skippedCount, total: parsed.invites.length }).catch(() => {});
    }

    return NextResponse.json({
      sent: sentCount,
      skipped: skippedCount,
      total: parsed.invites.length,
      results,
    }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    return handleRouteError(err, "BulkInvitations");
  }
}
