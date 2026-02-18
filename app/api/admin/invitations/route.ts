import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations, users, departments, orgMembers, departmentMembers } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { requireOrgRole } from "@/lib/permissions";
import { generalLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import crypto from "crypto";

const createInviteSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  orgRole: z.enum(["ADMIN", "MANAGER", "AGENT", "VIEWER"]).default("AGENT"),
  departmentId: z.number().int().positive().optional(),
  departmentRole: z.enum(["MANAGER", "AGENT", "VIEWER"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    const perm = requireOrgRole(auth, "MANAGER");
    if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status || 403 });

    const rows = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        orgRole: invitations.orgRole,
        departmentId: invitations.departmentId,
        departmentRole: invitations.departmentRole,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
      })
      .from(invitations)
      .where(eq(invitations.orgId, auth!.orgId!))
      .orderBy(desc(invitations.createdAt))
      .limit(100);

    const enriched = await Promise.all(rows.map(async (inv) => {
      let departmentName = null;
      if (inv.departmentId) {
        const [dept] = await db.select({ name: departments.name }).from(departments).where(eq(departments.id, inv.departmentId)).limit(1);
        departmentName = dept?.name || null;
      }
      return { ...inv, departmentName };
    }));

    return NextResponse.json({ invitations: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    const perm = requireOrgRole(auth, "ADMIN");
    if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status || 403 });

    const body = await request.json();
    const parsed = createInviteSchema.parse(body);

    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.email)).limit(1);
    if (existingUser) {
      const [existingMember] = await db
        .select()
        .from(orgMembers)
        .where(and(eq(orgMembers.userId, existingUser.id), eq(orgMembers.orgId, auth!.orgId!)))
        .limit(1);
      if (existingMember) {
        return NextResponse.json({ error: "User is already a member of this organization" }, { status: 409 });
      }
    }

    const [pendingInvite] = await db
      .select()
      .from(invitations)
      .where(and(
        eq(invitations.orgId, auth!.orgId!),
        eq(invitations.email, parsed.email),
        eq(invitations.status, "pending"),
      ))
      .limit(1);
    if (pendingInvite) {
      return NextResponse.json({ error: "A pending invitation already exists for this email" }, { status: 409 });
    }

    if (parsed.departmentId) {
      const [dept] = await db.select().from(departments).where(and(eq(departments.id, parsed.departmentId), eq(departments.orgId, auth!.orgId!))).limit(1);
      if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [inv] = await db.insert(invitations).values({
      orgId: auth!.orgId!,
      email: parsed.email,
      token,
      orgRole: parsed.orgRole,
      departmentId: parsed.departmentId || null,
      departmentRole: parsed.departmentRole || (parsed.departmentId ? "AGENT" : null),
      invitedById: auth!.user.id,
      status: "pending",
      expiresAt,
    }).returning();

    return NextResponse.json({
      invitation: inv,
      inviteLink: `/invite/${token}`,
    }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const perm = requireOrgRole(auth, "ADMIN");
    if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status || 403 });

    const url = new URL(request.url);
    const invId = url.searchParams.get("id");
    if (!invId) return NextResponse.json({ error: "id query param required" }, { status: 400 });

    await db
      .update(invitations)
      .set({ status: "revoked" })
      .where(and(eq(invitations.id, parseInt(invId)), eq(invitations.orgId, auth!.orgId!)));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
