import { getAuthenticatedUser } from "@/lib/get-user";
import { getRAGStats } from "@/lib/rag";
import { NextRequest, NextResponse } from "next/server";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getRAGStats(auth.orgId);
    return NextResponse.json(stats);
  } catch (error) {
    return handleRouteError(error, "KnowledgeStats");
  }
}
