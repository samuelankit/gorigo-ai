import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations, users, orgMembers, departmentMembers } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { handleRouteError } from "@/lib/api-error";

const acceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  businessName: z.string().min(1).max(200).trim(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = acceptSchema.parse(body);

    const [inv] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.token, parsed.token), eq(invitations.status, "pending")))
      .limit(1);

    if (!inv) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }

    if (new Date(inv.expiresAt) < new Date()) {
      await db.update(invitations).set({ status: "expired" }).where(eq(invitations.id, inv.id));
      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 });
    }

    let [existingUser] = await db.select().from(users).where(eq(users.email, inv.email)).limit(1);

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(parsed.password, 12);
      [existingUser] = await db.insert(users).values({
        email: inv.email,
        password: passwordHash,
        businessName: parsed.businessName,
        globalRole: "CLIENT",
        emailVerified: true,
      }).returning();
    }

    const [existingMember] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.userId, existingUser.id), eq(orgMembers.orgId, inv.orgId)))
      .limit(1);

    if (!existingMember) {
      await db.insert(orgMembers).values({
        orgId: inv.orgId,
        userId: existingUser.id,
        role: inv.orgRole,
      });
    }

    if (inv.departmentId) {
      await db.insert(departmentMembers).values({
        departmentId: inv.departmentId,
        userId: existingUser.id,
        departmentRole: inv.departmentRole || "AGENT",
      }).onConflictDoNothing();
    }

    await db.update(invitations).set({
      status: "accepted",
      acceptedAt: new Date(),
    }).where(eq(invitations.id, inv.id));

    return NextResponse.json({
      success: true,
      message: "Invitation accepted. You can now log in.",
    });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    return handleRouteError(err, "AcceptInvitation");
  }
}
