import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";

const CACHE_KEY_PREFIX = "gorigo-cache-";
const COMMAND_QUEUE_KEY = "gorigo-offline-commands";
const CACHE_TTL = 5 * 60 * 1000;

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface QueuedCommand {
  id: string;
  command: string;
  timestamp: number;
}

export async function cacheData<T>(key: string, data: T): Promise<void> {
  try {
    const cached: CachedData<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(cached));
  } catch (err) {
    console.warn("[OfflineCache] Failed to cache:", key, err);
  }
}

export async function getCachedData<T>(key: string): Promise<{ data: T; stale: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
    if (!raw) return null;
    const cached: CachedData<T> = JSON.parse(raw);
    const stale = Date.now() - cached.timestamp > CACHE_TTL;
    return { data: cached.data, stale };
  } catch {
    return null;
  }
}

export async function queueCommand(command: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(COMMAND_QUEUE_KEY);
    const queue: QueuedCommand[] = raw ? JSON.parse(raw) : [];
    queue.push({
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      command,
      timestamp: Date.now(),
    });
    await AsyncStorage.setItem(COMMAND_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn("[OfflineQueue] Failed to queue command:", err);
  }
}

export async function getQueuedCommands(): Promise<QueuedCommand[]> {
  try {
    const raw = await AsyncStorage.getItem(COMMAND_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearCommandQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(COMMAND_QUEUE_KEY);
  } catch {}
}

export async function removeQueuedCommand(id: string): Promise<void> {
  try {
    const queue = await getQueuedCommands();
    const updated = queue.filter((cmd) => cmd.id !== id);
    await AsyncStorage.setItem(COMMAND_QUEUE_KEY, JSON.stringify(updated));
  } catch {}
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastOnline, setLastOnline] = useState<Date | null>(null);
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnection = useCallback(async () => {
    if (Platform.OS === "web") {
      const online = navigator.onLine;
      if (online !== isOnline) {
        setIsOnline(online);
        if (online) setLastOnline(new Date());
      }
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch("https://gorigo.ai/api/health", {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!isOnline) {
        setIsOnline(true);
        setLastOnline(new Date());
      }
    } catch {
      setIsOnline(false);
    }
  }, [isOnline]);

  useEffect(() => {
    checkConnection();
    checkInterval.current = setInterval(checkConnection, 15000);

    if (Platform.OS === "web") {
      const handleOnline = () => {
        setIsOnline(true);
        setLastOnline(new Date());
      };
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        if (checkInterval.current) clearInterval(checkInterval.current);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, [checkConnection]);

  return { isOnline, lastOnline };
}

export function useOfflineSync(processCommand: (command: string) => Promise<void>) {
  const { isOnline } = useNetworkStatus();
  const isSyncing = useRef(false);

  useEffect(() => {
    if (!isOnline || isSyncing.current) return;

    const syncQueue = async () => {
      isSyncing.current = true;
      try {
        const queue = await getQueuedCommands();
        for (const cmd of queue) {
          try {
            await processCommand(cmd.command);
            await removeQueuedCommand(cmd.id);
          } catch (err) {
            console.warn("[OfflineSync] Failed to process:", cmd.id, err);
            break;
          }
        }
      } finally {
        isSyncing.current = false;
      }
    };

    syncQueue();
  }, [isOnline, processCommand]);

  return { isOnline };
}
