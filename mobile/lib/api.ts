import { getToken, saveToken, removeToken, saveBrandingData, loadBrandingData, clearBrandingData } from "./secure-store";

const API_BASE = __DEV__ ? "http://localhost:5000" : "https://gorigo.ai";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

let _onAuthExpired: (() => void) | null = null;
export function setOnAuthExpired(callback: () => void) {
  _onAuthExpired = callback;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Type": "mobile",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function fetchWithTimeout(url: string, config: RequestInit, timeoutMs: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Request timed out. Please check your connection."));
    }, timeoutMs);

    fetch(url, { ...config, signal: controller.signal })
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        if (err.name === "AbortError") {
          reject(new Error("Request timed out. Please check your connection."));
        } else {
          reject(err);
        }
      });
  });
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiRequest(endpoint: string, options: ApiOptions = {}) {
  const { method = "GET", body, headers: extraHeaders, timeout = REQUEST_TIMEOUT_MS, retries = method === "GET" ? MAX_RETRIES : 0 } = options;
  const headers = await getAuthHeaders();

  const config: RequestInit = {
    method,
    headers: { ...headers, ...extraHeaders },
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        await delay(RETRY_DELAY_MS * attempt);
      }

      const response = await fetchWithTimeout(`${API_BASE}${endpoint}`, config, timeout);

      if (!response.ok) {
        if (response.status === 401) {
          await removeToken();
          _onAuthExpired?.();
        }
        const errorData = await response.json().catch(() => ({ error: "Request failed" }));
        const apiError: any = new Error(errorData.error || errorData.message || `API error: ${response.status}`);
        apiError.statusCode = response.status;
        throw apiError;
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return response.json();
      }
      return { success: true };
    } catch (err: any) {
      lastError = err;
      const isClientError = err.statusCode >= 400 && err.statusCode < 500;
      if (isClientError) {
        throw err;
      }
      if (attempt >= retries) {
        throw err;
      }
    }
  }
  throw lastError || new Error("Request failed");
}

export async function login(email: string, password: string) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (data.token) {
    await saveToken(data.token);
  }
  return data;
}

export async function logout() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {}
  await removeToken();
}

export async function getUser() {
  return apiRequest("/api/auth/me");
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  try {
    await getUser();
    return true;
  } catch {
    await removeToken();
    return false;
  }
}

export async function getAdminStats() {
  return apiRequest("/api/mobile/stats");
}

export async function getAgents(params?: { limit?: number }) {
  const query = params?.limit ? `?limit=${params.limit}` : "";
  return apiRequest(`/api/mobile/agents${query}`);
}

export async function updateAgentStatus(agentId: number, enabled: boolean) {
  return apiRequest("/api/mobile/agents", {
    method: "PATCH",
    body: { id: agentId, enabled },
  });
}

export async function getCalls(params?: { limit?: number; offset?: number; search?: string }) {
  const parts: string[] = [];
  if (params?.limit) parts.push(`limit=${params.limit}`);
  if (params?.offset) parts.push(`offset=${params.offset}`);
  if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
  const query = parts.length ? `?${parts.join("&")}` : "";
  return apiRequest(`/api/mobile/calls${query}`);
}

export async function getCallDetail(callId: number) {
  return apiRequest(`/api/calls?id=${callId}`);
}

export async function getTodayCalls() {
  return apiRequest("/api/calls/today");
}

export async function getWallet() {
  return apiRequest("/api/wallet");
}

export async function getWalletTransactions(params?: { limit?: number; offset?: number }) {
  const parts: string[] = [];
  if (params?.limit) parts.push(`limit=${params.limit}`);
  if (params?.offset) parts.push(`offset=${params.offset}`);
  const query = parts.length ? `?${parts.join("&")}` : "";
  return apiRequest(`/api/wallet/transactions${query}`);
}

export async function getNotifications() {
  return apiRequest("/api/notifications");
}

export async function markNotificationRead(id: number) {
  return apiRequest("/api/notifications/read", {
    method: "POST",
    body: { id },
  });
}

export async function markAllNotificationsRead() {
  return apiRequest("/api/notifications/read-all", {
    method: "POST",
  });
}

export async function sendVoiceCommand(command: string) {
  return apiRequest("/api/rigo", {
    method: "POST",
    body: { message: command },
  });
}

export async function updateProfile(data: { name?: string; phone?: string }) {
  return apiRequest("/api/settings/profile", {
    method: "PATCH",
    body: data,
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest("/api/settings/password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export async function getBusinesses() {
  const data = await getUser();
  return data.businesses || [];
}

export async function switchBusiness(businessId: number) {
  return apiRequest("/api/businesses/switch", {
    method: "POST",
    body: { businessId },
  });
}

export async function createBusiness(name: string, deploymentModel: string) {
  return apiRequest("/api/businesses", {
    method: "POST",
    body: { name, deploymentModel },
  });
}

export interface BrandingConfig {
  brandName: string;
  brandLogo: string | null;
  brandColor: string;
}

export async function fetchBranding(partnerCode: string): Promise<BrandingConfig> {
  const response = await fetch(`${API_BASE}/api/branding/${encodeURIComponent(partnerCode)}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Invalid partner code" }));
    throw new Error(error.error || "Partner not found");
  }
  return response.json();
}

export async function saveBranding(branding: BrandingConfig & { partnerCode: string }) {
  await saveBrandingData(branding);
}

export async function loadBranding(): Promise<(BrandingConfig & { partnerCode: string }) | null> {
  return loadBrandingData();
}

export async function clearBranding() {
  await clearBrandingData();
}
