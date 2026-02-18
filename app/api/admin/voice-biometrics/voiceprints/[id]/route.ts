import { db } from "@/lib/db";
import { voiceprints, voiceBiometricAttempts } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { id } = await params;
    const voiceprintId = parseInt(id);

    const [voiceprint] = await db
      .select()
      .from(voiceprints)
      .where(eq(voiceprints.id, voiceprintId))
      .limit(1);

    if (!voiceprint) {
      return NextResponse.json({ error: "Voiceprint not found" }, { status: 404 });
    }

    const attempts = await db
      .select()
      .from(voiceBiometricAttempts)
      .where(eq(voiceBiometricAttempts.voiceprintId, voiceprintId))
      .orderBy(desc(voiceBiometricAttempts.createdAt))
      .limit(50);

    return NextResponse.json({ ...voiceprint, recentAttempts: attempts });
  } catch (error) {
    console.error("Voiceprint GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const ALLOWED_FIELDS = ["status", "passphraseText", "qualityScore", "enrollmentSamples", "providerReferenceId"];
    const updateData: Record<string, any> = { lastUpdatedAt: new Date() };
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    const [updated] = await db
      .update(voiceprints)
      .set(updateData)
      .where(eq(voiceprints.id, parseInt(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Voiceprint not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Voiceprint PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { id } = await params;

    const [deleted] = await db
      .update(voiceprints)
      .set({
        status: "deleted",
        deletedAt: new Date(),
        providerReferenceId: null,
        passphraseText: null,
        lastUpdatedAt: new Date(),
      })
      .where(eq(voiceprints.id, parseInt(id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Voiceprint not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Voiceprint soft deleted (GDPR)" });
  } catch (error) {
    console.error("Voiceprint DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
