import { getAuthenticatedUser } from "@/lib/get-user";
import { getRAGStats } from "@/lib/rag";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getRAGStats(auth.orgId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Knowledge stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
