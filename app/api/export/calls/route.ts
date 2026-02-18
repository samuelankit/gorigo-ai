import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { getAuthenticatedUser, requireApiKeyScope } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { exportLimiter } from "@/lib/rate-limit";
import { redactForDisplay } from "@/lib/pii-redaction";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await exportLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scopeCheck = requireApiKeyScope(auth, "export:read");
    if (!scopeCheck.allowed) {
      return NextResponse.json({ error: scopeCheck.error }, { status: scopeCheck.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    if (startDate && isNaN(Date.parse(startDate))) {
      return NextResponse.json({ error: "Invalid start date format. Use ISO 8601 (e.g. 2025-01-01)" }, { status: 400 });
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      return NextResponse.json({ error: "Invalid end date format. Use ISO 8601 (e.g. 2025-12-31)" }, { status: 400 });
    }

    const MAX_EXPORT_ROWS = 5000;
    const conditions = [eq(callLogs.orgId, auth.orgId)];
    if (startDate) {
      conditions.push(gte(callLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(callLogs.createdAt, new Date(endDate)));
    }

    const calls = await db
      .select()
      .from(callLogs)
      .where(and(...conditions))
      .orderBy(desc(callLogs.createdAt))
      .limit(MAX_EXPORT_ROWS + 1);

    const isTruncated = calls.length > MAX_EXPORT_ROWS;
    if (isTruncated) {
      calls.pop();
    }

    const headers = [
      "ID", "Date", "Direction", "Caller", "Duration (s)", "Status",
      "Sentiment", "Quality Score", "CSAT", "Resolution", "Cost",
      "Lead Captured", "Lead Name", "Lead Email", "Lead Phone",
      "Tags", "Notes", "Summary"
    ];

    const rows = calls.map((c) => [
      c.id,
      c.createdAt ? new Date(c.createdAt).toISOString() : "",
      c.direction,
      c.callerNumber ? redactForDisplay(c.callerNumber) : "",
      c.duration || 0,
      c.status || "",
      c.sentimentLabel || "",
      c.qualityScore ?? "",
      c.csatPrediction ?? "",
      c.resolutionStatus || "",
      c.callCost ?? "",
      c.leadCaptured ? "Yes" : "No",
      c.leadName ? redactForDisplay(c.leadName) : "",
      c.leadEmail ? redactForDisplay(c.leadEmail) : "",
      c.leadPhone ? redactForDisplay(c.leadPhone) : "",
      Array.isArray(c.tags) ? (c.tags as string[]).join("; ") : "",
      c.notes ? redactForDisplay(c.notes).replace(/"/g, '""') : "",
      c.summary ? redactForDisplay(c.summary).replace(/"/g, '""') : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((v) => {
          const s = String(v);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s}"`
            : s;
        }).join(",")
      ),
    ].join("\n");

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "export_calls",
        entityType: "call_log",
        details: { recordCount: calls.length, startDate, endDate },
      });
    } catch (error) {
      console.error("Log calls export audit failed:", error);
    }

    const responseHeaders: Record<string, string> = {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="calls_export_${new Date().toISOString().slice(0, 10)}.csv"`,
    };
    if (isTruncated) {
      responseHeaders["X-Export-Truncated"] = "true";
      responseHeaders["X-Export-Max-Rows"] = String(MAX_EXPORT_ROWS);
      responseHeaders["X-Export-Message"] = "Results truncated. Use date filters to narrow your export.";
    }

    return new NextResponse(csvContent, { status: 200, headers: responseHeaders });
  } catch (error) {
    return handleRouteError(error, "ExportCalls");
  }
}
