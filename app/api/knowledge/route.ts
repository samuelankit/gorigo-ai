import { db } from "@/lib/db";
import { knowledgeDocuments, knowledgeChunks } from "@/shared/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { knowledgeLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";

const MAX_DOCUMENTS_PER_ORG = 100;

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.orgId, auth.orgId))
      .orderBy(desc(knowledgeDocuments.createdAt));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Get knowledge documents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await knowledgeLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.knowledge);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.isDemo) {
      return NextResponse.json({ error: "Demo accounts cannot add knowledge documents" }, { status: 403 });
    }

    const [{ value: docCount }] = await db
      .select({ value: count() })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.orgId, auth.orgId));

    if (docCount >= MAX_DOCUMENTS_PER_ORG) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_DOCUMENTS_PER_ORG} documents per organization. Please delete unused documents first.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, content, sourceType } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    if (content.length > 100000) {
      return NextResponse.json({ error: "Content exceeds maximum length (100,000 characters)" }, { status: 400 });
    }

    const [document] = await db
      .insert(knowledgeDocuments)
      .values({
        orgId: auth.orgId,
        title,
        content,
        sourceType: sourceType || "manual",
        status: "pending",
      })
      .returning();

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Create knowledge document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = await knowledgeLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.isDemo) {
      return NextResponse.json({ error: "Demo accounts cannot delete knowledge documents" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const id = parseInt(documentId);

    const [existing] = await db
      .select()
      .from(knowledgeDocuments)
      .where(and(eq(knowledgeDocuments.id, id), eq(knowledgeDocuments.orgId, auth.orgId)));

    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, id));
    await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete knowledge document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
