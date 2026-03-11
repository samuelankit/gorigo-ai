import { getToken, saveToken, removeToken, saveBrandingData, loadBrandingData, clearBrandingData } from "./secure-store";
import Constants from "expo-constants";

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  (__DEV__ ? "http://localhost:5000" : "https://gorigo.ai");
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const PIN_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const SENSITIVE_ENDPOINTS = ["/api/auth/", "/api/wallet", "/api/billing", "/api/settings/password"];

let _lastPinCheckTime = 0;
let _pinCheckValid = true;
let _pinCheckInProgress: Promise<boolean> | null = null;

async function performPinCheck(): Promise<boolean> {
  if (__DEV__) return true;

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/api/security/pin-check`,
      { method: "GET", headers: { "Content-Type": "application/json", "X-Client-Type": "mobile" } },
      10000
    );

    if (!response.ok) return false;

    const data = await response.json();
    if (!data.challenge || !data.timestamp || !data.pins || data.version !== 1) {
      return false;
    }

    const age = Date.now() - data.timestamp;
    if (age > 30000 || age < -5000) {
      return false;
    }

    const verifyResponse = await fetchWithTimeout(
      `${API_BASE}/api/security/pin-check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Client-Type": "mobile" },
        body: JSON.stringify({ challenge: data.challenge, timestamp: data.timestamp }),
      },
      10000
    );

    if (!verifyResponse.ok) return false;

    const verifyData = await verifyResponse.json();
    return verifyData.valid === true;
  } catch {
    return false;
  }
}

async function ensurePinValid(): Promise<boolean> {
  const now = Date.now();
  if (now - _lastPinCheckTime < PIN_CHECK_INTERVAL_MS && _pinCheckValid) {
    return true;
  }

  if (_pinCheckInProgress) {
    return _pinCheckInProgress;
  }

  _pinCheckInProgress = performPinCheck()
    .then((valid) => {
      _pinCheckValid = valid;
      _lastPinCheckTime = Date.now();
      _pinCheckInProgress = null;
      return valid;
    })
    .catch(() => {
      _pinCheckInProgress = null;
      return false;
    });

  return _pinCheckInProgress;
}

function isSensitiveEndpoint(endpoint: string): boolean {
  return SENSITIVE_ENDPOINTS.some((s) => endpoint.startsWith(s));
}

export function resetPinCheck() {
  _lastPinCheckTime = 0;
  _pinCheckValid = true;
  _pinCheckInProgress = null;
}

export function getPinCheckStatus(): { valid: boolean; lastCheck: number } {
  return { valid: _pinCheckValid, lastCheck: _lastPinCheckTime };
}

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

let _onAuthExpired: (() => void) | null = null;
let _refreshPromise: Promise<boolean> | null = null;

export function setOnAuthExpired(callback: () => void) {
  _onAuthExpired = callback;
}

async function attemptTokenRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const currentToken = await getToken();
      if (!currentToken) return false;

      const response = await fetchWithTimeout(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Type": "mobile",
          "Authorization": `Bearer ${currentToken}`,
        },
      }, REQUEST_TIMEOUT_MS);

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          await saveToken(data.token);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  })();

  try {
    return await _refreshPromise;
  } finally {
    _refreshPromise = null;
  }
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

  if (isSensitiveEndpoint(endpoint)) {
    const pinValid = await ensurePinValid();
    if (!pinValid) {
      const pinError: any = new Error("Security check failed. Connection may be compromised.");
      pinError.statusCode = 0;
      pinError.isPinFailure = true;
      throw pinError;
    }
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        await delay(RETRY_DELAY_MS * attempt);
      }

      const response = await fetchWithTimeout(`${API_BASE}${endpoint}`, config, timeout);

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes("/auth/refresh")) {
          const refreshed = await attemptTokenRefresh();
          if (refreshed) {
            const newHeaders = await getAuthHeaders();
            const retryConfig: RequestInit = {
              method,
              headers: { ...newHeaders, ...extraHeaders },
            };
            if (body && method !== "GET") {
              retryConfig.body = JSON.stringify(body);
            }
            const retryResponse = await fetchWithTimeout(`${API_BASE}${endpoint}`, retryConfig, timeout);
            if (retryResponse.ok) {
              const ct = retryResponse.headers.get("content-type");
              if (ct?.includes("application/json")) {
                return retryResponse.json();
              }
              return { success: true };
            }
          }
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

export async function getAgents(params?: { limit?: number; search?: string }) {
  const parts: string[] = [];
  if (params?.limit) parts.push(`limit=${params.limit}`);
  if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
  const query = parts.length ? `?${parts.join("&")}` : "";
  return apiRequest(`/api/mobile/agents${query}`);
}

export async function updateAgentStatus(agentId: number, enabled: boolean) {
  return apiRequest("/api/mobile/agents", {
    method: "PATCH",
    body: { id: agentId, enabled },
  });
}

export async function createAgent(data: { name: string; agentType?: string; language?: string; greeting?: string; enabled?: boolean }) {
  return apiRequest("/api/mobile/agents", {
    method: "POST",
    body: data,
  });
}

export async function updateAgent(id: number, data: { name?: string; agentType?: string; language?: string; greeting?: string; enabled?: boolean }) {
  return apiRequest("/api/mobile/agents", {
    method: "PATCH",
    body: { id, ...data },
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

export async function getCampaigns(params?: { limit?: number; offset?: number; search?: string; status?: string }) {
  const parts: string[] = [];
  if (params?.limit) parts.push(`limit=${params.limit}`);
  if (params?.offset) parts.push(`offset=${params.offset}`);
  if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
  if (params?.status) parts.push(`status=${encodeURIComponent(params.status)}`);
  const query = parts.length ? `?${parts.join("&")}` : "";
  return apiRequest(`/api/mobile/campaigns${query}`);
}

export async function getCampaignDetail(id: number | string) {
  return apiRequest(`/api/mobile/campaigns/${id}`);
}

export async function createCampaign(data: {
  name: string;
  agentId: number;
  contacts: { phone: string; name: string }[];
  callingHoursStart?: string;
  callingHoursEnd?: string;
  callingTimezone?: string;
  budgetCap?: number;
}) {
  return apiRequest("/api/mobile/campaigns", {
    method: "POST",
    body: data,
  });
}

export async function updateCampaign(id: number | string, data: { name?: string; agentId?: number; callingHoursStart?: string; callingHoursEnd?: string }) {
  return apiRequest(`/api/mobile/campaigns/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function approveCampaign(id: number | string) {
  return apiRequest(`/api/mobile/campaigns/${id}/approve`, {
    method: "POST",
    body: { consentConfirmed: true },
  });
}

export async function controlCampaign(id: number | string, action: "pause" | "resume" | "cancel") {
  return apiRequest(`/api/mobile/campaigns/${id}/control`, {
    method: "POST",
    body: { action },
  });
}

export async function getOwnedPhoneNumbers() {
  return apiRequest("/api/mobile/phone-numbers");
}

export async function searchAvailableNumbers(params?: { country?: string; type?: string; areaCode?: string }) {
  const parts: string[] = [];
  if (params?.country) parts.push(`country=${encodeURIComponent(params.country)}`);
  if (params?.type) parts.push(`type=${encodeURIComponent(params.type)}`);
  if (params?.areaCode) parts.push(`areaCode=${encodeURIComponent(params.areaCode)}`);
  const query = parts.length ? `?${parts.join("&")}` : "";
  return apiRequest(`/api/mobile/phone-numbers/available${query}`);
}
