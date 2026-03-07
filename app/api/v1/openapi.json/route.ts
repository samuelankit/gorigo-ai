import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/v1-cors";
import { publicLimiter } from "@/lib/rate-limit";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "GoRigo AI Call Center API",
    description: "Access your GoRigo AI call center data from any LLM platform. View call history, check agent status, monitor wallet balance, and get analytics — all through natural conversation. Use your GoRigo API key to authenticate.",
    version: "1.0.0",
    contact: {
      name: "GoRigo Support",
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_APP_URL || "https://gorigo.ai",
      description: "GoRigo API Server",
    },
  ],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-Api-Key",
        description: "Your GoRigo API key. Create one from the API Keys section in your GoRigo dashboard. Keys start with 'grg_'.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", description: "Error message describing what went wrong" },
        },
      },
      Call: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Unique call identifier" },
          direction: { type: "string", enum: ["inbound", "outbound"], description: "Whether the call was incoming or outgoing" },
          status: { type: "string", description: "Current status of the call (e.g., completed, missed, in-progress)" },
          callerNumber: { type: "string", nullable: true, description: "Phone number of the caller" },
          duration: { type: "integer", nullable: true, description: "Call duration in seconds" },
          summary: { type: "string", nullable: true, description: "AI-generated summary of the call conversation" },
          sentimentLabel: { type: "string", nullable: true, description: "Overall sentiment detected (positive, negative, neutral)" },
          qualityScore: { type: "number", nullable: true, description: "AI quality score from 0 to 100" },
          createdAt: { type: "string", format: "date-time", description: "When the call occurred" },
        },
      },
      Agent: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Unique agent identifier" },
          name: { type: "string", description: "Name of the AI agent" },
          roles: { type: "string", nullable: true, description: "Agent role (e.g., receptionist, sales, support)" },
          greeting: { type: "string", nullable: true, description: "The greeting message the agent uses when answering calls" },
          inboundEnabled: { type: "boolean", description: "Whether the agent handles incoming calls" },
          outboundEnabled: { type: "boolean", description: "Whether the agent can make outgoing calls" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Wallet: {
        type: "object",
        properties: {
          balance: { type: "number", description: "Current wallet balance in the org's currency" },
          currency: { type: "string", description: "Currency code (e.g., GBP, USD)" },
          lowBalanceThreshold: { type: "number", nullable: true, description: "Balance threshold that triggers low balance alerts" },
          isActive: { type: "boolean", description: "Whether the wallet is active" },
        },
      },
      WalletTransaction: {
        type: "object",
        properties: {
          id: { type: "integer" },
          type: { type: "string", description: "Transaction type (credit, debit)" },
          amount: { type: "number", description: "Transaction amount" },
          balanceBefore: { type: "number" },
          balanceAfter: { type: "number" },
          description: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Account: {
        type: "object",
        properties: {
          orgId: { type: "integer", description: "Organization identifier" },
          orgName: { type: "string", description: "Organization name" },
          timezone: { type: "string", description: "Organization timezone" },
          currency: { type: "string", description: "Default currency" },
          maxConcurrentCalls: { type: "integer", description: "Maximum simultaneous calls allowed" },
          businessHours: { type: "object", nullable: true, description: "Configured business hours" },
        },
      },
      AnalyticsSummary: {
        type: "object",
        properties: {
          totalCalls: { type: "integer", description: "Total number of calls" },
          totalMinutes: { type: "number", description: "Total call minutes" },
          avgCallDuration: { type: "number", description: "Average call duration in seconds" },
          avgQualityScore: { type: "number", description: "Average AI quality score (0-100)" },
          avgSentimentScore: { type: "number", description: "Average sentiment score (-1 to 1)" },
          callsByDirection: {
            type: "array",
            items: {
              type: "object",
              properties: {
                direction: { type: "string" },
                count: { type: "integer" },
              },
            },
          },
          callsByOutcome: {
            type: "array",
            items: {
              type: "object",
              properties: {
                outcome: { type: "string" },
                count: { type: "integer" },
              },
            },
          },
          period: { type: "string", description: "Time period for the analytics" },
        },
      },
    },
  },
  paths: {
    "/api/v1/calls": {
      get: {
        operationId: "getCallHistory",
        summary: "Get call history",
        description: "Retrieve a paginated list of calls for your organization. You can filter by direction (inbound/outbound) and status. Returns call details including duration, AI-generated summaries, sentiment analysis, and quality scores. Use this to review recent calls, find specific conversations, or check call volumes.",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 }, description: "Number of calls to return (max 100)" },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 }, description: "Number of calls to skip for pagination" },
          { name: "direction", in: "query", schema: { type: "string", enum: ["inbound", "outbound"] }, description: "Filter by call direction" },
          { name: "status", in: "query", schema: { type: "string" }, description: "Filter by call status (e.g., completed, missed)" },
        ],
        responses: {
          "200": {
            description: "List of calls with pagination info",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    calls: { type: "array", items: { $ref: "#/components/schemas/Call" } },
                    total: { type: "integer", description: "Total number of matching calls" },
                    limit: { type: "integer" },
                    offset: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Insufficient scope", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/v1/agents": {
      get: {
        operationId: "getAgents",
        summary: "Get AI agents",
        description: "List all AI agents configured for your organization. Shows each agent's name, role, greeting message, and whether they handle inbound calls, outbound calls, or both. Use this to check your agent setup or see which agents are active.",
        responses: {
          "200": {
            description: "List of agents",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    agents: { type: "array", items: { $ref: "#/components/schemas/Agent" } },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated" },
          "403": { description: "Insufficient scope" },
        },
      },
    },
    "/api/v1/wallet": {
      get: {
        operationId: "getWalletBalance",
        summary: "Get wallet balance and recent transactions",
        description: "Check your organization's prepaid wallet balance and view the 10 most recent transactions. The wallet is used for pay-per-minute AI call billing. Use this to monitor your balance, see recent charges, or check if you need to top up.",
        responses: {
          "200": {
            description: "Wallet balance and recent transactions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    wallet: { $ref: "#/components/schemas/Wallet" },
                    recentTransactions: { type: "array", items: { $ref: "#/components/schemas/WalletTransaction" } },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated" },
          "403": { description: "Insufficient scope" },
        },
      },
    },
    "/api/v1/analytics": {
      get: {
        operationId: "getAnalyticsSummary",
        summary: "Get call analytics summary",
        description: "Get a comprehensive performance summary for your call center. Includes total calls, total minutes, average call duration, quality scores, sentiment analysis, and breakdowns by direction and outcome. Use this for performance reviews, reporting, or quick health checks on your call center operations.",
        responses: {
          "200": {
            description: "Analytics summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    analytics: { $ref: "#/components/schemas/AnalyticsSummary" },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated" },
          "403": { description: "Insufficient scope" },
        },
      },
    },
    "/api/v1/account": {
      get: {
        operationId: "getAccountInfo",
        summary: "Get account information",
        description: "Retrieve your organization's account details including name, timezone, currency, concurrent call limits, and business hours. Use this to verify your account settings or check your organization setup.",
        responses: {
          "200": {
            description: "Account information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    account: { $ref: "#/components/schemas/Account" },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated" },
        },
      },
    },
    "/api/v1/demo": {
      post: {
        operationId: "requestDemo",
        summary: "Request a GoRigo demo",
        description: "Submit a demo request to try GoRigo's AI call center platform. No authentication required. Provide your name and email, and optionally your company name, phone number, and a message about what you're looking for. Our team will reach out to schedule a personalized demo.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email"],
                properties: {
                  name: { type: "string", description: "Your full name" },
                  email: { type: "string", format: "email", description: "Your email address" },
                  company: { type: "string", description: "Your company or business name" },
                  phone: { type: "string", description: "Your phone number" },
                  message: { type: "string", description: "Tell us what you're looking for or any questions you have" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Demo request submitted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { description: "Validation error" },
        },
      },
    },
  },
};

export async function GET(request: NextRequest) {
  const rl = await publicLimiter(request);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const headers = corsHeaders(request);
  return NextResponse.json(OPENAPI_SPEC, {
    headers: {
      ...headers,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
