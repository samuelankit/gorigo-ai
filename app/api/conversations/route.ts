import { NextRequest, NextResponse } from "next/server";
import { chatStorage } from "../../../replit_integrations/chat/storage";

export async function GET() {
  const convs = await chatStorage.getConversations();
  return NextResponse.json(convs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title } = body;
  if (!title || typeof title !== "string") {
    return NextResponse.json({ message: "title is required" }, { status: 400 });
  }
  const conv = await chatStorage.createConversation({ title });
  return NextResponse.json(conv, { status: 201 });
}
