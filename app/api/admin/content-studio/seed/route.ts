import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { adminLimiter } from "@/lib/rate-limit";
import { seedContentStudio } from "@/scripts/seed-content-studio";

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await getAuthenticatedUser();
    if (!user || user.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await seedContentStudio();
    return NextResponse.json(result);
  } catch (error: any) {
    return handleRouteError(error, "Content Studio Seed");
  }
}
