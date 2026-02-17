import { NextRequest, NextResponse } from "next/server";
import { chatStorage } from "../../../replit_integrations/chat/storage";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().min(1),
}).strict();

export async function GET(request: NextRequest) {
  const rl = await settingsLimiter(request);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const convs = await chatStorage.getConversations();
  return NextResponse.json(convs);
}

export async function POST(req: NextRequest) {
  const rl = await settingsLimiter(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = bodySchema.parse(body);
  const conv = await chatStorage.createConversation({ title: parsed.title });
  return NextResponse.json(conv, { status: 201 });
}
