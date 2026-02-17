import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatLeads } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireReadAccess } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const readCheck = requireReadAccess(auth);
    if (!readCheck.allowed) return NextResponse.json({ error: readCheck.error }, { status: 403 });

    const leads = await db
      .select()
      .from(chatLeads)
      .where(auth.orgId ? eq(chatLeads.orgId, auth.orgId) : undefined)
      .orderBy(desc(chatLeads.createdAt))
      .limit(10000);

    const headers = ["ID", "Name", "Email", "Phone", "Company", "Industry", "Stage", "Score", "Source", "Tags", "Created"];
    const rows = leads.map((l) => [
      l.id,
      `"${(l.name || "").replace(/"/g, '""')}"`,
      `"${(l.email || "").replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${(l.company || "").replace(/"/g, '""')}"`,
      `"${(l.industry || "").replace(/"/g, '""')}"`,
      l.pipelineStage || "new",
      l.leadScore || 0,
      l.sourceChannel || "chatbot",
      `"${(l.tags || []).join(", ")}"`,
      l.createdAt ? new Date(l.createdAt).toISOString() : "",
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=gorigo-leads-${new Date().toISOString().split("T")[0]}.csv`,
      },
    });
  } catch (error) {
    return handleRouteError(error, "AdminLeadsExport");
  }
}
