import { NextRequest, NextResponse } from "next/server";
import { chatStorage } from "../../../../replit_integrations/chat/storage";
import { getAuthenticatedUser } from "@/lib/get-user";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const conv = await chatStorage.getConversation(Number(id));
  if (!conv) return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
  return NextResponse.json(conv);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  await chatStorage.deleteConversation(Number(id));
  return new NextResponse(null, { status: 204 });
}
