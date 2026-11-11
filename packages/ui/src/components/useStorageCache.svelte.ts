export interface StorageAdapter {
  get<T = unknown>(key: string): Promise<T | null> | T | null;
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
  has(key: string): Promise<boolean> | boolean;
  keys(): Promise<string[]> | string[];
}

interface StoredEnvelope<T> {
  value: T;
  expiresAt: number | null;
}

// 1. Memory Storage Adapter (SSR & Testing friendly)
export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, StoredEnvelope<unknown>>();

  get<T = unknown>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value as T;
  }

  set<T = unknown>(key: string, value: T, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  keys(): string[] {
    const now = Date.now();
    const validKeys: string[] = [];
    this.store.forEach((item, k) => {
      if (item.expiresAt === null || item.expiresAt > now) {
        validKeys.push(k);
      }
    });
    return validKeys;
  }
}

// 2. LocalStorage Adapter (Browser persistent with TTL & namespace)
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(namespace = 'svadmin') {
    this.prefix = `${namespace}:`;
  }

  private fullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  get<T = unknown>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.fullKey(key));
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const envelope = parsed as StoredEnvelope<T>;
      if (envelope.expiresAt !== null && Date.now() > envelope.expiresAt) {
        localStorage.removeItem(this.fullKey(key));
        return null;
      }
      return envelope.value;
    } catch {
      return null;
    }
  }

  set<T = unknown>(key: string, value: T, ttlSeconds?: number): void {
    if (typeof window === 'undefined') return;
    try {
      const expiresAt = ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null;
      const envelope: StoredEnvelope<T> = { value, expiresAt };
      localStorage.setItem(this.fullKey(key), JSON.stringify(envelope));
    } catch {
      // Quota exceeded
    }
  }

  delete(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.fullKey(key));
    } catch {
      // Ignore
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  keys(): string[] {
    if (typeof window === 'undefined') return [];
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) {
        result.push(k.slice(this.prefix.length));
      }
    }
    return result;
  }
}

// 3. Remote REST KV Adapter (Connect to any generic backend KV API)
export class RemoteKVAdapter implements StorageAdapter {
  private endpointUrl: string;
  private headers: () => Record<string, string>;

  constructor(endpointUrl: string, headers: () => Record<string, string> = () => ({})) {
    this.endpointUrl = endpointUrl.replace(/\/+$/, '');
    this.headers = headers;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const res = await fetch(`${this.endpointUrl}/${encodeURIComponent(key)}`, {
        headers: this.headers(),
      });
      if (!res.ok) return null;
      const data: unknown = await res.json();
      return data as T;
    } catch {
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      await fetch(`${this.endpointUrl}/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.headers() },
        body: JSON.stringify({ value, ttlSeconds }),
      });
    } catch {
      // Network failure
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fetch(`${this.endpointUrl}/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: this.headers(),
      });
    } catch {
      // Network failure
    }
  }

  async clear(): Promise<void> {
    try {
      await fetch(`${this.endpointUrl}`, {
        method: 'DELETE',
        headers: this.headers(),
      });
    } catch {
      // Network failure
    }
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async keys(): Promise<string[]> {
    try {
      const res = await fetch(`${this.endpointUrl}`, { headers: this.headers() });
      if (!res.ok) return [];
      const data: unknown = await res.json();
      return Array.isArray(data) ? (data as string[]) : [];
    } catch {
      return [];
    }
  }
}

export const defaultMemoryStorage = new MemoryStorageAdapter();

export interface UseStorageCacheOptions {
  adapter?: StorageAdapter | undefined;
  ttlSeconds?: number | undefined;
}

export function useStorageCache<T = unknown>(
  key: string,
  initialValue: T,
  options: UseStorageCacheOptions = {},
) {
  const adapter = options.adapter ?? (typeof window !== 'undefined' ? new LocalStorageAdapter() : defaultMemoryStorage);
  const ttlSeconds = options.ttlSeconds;

  let stateVal = $state<T>(initialValue);

  // Sync initial from adapter on mount
  if (typeof window !== 'undefined') {
    const existing = adapter.get<T>(key);
    if (existing instanceof Promise) {
      existing.then((val) => {
        if (val !== null && val !== undefined) {
          stateVal = val;
        }
      });
    } else if (existing !== null && existing !== undefined) {
      stateVal = existing;
    }
  }

  function set(newVal: T) {
    stateVal = newVal;
    void adapter.set(key, newVal, ttlSeconds);
  }

  function remove() {
    stateVal = initialValue;
    void adapter.delete(key);
  }

  return {
    get value() {
      return stateVal;
    },
    set,
    remove,
  };
}
