import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doNotCallList } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireApiKeyScope } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { exportLimiter } from "@/lib/rate-limit";
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

    const MAX_EXPORT_ROWS = 10000;
    const records = await db
      .select()
      .from(doNotCallList)
      .where(eq(doNotCallList.orgId, auth.orgId))
      .orderBy(desc(doNotCallList.createdAt))
      .limit(MAX_EXPORT_ROWS + 1);

    const isTruncated = records.length > MAX_EXPORT_ROWS;
    if (isTruncated) {
      records.pop();
    }

    const headers = ["Phone Number", "Reason", "Source", "Notes", "Date Added", "Expires"];
    const rows = records.map((r) => [
      r.phoneNumber,
      r.reason || "",
      r.source || "",
      (r.notes || "").replace(/"/g, '""'),
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      r.expiresAt ? new Date(r.expiresAt).toISOString() : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((v) => {
          const s = String(v);
          return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
        }).join(",")
      ),
    ].join("\n");

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "export_dnc",
        entityType: "do_not_call_list",
        details: { recordCount: records.length },
      });
    } catch (error) {
      console.error("Log DNC export audit failed:", error);
    }

    const responseHeaders: Record<string, string> = {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="dnc_export_${new Date().toISOString().slice(0, 10)}.csv"`,
    };
    if (isTruncated) {
      responseHeaders["X-Export-Truncated"] = "true";
      responseHeaders["X-Export-Max-Rows"] = String(MAX_EXPORT_ROWS);
      responseHeaders["X-Export-Message"] = "Results truncated. Contact support or use the API for paginated access.";
    }

    return new NextResponse(csvContent, { status: 200, headers: responseHeaders });
  } catch (error) {
    return handleRouteError(error, "ExportDnc");
  }
}
