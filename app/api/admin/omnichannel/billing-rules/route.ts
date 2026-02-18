import { db } from "@/lib/db";
import { channelBillingRules } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const rules = await db
      .select()
      .from(channelBillingRules)
      .orderBy(desc(channelBillingRules.createdAt))
      .limit(50);

    return NextResponse.json({ rules });
  } catch (error) {
    return handleRouteError(error, "OmnichannelBilling");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const body = await request.json();
    if (!body.channelType) {
      return NextResponse.json({ error: "channelType is required" }, { status: 400 });
    }
    const VALID_CHANNELS = ["whatsapp", "sms", "email", "web_chat"];
    if (!VALID_CHANNELS.includes(body.channelType)) {
      return NextResponse.json({ error: `Invalid channelType. Must be: ${VALID_CHANNELS.join(", ")}` }, { status: 400 });
    }

    const ruleData = {
      channelType: body.channelType,
      talkTimeEquivalentSeconds: body.talkTimeEquivalentSeconds,
      ratePerUnit: body.ratePerUnit,
      unitDescription: body.unitDescription,
      isActive: body.isActive ?? true,
    };

    const [existing] = await db
      .select()
      .from(channelBillingRules)
      .where(eq(channelBillingRules.channelType, body.channelType))
      .limit(1);

    let rule;
    if (existing) {
      [rule] = await db
        .update(channelBillingRules)
        .set(ruleData)
        .where(eq(channelBillingRules.id, existing.id))
        .returning();
    } else {
      [rule] = await db.insert(channelBillingRules).values(ruleData).returning();
    }

    return NextResponse.json(rule);
  } catch (error) {
    return handleRouteError(error, "OmnichannelBilling");
  }
}
