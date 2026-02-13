import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MAX_BODY_SIZE = 1024 * 1024; // 1MB

export function checkBodySize(
  request: NextRequest,
  maxBytes: number = DEFAULT_MAX_BODY_SIZE
): NextResponse | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 }
    );
  }
  return null;
}

export const BODY_LIMITS = {
  auth: 10 * 1024,           // 10KB for login/register
  chat: 100 * 1024,          // 100KB for AI chat
  knowledge: 5 * 1024 * 1024, // 5MB for knowledge documents
  admin: 50 * 1024,           // 50KB for admin operations
  settings: 50 * 1024,        // 50KB for settings
} as const;
