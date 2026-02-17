import { NextRequest, NextResponse } from "next/server";

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.V1_ALLOWED_ORIGINS || "*";
  if (envOrigins === "*") return ["*"];
  return envOrigins.split(",").map((o) => o.trim()).filter(Boolean);
}

export function corsHeaders(request?: NextRequest): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  let origin = "*";

  if (allowedOrigins[0] !== "*" && request) {
    const requestOrigin = request.headers.get("origin") || "";
    if (allowedOrigins.includes(requestOrigin)) {
      origin = requestOrigin;
    } else {
      origin = allowedOrigins[0];
    }
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
    "Access-Control-Max-Age": "86400",
    ...(origin !== "*" ? { "Vary": "Origin" } : {}),
  };
}

export function withCors(response: NextResponse, request?: NextRequest): NextResponse {
  const headers = corsHeaders(request);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function corsOptionsResponse(request?: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
