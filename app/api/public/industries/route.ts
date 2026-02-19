import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { industries } from "@/shared/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const activeIndustries = await db
      .select()
      .from(industries)
      .where(eq(industries.isActive, true))
      .orderBy(asc(industries.displayOrder), asc(industries.name));

    return NextResponse.json({ industries: activeIndustries });
  } catch (error: any) {
    return handleRouteError(error, "Industries");
  }
}
