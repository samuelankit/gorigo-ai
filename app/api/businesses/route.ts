import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { db } from "@/lib/db";
import { orgs, orgMembers, agents, usageRecords, wallets, sessions } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

const createBusinessSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters").max(100),
  deploymentModel: z.enum(["managed", "byok", "self-hosted", "custom"]).default("managed"),
});

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const memberships = await db
      .select({
        orgId: orgMembers.orgId,
        role: orgMembers.role,
        orgName: orgs.name,
        deploymentModel: orgs.deploymentModel,
        createdAt: orgs.createdAt,
      })
      .from(orgMembers)
      .innerJoin(orgs, eq(orgMembers.orgId, orgs.id))
      .where(eq(orgMembers.userId, auth.user.id));

    const businesses = memberships.map((m) => ({
      id: m.orgId,
      name: m.orgName,
      role: m.role,
      deploymentModel: m.deploymentModel,
      createdAt: m.createdAt,
      isActive: m.orgId === auth.orgId,
    }));

    return NextResponse.json({ businesses });
  } catch (error) {
    return handleRouteError(error, "Businesses");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createBusinessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.errors }, { status: 400 });
    }

    const { name, deploymentModel } = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [newOrg] = await tx.insert(orgs).values({
        name,
        deploymentModel,
      }).returning();

      await tx.insert(orgMembers).values({
        orgId: newOrg.id,
        userId: auth.user.id,
        role: "OWNER",
      });

      await tx.insert(agents).values({
        userId: auth.user.id,
        orgId: newOrg.id,
      });

      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      await tx.insert(usageRecords).values({
        userId: auth.user.id,
        orgId: newOrg.id,
        month,
      });

      await tx.insert(wallets).values({
        orgId: newOrg.id,
        balance: "0",
      });

      if (auth.sessionId) {
        await tx.update(sessions)
          .set({ activeOrgId: newOrg.id })
          .where(eq(sessions.id, auth.sessionId));
      }

      return newOrg;
    });

    return NextResponse.json({
      business: {
        id: result.id,
        name: result.name,
        deploymentModel: result.deploymentModel,
        createdAt: result.createdAt,
        role: "OWNER",
        isActive: true,
      },
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Businesses");
  }
}
