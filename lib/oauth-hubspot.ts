import crypto from "crypto";

const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";
const HUBSPOT_CONTACTS_API = "https://api.hubapi.com/crm/v3/objects/contacts";
const HUBSPOT_TOKEN_INFO_URL = "https://api.hubapi.com/oauth/v1/access-tokens";

const SCOPES = ["crm.objects.contacts.read"];

function getHmacKey(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required for OAuth state signing");
  }
  return secret;
}

function getClientId(): string {
  return process.env.HUBSPOT_CLIENT_ID || "";
}

function getClientSecret(): string {
  return process.env.HUBSPOT_CLIENT_SECRET || "";
}

function getRedirectUri(): string {
  const base = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.BASE_URL || "http://localhost:5000";
  return `${base}/api/oauth/hubspot/callback`;
}

export interface OAuthState {
  orgId: number;
  userId: number;
  returnUrl: string;
  timestamp: number;
  signature: string;
}

export function generateState(orgId: number, userId: number, returnUrl: string): string {
  const timestamp = Date.now();
  const payload = `hubspot:${orgId}:${userId}:${timestamp}:${returnUrl}`;
  const signature = crypto
    .createHmac("sha256", getHmacKey())
    .update(payload)
    .digest("hex");

  const state: OAuthState = { orgId, userId, returnUrl, timestamp, signature };
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

export function validateState(stateStr: string): OAuthState | null {
  try {
    const state: OAuthState = JSON.parse(Buffer.from(stateStr, "base64url").toString("utf8"));

    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - state.timestamp > tenMinutes) {
      return null;
    }

    const payload = `hubspot:${state.orgId}:${state.userId}:${state.timestamp}:${state.returnUrl}`;
    const expectedSignature = crypto
      .createHmac("sha256", getHmacKey())
      .update(payload)
      .digest("hex");

    if (state.signature !== expectedSignature) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

export function getAuthorizationUrl(orgId: number, userId: number, returnUrl: string): string {
  const state = generateState(orgId, userId, returnUrl);
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: SCOPES.join(" "),
    state,
  });
  return `${HUBSPOT_AUTH_URL}?${params.toString()}`;
}

export interface HubSpotTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  hubId: string;
  userEmail: string;
}

export async function exchangeCodeForTokens(code: string): Promise<HubSpotTokens> {
  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      code,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HubSpot token exchange failed: ${err}`);
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + (data.expires_in || 1800) * 1000);

  const tokenInfo = await getTokenInfo(data.access_token);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    hubId: tokenInfo.hubId || "",
    userEmail: tokenInfo.userEmail || "",
  };
}

async function getTokenInfo(accessToken: string): Promise<{ hubId: string; userEmail: string }> {
  try {
    const response = await fetch(`${HUBSPOT_TOKEN_INFO_URL}/${accessToken}`);
    if (response.ok) {
      const data = await response.json();
      return {
        hubId: String(data.hub_id || ""),
        userEmail: data.user || "",
      };
    }
  } catch {
    // fall through
  }
  return { hubId: "", userEmail: "" };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    if (err.includes("BAD_REFRESH_TOKEN") || err.includes("invalid")) {
      throw new Error("REVOKED");
    }
    throw new Error(`HubSpot token refresh failed: ${err}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in || 1800) * 1000),
  };
}

export async function revokeToken(refreshToken: string): Promise<void> {
  try {
    await fetch(HUBSPOT_TOKEN_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: refreshToken,
      }),
    });
  } catch {
    // best-effort
  }
}

export interface HubSpotContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
}

export async function listContacts(
  accessToken: string,
  options: { search?: string; after?: string; limit?: number } = {}
): Promise<{ contacts: HubSpotContact[]; hasMore: boolean; after: string | null; total: number }> {
  const limit = Math.min(options.limit || 100, 100);

  let url: string;
  let fetchOptions: RequestInit;

  if (options.search) {
    url = `${HUBSPOT_CONTACTS_API}/search`;
    fetchOptions = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [],
        query: options.search,
        limit,
        after: options.after || "0",
        properties: ["firstname", "lastname", "email", "phone", "company"],
      }),
    };
  } else {
    const params = new URLSearchParams({
      limit: String(limit),
      properties: "firstname,lastname,email,phone,company",
    });
    if (options.after) {
      params.set("after", options.after);
    }
    url = `${HUBSPOT_CONTACTS_API}?${params.toString()}`;
    fetchOptions = {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    };
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`Failed to list HubSpot contacts: ${response.statusText}`);
  }

  const data = await response.json();

  const contacts: HubSpotContact[] = (data.results || []).map((r: any) => ({
    id: r.id,
    firstName: r.properties?.firstname || "",
    lastName: r.properties?.lastname || "",
    email: r.properties?.email || "",
    phone: r.properties?.phone || "",
    company: r.properties?.company || "",
  }));

  return {
    contacts,
    hasMore: !!data.paging?.next?.after,
    after: data.paging?.next?.after || null,
    total: data.total || contacts.length,
  };
}

export function isTokenExpiringSoon(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return true;
  const expiry = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() > expiry.getTime() - fiveMinutes;
}
