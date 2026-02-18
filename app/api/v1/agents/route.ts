import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireApiKeyScope } from "@/lib/get-user";
import { apiKeyLimiter } from "@/lib/rate-limit";
import { withCors, corsOptionsResponse } from "@/lib/v1-cors";
import { handleRouteError } from "@/lib/api-error";

export async function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const rl = await apiKeyLimiter(request);
    if (!rl.allowed) {
      return withCors(NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 }), request);
    }

    const auth = await getAuthenticatedUser();
    if (!auth) return withCors(NextResponse.json({ error: "Not authenticated. Provide a valid API key via X-Api-Key header." }, { status: 401 }), request);
    if (!auth.orgId) return withCors(NextResponse.json({ error: "No organization found" }, { status: 404 }), request);
    const scopeCheck = requireApiKeyScope(auth, "agents:read");
    if (!scopeCheck.allowed) return withCors(NextResponse.json({ error: scopeCheck.error }, { status: scopeCheck.status || 403 }), request);

    const agentList = await db
      .select({
        id: agents.id,
        name: agents.name,
        roles: agents.roles,
        greeting: agents.greeting,
        inboundEnabled: agents.inboundEnabled,
        outboundEnabled: agents.outboundEnabled,
        createdAt: agents.createdAt,
        updatedAt: agents.updatedAt,
      })
      .from(agents)
      .where(eq(agents.orgId, auth.orgId));

    return withCors(NextResponse.json({ agents: agentList }, { status: 200 }), request);
  } catch (error) {
    return handleRouteError(error, "V1Agents");
  }
}
