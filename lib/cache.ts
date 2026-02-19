interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;

    const cleanup = setInterval(() => {
      this.evictExpired();
    }, 60_000);
    if ((cleanup as unknown as { unref?: () => void })?.unref) {
      (cleanup as unknown as { unref: () => void }).unref();
    }
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxSize) {
      this.evictExpired();
      if (this.store.size >= this.maxSize) {
        const firstKey = Array.from(this.store.keys())[0];
        if (firstKey) this.store.delete(firstKey);
      }
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

const _global = globalThis as unknown as { __memoryCache?: MemoryCache };
if (!_global.__memoryCache) {
  _global.__memoryCache = new MemoryCache(500);
}

export const cache = _global.__memoryCache;

export const CACHE_TTL = {
  SHORT: 30_000,
  MEDIUM: 120_000,
  LONG: 300_000,
  ORG_SETTINGS: 120_000,
  AGENT_CONFIG: 60_000,
  PUBLIC_DATA: 300_000,
} as const;
