import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, billingPlans, usageRecords, insertSubscriptionSchema } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.orgId, auth.orgId), eq(subscriptions.status, "active")))
      .limit(1);

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription" }, { status: 404 });
    }

    return NextResponse.json({ subscription }, { status: 200 });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const orgId = auth.orgId;

    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const parsed = insertSubscriptionSchema.safeParse({ ...body, userId: auth.user.id, orgId });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.errors }, { status: 400 });
    }

    const newSubscription = await db.transaction(async (tx) => {
      const existingSubs = await tx
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.orgId, orgId), eq(subscriptions.status, "active")));

      for (const sub of existingSubs) {
        await tx
          .update(subscriptions)
          .set({ status: "cancelled", endDate: new Date() })
          .where(eq(subscriptions.id, sub.id));
      }

      const [created] = await tx
        .insert(subscriptions)
        .values(parsed.data)
        .returning();

      const [plan] = await tx
        .select()
        .from(billingPlans)
        .where(eq(billingPlans.id, parsed.data.planId))
        .limit(1);

      if (plan) {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const [existingUsage] = await tx
          .select()
          .from(usageRecords)
          .where(and(eq(usageRecords.orgId, orgId), eq(usageRecords.month, month)))
          .limit(1);

        if (existingUsage) {
          await tx
            .update(usageRecords)
            .set({ minuteLimit: plan.minutesIncluded })
            .where(eq(usageRecords.id, existingUsage.id));
        } else {
          await tx.insert(usageRecords).values({
            userId: auth.user.id,
            orgId,
            month,
            minutesUsed: "0",
            minuteLimit: plan.minutesIncluded,
            callCount: 0,
            leadsCaptured: 0,
          });
        }
      }

      return created;
    });

    return NextResponse.json({ subscription: newSubscription }, { status: 201 });
  } catch (error) {
    console.error("Create subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
