import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

const PING_URL = __DEV__ ? "http://localhost:5000/api/health" : "https://gorigo.ai/api/health";
const PING_INTERVAL_MS = 30000;
const PING_TIMEOUT_MS = 5000;

export function useNetworkState() {
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      const res = await fetch(PING_URL, { method: "GET", signal: controller.signal });
      clearTimeout(timer);
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();

    intervalRef.current = setInterval(checkConnection, PING_INTERVAL_MS);

    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        checkConnection();
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [checkConnection]);

  return { isOnline, checkConnection };
}
