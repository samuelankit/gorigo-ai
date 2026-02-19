import AsyncStorage from "@react-native-async-storage/async-storage";

let SecureStore: any = null;
try {
  SecureStore = require("expo-secure-store");
} catch {}

const TOKEN_KEY = "gorigo-session-token";
const BRANDING_KEY = "gorigo-branding";

export async function saveToken(token: string): Promise<void> {
  if (SecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}

export async function getToken(): Promise<string | null> {
  if (SecureStore) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  if (SecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function saveBrandingData(data: any): Promise<void> {
  await AsyncStorage.setItem(BRANDING_KEY, JSON.stringify(data));
}

export async function loadBrandingData(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(BRANDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearBrandingData(): Promise<void> {
  await AsyncStorage.removeItem(BRANDING_KEY);
}
