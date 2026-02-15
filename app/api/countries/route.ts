import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countries, insertCountrySchema } from "@/shared/schema";
import { asc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";

export async function GET() {
  try {
    const result = await db
      .select()
      .from(countries)
      .orderBy(asc(countries.name));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Countries list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const data = insertCountrySchema.parse(body);

    const [country] = await db.insert(countries).values(data).returning();
    return NextResponse.json(country, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Country create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
