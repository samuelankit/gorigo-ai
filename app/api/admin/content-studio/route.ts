import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { adminLimiter } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { industries, industryTemplates, voiceProfiles, templateVersions } from "@/shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await getAuthenticatedUser();
    if (!user || user.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "industries";

    if (tab === "industries") {
      const allIndustries = await db
        .select()
        .from(industries)
        .orderBy(asc(industries.displayOrder), asc(industries.name));

      return NextResponse.json({ industries: allIndustries });
    }

    if (tab === "templates") {
      const industryId = searchParams.get("industryId");
      const type = searchParams.get("type");

      if (!industryId) {
        return NextResponse.json({ error: "industryId is required" }, { status: 400 });
      }

      const conditions = [eq(industryTemplates.industryId, parseInt(industryId))];
      if (type) {
        conditions.push(eq(industryTemplates.templateType, type));
      }

      const templates = await db
        .select()
        .from(industryTemplates)
        .where(and(...conditions))
        .orderBy(desc(industryTemplates.updatedAt));

      return NextResponse.json({ templates });
    }

    if (tab === "voice-profiles") {
      const profiles = await db
        .select()
        .from(voiceProfiles)
        .orderBy(desc(voiceProfiles.isSystem), asc(voiceProfiles.name));

      return NextResponse.json({ voiceProfiles: profiles });
    }

    if (tab === "template") {
      const id = searchParams.get("id");
      if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }

      const [template] = await db
        .select()
        .from(industryTemplates)
        .where(eq(industryTemplates.id, parseInt(id)))
        .limit(1);

      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }

      const versions = await db
        .select()
        .from(templateVersions)
        .where(eq(templateVersions.templateId, template.id))
        .orderBy(desc(templateVersions.version));

      return NextResponse.json({ template, versions });
    }

    return NextResponse.json({ error: "Invalid tab parameter" }, { status: 400 });
  } catch (error: any) {
    return handleRouteError(error, "Content Studio");
  }
}
