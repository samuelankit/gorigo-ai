import crypto from "crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3/files";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function getHmacKey(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required for OAuth state signing");
  }
  return secret;
}

function getClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || "";
}

function getClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || "";
}

function getRedirectUri(): string {
  const base = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.BASE_URL || "http://localhost:5000";
  return `${base}/api/oauth/google/callback`;
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
  const payload = `${orgId}:${userId}:${timestamp}:${returnUrl}`;
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

    const payload = `${state.orgId}:${state.userId}:${state.timestamp}:${state.returnUrl}`;
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
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  email: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = await response.json();

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

  const email = await fetchUserEmail(data.access_token);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt,
    email,
  };
}

async function fetchUserEmail(accessToken: string): Promise<string> {
  try {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      return data.email || "";
    }
  } catch {
    // fall through
  }
  return "";
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    if (err.includes("invalid_grant")) {
      throw new Error("REVOKED");
    }
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
  };
}

export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch(`${GOOGLE_REVOKE_URL}?token=${token}`, { method: "POST" });
  } catch {
    // best-effort revocation
  }
}

export async function listSpreadsheets(accessToken: string): Promise<Array<{ id: string; name: string; modifiedTime: string }>> {
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet'",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "50",
  });

  const response = await fetch(`${GOOGLE_DRIVE_API}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to list spreadsheets: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
  }));
}

export async function getSpreadsheetPreview(
  accessToken: string,
  spreadsheetId: string,
  sheetName?: string
): Promise<{ headers: string[]; rows: string[][]; sheetNames: string[] }> {
  const metaResponse = await fetch(
    `${GOOGLE_SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!metaResponse.ok) {
    throw new Error(`Failed to fetch spreadsheet metadata: ${metaResponse.statusText}`);
  }

  const metaData = await metaResponse.json();
  const sheetNames: string[] = (metaData.sheets || []).map((s: any) => s.properties.title);

  const targetSheet = sheetName || sheetNames[0] || "Sheet1";
  const range = `'${targetSheet}'!A1:Z11`;

  const dataResponse = await fetch(
    `${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!dataResponse.ok) {
    throw new Error(`Failed to fetch spreadsheet data: ${dataResponse.statusText}`);
  }

  const sheetData = await dataResponse.json();
  const values: string[][] = sheetData.values || [];

  const headers = values.length > 0 ? values[0] : [];
  const rows = values.slice(1, 11);

  return { headers, rows, sheetNames };
}

export async function getSpreadsheetAllRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<{ headers: string[]; rows: string[][] }> {
  const range = `'${sheetName}'!A:Z`;

  const response = await fetch(
    `${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch spreadsheet data: ${response.statusText}`);
  }

  const data = await response.json();
  const values: string[][] = data.values || [];

  const headers = values.length > 0 ? values[0] : [];
  const rows = values.slice(1);

  return { headers, rows };
}

export function isTokenExpiringSoon(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return true;
  const expiry = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() > expiry.getTime() - fiveMinutes;
}
