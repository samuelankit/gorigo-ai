import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = __DEV__ ? "http://localhost:5000" : "https://gorigo.ai";

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem("gorigo-session-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Type": "mobile",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest(endpoint: string, options: ApiOptions = {}) {
  const { method = "GET", body, headers: extraHeaders } = options;
  const headers = await getAuthHeaders();

  const config: RequestInit = {
    method,
    headers: { ...headers, ...extraHeaders },
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.message || `API error: ${response.status}`);
  }

  return response.json();
}

export async function login(email: string, password: string) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (data.token) {
    await AsyncStorage.setItem("gorigo-session-token", data.token);
  }
  return data;
}

export async function logout() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {}
  await AsyncStorage.removeItem("gorigo-session-token");
}

export async function setApiBase(url: string) {
  await AsyncStorage.setItem("gorigo-api-base", url);
}

export async function getUser() {
  return apiRequest("/api/auth/me");
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await AsyncStorage.getItem("gorigo-session-token");
  if (!token) return false;
  try {
    await getUser();
    return true;
  } catch {
    await AsyncStorage.removeItem("gorigo-session-token");
    return false;
  }
}

export async function getAdminStats() {
  return apiRequest("/api/admin/stats");
}

export async function getAgents(params?: { limit?: number }) {
  const query = params?.limit ? `?limit=${params.limit}` : "";
  return apiRequest(`/api/admin/agents${query}`);
}

export async function getCalls(params?: { limit?: number }) {
  const query = params?.limit ? `?limit=${params.limit}` : "";
  return apiRequest(`/api/admin/calls${query}`);
}

export async function getWallet() {
  return apiRequest("/api/wallet");
}

export async function sendVoiceCommand(command: string) {
  return apiRequest("/api/rigo", {
    method: "POST",
    body: { message: command },
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
  await AsyncStorage.setItem("gorigo-branding", JSON.stringify(branding));
}

export async function loadBranding(): Promise<(BrandingConfig & { partnerCode: string }) | null> {
  const data = await AsyncStorage.getItem("gorigo-branding");
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function clearBranding() {
  await AsyncStorage.removeItem("gorigo-branding");
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
