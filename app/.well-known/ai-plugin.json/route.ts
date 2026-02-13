import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  const headersList = await headers();
  const host = headersList.get("host") || "gorigo.replit.app";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  const manifest = {
    schema_version: "v1",
    name_for_human: "GoRigo AI Call Center",
    name_for_model: "gorigo",
    description_for_human: "Manage your AI call center — view calls, check agents, monitor wallet balance, and get analytics without leaving ChatGPT.",
    description_for_model: "GoRigo is an AI-powered call center platform. Use this plugin to help users manage their call center operations. You can retrieve call history with summaries and sentiment analysis, check AI agent configurations and status, view prepaid wallet balance and transaction history, get analytics on call volumes and performance, and view account settings. All data is scoped to the authenticated user's organization. For unauthenticated users who want to try GoRigo, use the demo endpoint to capture their contact information.",
    auth: {
      type: "service_http",
      authorization_type: "custom",
      custom_auth_header: "X-Api-Key",
      verification_tokens: {},
    },
    api: {
      type: "openapi",
      url: `${baseUrl}/api/v1/openapi.json`,
    },
    logo_url: `${baseUrl}/favicon.ico`,
    contact_email: "support@gorigo.ai",
    legal_info_url: `${baseUrl}/terms`,
  };

  return NextResponse.json(manifest, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
