import { NextRequest, NextResponse } from "next/server";
import { chatStorage } from "../../../../replit_integrations/chat/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = await chatStorage.getConversation(Number(id));
  if (!conv) return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
  return NextResponse.json(conv);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await chatStorage.deleteConversation(Number(id));
  return new NextResponse(null, { status: 204 });
}
