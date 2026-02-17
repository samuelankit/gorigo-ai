import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatLeads, chatMessages, leadActivities, publicConversations } from "@/shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { getAuthenticatedUser, requireReadAccess } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { enrichLead } from "@/lib/enrichment-engine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const readCheck = requireReadAccess(auth);
    if (!readCheck.allowed) return NextResponse.json({ error: readCheck.error }, { status: 403 });

    const { id } = await params;
    const leadId = parseInt(id);
    if (isNaN(leadId) || leadId <= 0) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const leadConditions = auth.orgId
      ? and(eq(chatLeads.id, leadId), eq(chatLeads.orgId, auth.orgId))
      : eq(chatLeads.id, leadId);

    const [lead] = await db
      .select()
      .from(chatLeads)
      .where(leadConditions)
      .limit(1);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.leadId, leadId))
      .orderBy(chatMessages.createdAt);

    const activities = await db
      .select()
      .from(leadActivities)
      .where(eq(leadActivities.leadId, leadId))
      .orderBy(desc(leadActivities.createdAt))
      .limit(50);

    const conversations = await db
      .select()
      .from(publicConversations)
      .where(eq(publicConversations.leadId, leadId))
      .orderBy(desc(publicConversations.startedAt));

    return NextResponse.json({ lead, messages, activities, conversations });
  } catch (error) {
    return handleRouteError(error, "AdminLeadDetail");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const readCheck = requireReadAccess(auth);
    if (!readCheck.allowed) return NextResponse.json({ error: readCheck.error }, { status: 403 });

    const { id } = await params;
    const leadId = parseInt(id);
    if (isNaN(leadId) || leadId <= 0) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const enrichConditions = auth.orgId
      ? and(eq(chatLeads.id, leadId), eq(chatLeads.orgId, auth.orgId))
      : eq(chatLeads.id, leadId);

    const [lead] = await db
      .select({ id: chatLeads.id })
      .from(chatLeads)
      .where(enrichConditions)
      .limit(1);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const result = await enrichLead(leadId);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "AdminLeadEnrich");
  }
}
