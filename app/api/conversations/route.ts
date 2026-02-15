import { NextRequest, NextResponse } from "next/server";
import { chatStorage } from "../../../replit_integrations/chat/storage";
import { getAuthenticatedUser } from "@/lib/get-user";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const convs = await chatStorage.getConversations();
  return NextResponse.json(convs);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const { title } = body;
  if (!title || typeof title !== "string") {
    return NextResponse.json({ message: "title is required" }, { status: 400 });
  }
  const conv = await chatStorage.createConversation({ title });
  return NextResponse.json(conv, { status: 201 });
}
