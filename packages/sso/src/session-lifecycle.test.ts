import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import {
  createSSOAuthProvider,
  type RefreshLock,
  type SSOSession,
  type TokenStorage,
} from './auth-provider';
import { SSOAuthError } from './errors';

const endpoints = {
  authorization_endpoint: 'https://idp.test/oauth2/authorize',
  token_endpoint: 'https://idp.test/oauth2/token',
  userinfo_endpoint: 'https://idp.test/oauth2/userinfo',
  end_session_endpoint: 'https://idp.test/oauth2/logout',
};

function createMemoryStorage(): TokenStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); },
    removeItem: (key) => { store.delete(key); },
  };
}

function sessionKey(storageKey: string): string {
  return `${storageKey}_tokens`;
}

function saveSession(storage: TokenStorage, storageKey: string, session: SSOSession): void {
  storage.setItem(sessionKey(storageKey), JSON.stringify(session));
}

function readSession(storage: TokenStorage, storageKey: string): SSOSession | null {
  const raw = storage.getItem(sessionKey(storageKey));
  return raw ? JSON.parse(raw) as SSOSession : null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestUrl(input: RequestInfo | URL): string {
  return input instanceof Request ? input.url : String(input);
}

function requestHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  return input instanceof Request ? input.headers : new Headers(init?.headers);
}

function asFetcher(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response,
): typeof fetch {
  return handler as typeof fetch;
}

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

function createSignal(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => { resolve = complete; });
  return { promise, resolve };
}

function createSerialLock(): RefreshLock {
  const tails = new Map<string, Promise<unknown>>();
  return {
    async request<T>(name: string, operation: () => Promise<T>): Promise<T> {
      const previous = tails.get(name) ?? Promise.resolve();
      const current = previous.catch(() => undefined).then(operation);
      tails.set(name, current);
      try {
        return await current;
      } finally {
        if (tails.get(name) === current) tails.delete(name);
      }
    },
  };
}

function createImmediateSerialLock(): RefreshLock {
  const tails = new Map<string, Promise<void>>();
  return {
    request<T>(name: string, operation: () => Promise<T>): Promise<T> {
      const previous = tails.get(name);
      if (previous) {
        return previous.catch(() => undefined).then(() => this.request(name, operation));
      }

      let release!: () => void;
      const tail = new Promise<void>((resolve) => { release = resolve; });
      tails.set(name, tail);
      let result: Promise<T>;
      try {
        result = Promise.resolve(operation());
      } catch (error) {
        result = Promise.reject(error);
      }
      const finish = () => {
        release();
        if (tails.get(name) === tail) tails.delete(name);
      };
      void result.then(finish, finish);
      return result;
    },
  };
}

class FakeBroadcastChannel {
  static readonly channels = new Map<string, Set<FakeBroadcastChannel>>();

  private readonly listeners = new Set<(event: MessageEvent) => void>();

  constructor(private readonly name: string) {
    const peers = FakeBroadcastChannel.channels.get(name) ?? new Set();
    peers.add(this);
    FakeBroadcastChannel.channels.set(name, peers);
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: string, listener: (event: MessageEvent) => void): void {
    this.listeners.delete(listener);
  }

  postMessage(data: unknown): void {
    for (const peer of FakeBroadcastChannel.channels.get(this.name) ?? []) {
      if (peer === this) continue;
      for (const listener of peer.listeners) listener({ data } as MessageEvent);
    }
  }

  close(): void {
    FakeBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

function createProvider(options: {
  storage: TokenStorage;
  storageKey: string;
  fetcher: typeof fetch;
  refreshLock?: RefreshLock;
  autoRefresh?: boolean;
}) {
  return createSSOAuthProvider({
    issuer: 'https://idp.test',
    clientId: 'admin-console',
    redirectUri: 'https://app.test/callback',
    storage: options.storage,
    storageKey: options.storageKey,
    fetcher: options.fetcher,
    ...(options.refreshLock === undefined ? {} : { refreshLock: options.refreshLock }),
    autoRefresh: options.autoRefresh ?? false,
    manualEndpoints: endpoints,
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'document');
  FakeBroadcastChannel.channels.clear();
});

describe('rotation-safe session lifecycle', () => {
  test('single-flights 20 concurrent refresh requests in one provider', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'single-flight';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: Math.floor(Date.now() / 1000) - 1,
      token_type: 'Bearer',
    });
    let refreshCalls = 0;
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(async () => {
        refreshCalls += 1;
        await Promise.resolve();
        return jsonResponse({
          access_token: 'new-access',
          refresh_token: 'refresh-2',
          expires_in: 3600,
          token_type: 'Bearer',
        });
      }),
    });

    const tokens = await Promise.all(Array.from(
      { length: 20 },
      () => provider.getAccessToken({ forceRefresh: true }),
    ));

    expect(new Set(tokens)).toEqual(new Set(['new-access']));
    expect(refreshCalls).toBe(1);
    expect(readSession(storage, storageKey)?.refresh_token).toBe('refresh-2');
    provider.destroy();
  });

  test('two providers sharing storage and a lock reuse the rotated session', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'two-tabs';
    const refreshLock = createSerialLock();
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: Math.floor(Date.now() / 1000) - 1,
      token_type: 'Bearer',
    });
    let refreshCalls = 0;
    const fetcher = asFetcher(async () => {
      refreshCalls += 1;
      await Promise.resolve();
      return jsonResponse({
        access_token: 'new-access',
        refresh_token: 'refresh-2',
        expires_in: 3600,
      });
    });
    const first = createProvider({ storage, storageKey, fetcher, refreshLock });
    const second = createProvider({ storage, storageKey, fetcher, refreshLock });

    const results = await Promise.all([first.refreshSession(), second.refreshSession()]);

    expect(results.map((session) => session?.access_token)).toEqual(['new-access', 'new-access']);
    expect(refreshCalls).toBe(1);
    expect(readSession(storage, storageKey)?.refresh_token).toBe('refresh-2');
    first.destroy();
    second.destroy();
  });

  test('does not restore a session when logout completes during refresh', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'logout-during-refresh';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const refreshStarted = createSignal();
    const refreshResponse = createDeferred<Response>();
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => {
        refreshStarted.resolve();
        return refreshResponse.promise;
      }),
    });

    const pendingRefresh = provider.refreshSession();
    await refreshStarted.promise;
    expect(await provider.logout()).toEqual({ success: true, redirectTo: '/' });
    refreshResponse.resolve(jsonResponse({
      access_token: 'rotated-access',
      refresh_token: 'refresh-2',
      expires_in: 3600,
    }));

    expect(await pendingRefresh).toBeNull();
    expect(readSession(storage, storageKey)).toBeNull();
    provider.destroy();
  });

  test('serializes refresh commit with a cross-provider logout', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'cross-provider-logout-during-refresh-commit';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const lock = createImmediateSerialLock();
    const refreshStarted = createSignal();
    const refreshResponse = createDeferred<Response>();
    const refreshingProvider = createProvider({
      storage,
      storageKey,
      refreshLock: lock,
      fetcher: asFetcher(() => {
        refreshStarted.resolve();
        return refreshResponse.promise;
      }),
    });
    const logoutProvider = createProvider({
      storage,
      storageKey,
      refreshLock: lock,
      fetcher: asFetcher(() => { throw new TypeError('offline'); }),
    });
    const originalGetItem = storage.getItem;
    let triggerLogout = false;
    let logout: Promise<unknown> | undefined;
    storage.getItem = (key) => {
      const value = originalGetItem(key);
      if (triggerLogout && key === sessionKey(storageKey)) {
        triggerLogout = false;
        logout = logoutProvider.logout();
      }
      return value;
    };

    const refresh = refreshingProvider.refreshSession();
    await refreshStarted.promise;
    triggerLogout = true;
    refreshResponse.resolve(jsonResponse({
      access_token: 'rotated-access',
      refresh_token: 'refresh-2',
      expires_in: 3600,
    }));

    await refresh;
    await logout;
    expect(readSession(storage, storageKey)).toBeNull();
    refreshingProvider.destroy();
    logoutProvider.destroy();
  });

  test('does not let failed callback cleanup erase a newer login attempt', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'callback-cleanup-vs-new-login';
    const stateKey = `${storageKey}_state`;
    const verifierKey = `${storageKey}_pkce_verifier`;
    storage.setItem(stateKey, 'old-state');
    storage.setItem(verifierKey, 'old-verifier');
    const location = { href: 'https://app.test/callback?code=old-code&state=old-state' };
    Object.defineProperty(globalThis, 'window', {
      value: {
        location,
        history: {
          replaceState: (_state: unknown, _title: string, url: string) => {
            location.href = new URL(url, location.href).href;
          },
        },
      } as unknown as Window,
      configurable: true,
    });
    const lock = createImmediateSerialLock();
    const discoveryStarted = createSignal();
    const discoveryResponse = createDeferred<Response>();
    const newerProvider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'https://app.test/callback',
      storage,
      storageKey,
      refreshLock: lock,
      autoRefresh: false,
      fetcher: asFetcher(() => {
        discoveryStarted.resolve();
        return discoveryResponse.promise;
      }),
    });
    let triggerNewLogin = false;
    let newerLogin: ReturnType<typeof newerProvider.login> | undefined;
    const originalGetItem = storage.getItem;
    storage.getItem = (key) => {
      const value = originalGetItem(key);
      if (triggerNewLogin && key === stateKey) {
        triggerNewLogin = false;
        newerLogin = newerProvider.login({});
      }
      return value;
    };
    const staleProvider = createProvider({
      storage,
      storageKey,
      refreshLock: lock,
      fetcher: asFetcher(() => {
        triggerNewLogin = true;
        return jsonResponse({ access_token: 'invalid-access', token_type: '' });
      }),
    });

    expect((await staleProvider.check()).authenticated).toBe(false);
    await discoveryStarted.promise;
    const pendingState = originalGetItem(stateKey);
    expect(pendingState).not.toBeNull();
    expect(pendingState).not.toBe('old-state');
    discoveryResponse.resolve(jsonResponse(endpoints));

    expect((await newerLogin)?.success).toBe(true);
    expect(originalGetItem(stateKey)).toBe(pendingState);
    expect(originalGetItem(verifierKey)).not.toBe('');
    staleProvider.destroy();
    newerProvider.destroy();
  });

  test('does not let a terminal refresh clear a newer login attempt', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'terminal-refresh-vs-new-login';
    const stateKey = `${storageKey}_state`;
    const verifierKey = `${storageKey}_pkce_verifier`;
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const location = { href: 'https://app.test/' };
    Object.defineProperty(globalThis, 'window', {
      value: { location } as unknown as Window,
      configurable: true,
    });
    const lock = createImmediateSerialLock();
    const refreshStarted = createSignal();
    const refreshResponse = createDeferred<Response>();
    const refreshingProvider = createProvider({
      storage,
      storageKey,
      refreshLock: lock,
      fetcher: asFetcher(() => {
        refreshStarted.resolve();
        return refreshResponse.promise;
      }),
    });
    const discoveryStarted = createSignal();
    const discoveryResponse = createDeferred<Response>();
    const newerProvider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'https://app.test/callback',
      storage,
      storageKey,
      refreshLock: lock,
      autoRefresh: false,
      fetcher: asFetcher(() => {
        discoveryStarted.resolve();
        return discoveryResponse.promise;
      }),
    });

    const refresh = refreshingProvider.refreshSession();
    await refreshStarted.promise;
    const login = newerProvider.login({});
    await discoveryStarted.promise;
    const pendingState = storage.getItem(stateKey);
    expect(pendingState).not.toBeNull();
    refreshResponse.resolve(jsonResponse({
      error: 'invalid_grant',
      message: 'Refresh token already used',
    }, 400));

    await expect(refresh).rejects.toMatchObject({ code: 'invalid_grant' });
    expect(storage.getItem(stateKey)).toBe(pendingState);
    discoveryResponse.resolve(jsonResponse(endpoints));

    expect((await login).success).toBe(true);
    expect(storage.getItem(stateKey)).toBe(pendingState);
    expect(storage.getItem(verifierKey)).not.toBe('');
    expect(readSession(storage, storageKey)).toBeNull();
    refreshingProvider.destroy();
    newerProvider.destroy();
  });

  test('does not let a terminal refresh broadcast cancel an in-flight callback', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'terminal-refresh-vs-callback';
    const stateKey = `${storageKey}_state`;
    const verifierKey = `${storageKey}_pkce_verifier`;
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    storage.setItem(stateKey, 'callback-state');
    storage.setItem(verifierKey, 'callback-verifier');
    const location = {
      href: 'https://app.test/callback?code=new-code&state=callback-state',
    };
    Object.defineProperty(globalThis, 'window', {
      value: {
        location,
        navigator: {},
        BroadcastChannel: FakeBroadcastChannel,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        history: {
          replaceState: (_state: unknown, _title: string, url: string) => {
            location.href = new URL(url, location.href).href;
          },
        },
      } as unknown as Window,
      configurable: true,
    });
    const lock = createImmediateSerialLock();
    const refreshStarted = createSignal();
    const refreshResponse = createDeferred<Response>();
    const refreshingProvider = createProvider({
      storage,
      storageKey,
      refreshLock: lock,
      fetcher: asFetcher(() => {
        refreshStarted.resolve();
        return refreshResponse.promise;
      }),
    });
    const callbackStarted = createSignal();
    const callbackResponse = createDeferred<Response>();
    const callbackProvider = createProvider({
      storage,
      storageKey,
      refreshLock: lock,
      fetcher: asFetcher(() => {
        callbackStarted.resolve();
        return callbackResponse.promise;
      }),
    });

    const refresh = refreshingProvider.refreshSession();
    await refreshStarted.promise;
    const callback = callbackProvider.check();
    await callbackStarted.promise;
    refreshResponse.resolve(jsonResponse({
      error: 'invalid_grant',
      message: 'Refresh token already used',
    }, 400));
    await expect(refresh).rejects.toMatchObject({ code: 'invalid_grant' });

    callbackResponse.resolve(jsonResponse({
      access_token: 'new-login-access',
      refresh_token: 'new-login-refresh',
      expires_in: 3600,
    }));

    expect(await callback).toEqual({ authenticated: true });
    expect(readSession(storage, storageKey)?.access_token).toBe('new-login-access');
    expect(storage.getItem(stateKey)).toBeNull();
    expect(storage.getItem(verifierKey)).toBeNull();
    refreshingProvider.destroy();
    callbackProvider.destroy();
  });

  test('does not let an expired check erase a concurrent login attempt', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'expired-check-vs-login';
    const tokenKey = sessionKey(storageKey);
    const stateKey = `${storageKey}_state`;
    const verifierKey = `${storageKey}_pkce_verifier`;
    saveSession(storage, storageKey, {
      access_token: 'expired-access',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const location = { href: 'https://app.test/' };
    Object.defineProperty(globalThis, 'window', {
      value: { location } as unknown as Window,
      configurable: true,
    });
    const lock = createImmediateSerialLock();
    const staleProvider = createProvider({
      storage,
      storageKey,
      refreshLock: lock,
      fetcher: asFetcher(() => { throw new TypeError('unexpected request'); }),
    });
    const newerProvider = createProvider({
      storage,
      storageKey,
      refreshLock: lock,
      fetcher: asFetcher(() => { throw new TypeError('unexpected request'); }),
    });
    const originalGetItem = storage.getItem;
    let tokenReads = 0;
    let newerLogin: ReturnType<typeof newerProvider.login> | undefined;
    storage.getItem = (key) => {
      const value = originalGetItem(key);
      if (key === tokenKey && ++tokenReads === 2) {
        newerLogin = newerProvider.login({});
      }
      return value;
    };

    expect(await staleProvider.check()).toEqual({ authenticated: false });
    expect((await newerLogin)?.success).toBe(true);
    expect(originalGetItem(tokenKey)).toBeNull();
    expect(originalGetItem(stateKey)).not.toBeNull();
    expect(originalGetItem(verifierKey)).not.toBe('');
    staleProvider.destroy();
    newerProvider.destroy();
  });

  test('does not let a stale access-token read clear a newer session', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'expired-token-read-vs-new-session';
    const tokenKey = sessionKey(storageKey);
    saveSession(storage, storageKey, {
      access_token: 'expired-access',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => { throw new TypeError('unexpected request'); }),
    });
    const originalGetItem = storage.getItem;
    let replaced = false;
    storage.getItem = (key) => {
      const value = originalGetItem(key);
      if (!replaced && key === tokenKey) {
        replaced = true;
        saveSession(storage, storageKey, {
          access_token: 'new-access',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'Bearer',
        });
      }
      return value;
    };

    expect(await provider.getAccessToken()).toBe('new-access');
    expect(readSession(storage, storageKey)?.access_token).toBe('new-access');
    provider.destroy();
  });

  test('reuses a new login that wins while an older refresh is in flight', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'login-during-refresh';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const refreshStarted = createSignal();
    const refreshResponse = createDeferred<Response>();
    const refreshingProvider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => {
        refreshStarted.resolve();
        return refreshResponse.promise;
      }),
    });

    const pendingRefresh = refreshingProvider.refreshSession();
    await refreshStarted.promise;
    storage.setItem(`${storageKey}_pkce_verifier`, 'new-verifier');
    storage.setItem(`${storageKey}_state`, 'new-state');
    const location = {
      href: 'https://app.test/callback?code=new-code&state=new-state',
    };
    Object.defineProperty(globalThis, 'window', {
      value: {
        location,
        history: {
          replaceState: (_state: unknown, _title: string, url: string) => {
            location.href = new URL(url, location.href).href;
          },
        },
      } as unknown as Window,
      configurable: true,
    });
    const loginProvider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({
        access_token: 'new-login-access',
        refresh_token: 'new-login-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      })),
    });

    expect(await loginProvider.check()).toEqual({ authenticated: true });
    refreshResponse.resolve(jsonResponse({
      access_token: 'stale-rotated-access',
      refresh_token: 'stale-refresh-2',
      expires_in: 3600,
    }));

    expect((await pendingRefresh)?.access_token).toBe('new-login-access');
    expect(readSession(storage, storageKey)?.refresh_token).toBe('new-login-refresh');
    refreshingProvider.destroy();
    loginProvider.destroy();
  });

  test('fails closed when session storage becomes invalid during refresh', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'invalid-race-winner';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const refreshStarted = createSignal();
    const refreshResponse = createDeferred<Response>();
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => {
        refreshStarted.resolve();
        return refreshResponse.promise;
      }),
    });

    const pendingRefresh = provider.refreshSession();
    await refreshStarted.promise;
    storage.setItem(sessionKey(storageKey), JSON.stringify({
      access_token: 'invalid-session',
      token_type: '',
    }));
    refreshResponse.resolve(jsonResponse({
      access_token: 'stale-rotated-access',
      refresh_token: 'stale-refresh-2',
      expires_in: 3600,
    }));

    await expect(pendingRefresh).rejects.toMatchObject({
      code: 'session_refresh_failed',
      retryable: false,
    });
    expect(readSession(storage, storageKey)).toBeNull();
    provider.destroy();
  });

  test('serializes shared-storage refreshes before a loser can clear the winner', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'rotation-race-loser-first';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const winnerStarted = createSignal();
    const winnerResponse = createDeferred<Response>();
    let refreshCalls = 0;
    const fetcher = asFetcher(async () => {
      refreshCalls += 1;
      if (refreshCalls === 1) {
        winnerStarted.resolve();
        return winnerResponse.promise;
      }
      return jsonResponse({
        error: 'invalid_grant',
        message: 'Refresh token already used',
      }, 400);
    });
    const first = createProvider({ storage, storageKey, fetcher });
    const second = createProvider({ storage, storageKey, fetcher });

    const firstRefresh = first.refreshSession();
    await winnerStarted.promise;
    const secondRefresh = second.refreshSession();
    await Promise.resolve();
    await Promise.resolve();
    winnerResponse.resolve(jsonResponse({
      access_token: 'new-access',
      refresh_token: 'refresh-2',
      expires_in: 3600,
    }));

    const sessions = await Promise.all([firstRefresh, secondRefresh]);

    expect(sessions.map((session) => session?.access_token)).toEqual(['new-access', 'new-access']);
    expect(readSession(storage, storageKey)?.refresh_token).toBe('refresh-2');
    expect(refreshCalls).toBe(1);
    first.destroy();
    second.destroy();
  });

  test('fails closed in browsers without an atomic cross-context refresh lock', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        document: {},
        navigator: {},
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      } as unknown as Window,
      configurable: true,
    });
    const storage = createMemoryStorage();
    const storageKey = 'missing-browser-lock';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    let refreshCalls = 0;
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => {
        refreshCalls += 1;
        return jsonResponse({
          access_token: 'unexpected-access',
          refresh_token: 'unexpected-refresh',
          expires_in: 3600,
        });
      }),
    });

    await expect(provider.refreshSession()).rejects.toMatchObject({
      code: 'refresh_lock_failed',
      retryable: true,
    });
    expect(refreshCalls).toBe(0);
    expect(readSession(storage, storageKey)?.refresh_token).toBe('refresh-1');
    provider.destroy();
  });

  test('broadcasts refreshed sessions to another same-origin provider', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        navigator: {},
        BroadcastChannel: FakeBroadcastChannel,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      } as unknown as Window,
      configurable: true,
    });
    const sharedStorage = createMemoryStorage();
    const storageKey = 'broadcast';
    const initialSession: SSOSession = {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    };
    saveSession(sharedStorage, storageKey, initialSession);
    const fetcher = asFetcher(() => jsonResponse({
      access_token: 'new-access',
      refresh_token: 'refresh-2',
      expires_in: 3600,
    }));
    const first = createProvider({ storage: sharedStorage, storageKey, fetcher });
    const second = createProvider({ storage: sharedStorage, storageKey, fetcher });
    const events: string[] = [];
    second.onAuthStateChange((event) => { events.push(event); });

    await first.refreshSession();

    expect((await second.getSession())?.access_token).toBe('new-access');
    expect((await second.getSession())?.refresh_token).toBe('refresh-2');
    expect(events).toEqual(['TOKEN_REFRESHED']);
    first.destroy();
    second.destroy();
  });

  test('does not copy refreshed tokens into an isolated storage through BroadcastChannel', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        navigator: {},
        BroadcastChannel: FakeBroadcastChannel,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      } as unknown as Window,
      configurable: true,
    });
    const firstStorage = createMemoryStorage();
    const secondStorage = createMemoryStorage();
    const storageKey = 'isolated-broadcast';
    const initialSession: SSOSession = {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    };
    saveSession(firstStorage, storageKey, initialSession);
    saveSession(secondStorage, storageKey, initialSession);
    const first = createProvider({
      storage: firstStorage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({
        access_token: 'new-access',
        refresh_token: 'refresh-2',
        expires_in: 3600,
      })),
    });
    const second = createProvider({
      storage: secondStorage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({ access_token: 'unexpected' })),
    });
    const events: string[] = [];
    second.onAuthStateChange((event) => { events.push(event); });

    await first.refreshSession();

    expect((await second.getSession())?.access_token).toBe('old-access');
    expect(events).toEqual([]);
    first.destroy();
    second.destroy();
  });

  test('preserves id_token when a rotation response omits it', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'preserve-id-token';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      id_token: 'original-id-token',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({
        access_token: 'new-access',
        refresh_token: 'refresh-2',
        expires_in: 3600,
        token_type: 'bearer',
      })),
    });

    const session = await provider.refreshSession();

    expect(session?.id_token).toBe('original-id-token');
    expect(session?.refresh_token).toBe('refresh-2');
    expect(session?.token_type).toBe('Bearer');
    provider.destroy();
  });

  test('rejects refresh responses with an empty token_type', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'empty-refresh-token-type';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({
        access_token: 'new-access',
        refresh_token: 'refresh-2',
        token_type: '',
      })),
    });

    await expect(provider.refreshSession()).rejects.toMatchObject({
      code: 'invalid_token_response',
    });
    expect(readSession(storage, storageKey)?.access_token).toBe('old-access');
    provider.destroy();
  });

  test('rejects refresh responses with an empty refresh_token', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'empty-rotated-refresh-token';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({
        access_token: 'new-access',
        refresh_token: '',
      })),
    });

    await expect(provider.refreshSession()).rejects.toMatchObject({
      code: 'invalid_token_response',
    });
    expect(readSession(storage, storageKey)?.refresh_token).toBe('refresh-1');
    provider.destroy();
  });

  test('isolates subscriber failures from persistence and refresh completion', async () => {
    const warning = spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = createMemoryStorage();
    const storageKey = 'listener-failure';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({
        access_token: 'new-access',
        refresh_token: 'refresh-2',
        expires_in: 3600,
      })),
    });
    const events: string[] = [];
    provider.onAuthStateChange(() => { throw new Error('subscriber failed'); });
    provider.onAuthStateChange((event) => { events.push(event); });

    expect(await provider.getAccessToken({ forceRefresh: true })).toBe('new-access');
    expect(events).toEqual(['TOKEN_REFRESHED']);
    expect(readSession(storage, storageKey)?.refresh_token).toBe('refresh-2');
    expect(warning).toHaveBeenCalledWith(
      '[svadmin/sso] auth state listener failed: subscriber failed',
    );
    warning.mockRestore();
    provider.destroy();
  });

  test('isolates rejected async subscribers from persistence and refresh completion', async () => {
    const warning = spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = createMemoryStorage();
    const storageKey = 'async-listener-failure';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({
        access_token: 'new-access',
        refresh_token: 'refresh-2',
        expires_in: 3600,
      })),
    });
    provider.onAuthStateChange(async () => {
      throw new Error('async subscriber failed');
    });

    expect(await provider.getAccessToken({ forceRefresh: true })).toBe('new-access');
    await Promise.resolve();
    await Promise.resolve();
    expect(warning).toHaveBeenCalledWith(
      '[svadmin/sso] async auth state listener failed: async subscriber failed',
    );
    expect(readSession(storage, storageKey)?.refresh_token).toBe('refresh-2');
    warning.mockRestore();
    provider.destroy();
  });

  test('fails closed when a rotated token set cannot be persisted', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'persistence-failure';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const originalSetItem = storage.setItem;
    storage.setItem = (key, value) => {
      if (key === sessionKey(storageKey)) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      originalSetItem(key, value);
    };
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({
        access_token: 'new-access',
        refresh_token: 'refresh-2',
        expires_in: 3600,
      })),
    });

    let persistenceError: unknown;
    try {
      await provider.refreshSession();
    } catch (error) {
      persistenceError = error;
    }

    expect(persistenceError).toMatchObject({ code: 'session_persistence_failed', retryable: false });
    expect(readSession(storage, storageKey)).toBeNull();
    expect(await provider.onError?.(persistenceError)).toEqual({ logout: true, redirectTo: '/login' });
    provider.destroy();
  });

  test('retains the session on retryable 503 refresh failures', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'retryable';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({ message: 'temporarily unavailable' }, 503)),
    });

    try {
      await provider.refreshSession();
      throw new Error('Expected refresh to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(SSOAuthError);
      expect((error as SSOAuthError).statusCode).toBe(503);
      expect((error as SSOAuthError).retryable).toBe(true);
    }
    expect(readSession(storage, storageKey)?.refresh_token).toBe('refresh-1');
    provider.destroy();
  });

  test('retains the session on retryable 500 refresh failures', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'retryable-500';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({ message: 'server unavailable' }, 500)),
    });

    await expect(provider.refreshSession()).rejects.toMatchObject({
      statusCode: 500,
      retryable: true,
    });
    expect(readSession(storage, storageKey)?.refresh_token).toBe('refresh-1');
    provider.destroy();
  });

  test('clears the session for GoTrue refresh_token_not_found error_code responses', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'terminal';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => jsonResponse({
        error_code: 'refresh_token_not_found',
        message: 'Invalid Refresh Token: Refresh Token Not Found',
      }, 400)),
    });
    const events: string[] = [];
    provider.onAuthStateChange((event) => { events.push(event); });

    await expect(provider.refreshSession()).rejects.toMatchObject({ code: 'refresh_token_not_found' });

    expect(storage.getItem(sessionKey(storageKey))).toBeNull();
    expect(events).toEqual(['SIGNED_OUT']);
    provider.destroy();
  });

  test('retains the session for caller aborts and marks them non-retryable', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'aborted';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => { throw new DOMException('aborted', 'AbortError'); }),
    });

    try {
      await provider.refreshSession();
      throw new Error('Expected refresh to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(SSOAuthError);
      expect((error as SSOAuthError).code).toBe('request_aborted');
      expect((error as SSOAuthError).retryable).toBe(false);
    }
    expect(readSession(storage, storageKey)?.refresh_token).toBe('refresh-1');
    provider.destroy();
  });

  test('does not refresh without a lock when lock acquisition fails', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'lock-failure';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: 1,
      token_type: 'Bearer',
    });
    let refreshCalls = 0;
    const provider = createProvider({
      storage,
      storageKey,
      refreshLock: {
        request: async () => { throw new Error('locks unavailable'); },
      },
      fetcher: asFetcher(() => {
        refreshCalls += 1;
        return jsonResponse({ access_token: 'unexpected' });
      }),
    });

    await expect(provider.refreshSession()).rejects.toMatchObject({
      code: 'refresh_lock_failed',
      retryable: true,
    });
    expect(refreshCalls).toBe(0);
    expect(readSession(storage, storageKey)?.refresh_token).toBe('refresh-1');
    provider.destroy();
  });

  test('refreshes an expired session when the document returns to the foreground', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'visibility';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'Bearer',
    });
    let visibilityState: DocumentVisibilityState = 'hidden';
    let visibilityListener: EventListener | undefined;
    Object.defineProperty(globalThis, 'document', {
      value: {
        get visibilityState() { return visibilityState; },
        addEventListener: (type: string, listener: EventListener) => {
          if (type === 'visibilitychange') visibilityListener = listener;
        },
        removeEventListener: () => { visibilityListener = undefined; },
      } as unknown as Document,
      configurable: true,
    });
    const provider = createProvider({
      storage,
      storageKey,
      autoRefresh: true,
      fetcher: asFetcher(() => jsonResponse({
        access_token: 'new-access',
        refresh_token: 'refresh-2',
        expires_in: 3600,
      })),
    });
    const refreshed = new Promise<void>((resolve) => {
      provider.onAuthStateChange((event) => {
        if (event === 'TOKEN_REFRESHED') resolve();
      });
    });
    saveSession(storage, storageKey, {
      access_token: 'expired-access',
      refresh_token: 'refresh-1',
      expires_at: Math.floor(Date.now() / 1000) - 1,
      token_type: 'Bearer',
    });

    visibilityState = 'visible';
    visibilityListener?.(new Event('visibilitychange'));
    await refreshed;

    expect(readSession(storage, storageKey)?.access_token).toBe('new-access');
    provider.destroy();
  });
});

describe('authenticated fetch recovery', () => {
  test('preserves the session token type in the authorization header', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'token-type';
    saveSession(storage, storageKey, {
      access_token: 'proof-token',
      token_type: 'DPoP',
    });
    let authorization = '';
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher((input) => {
        authorization = requestHeaders(input).get('Authorization') ?? '';
        return new Response(null, { status: 200 });
      }),
    });

    await provider.createAuthenticatedFetch()('https://api.test/private');

    expect(authorization).toBe('DPoP proof-token');
    provider.destroy();
  });

  test('normalizes a persisted lowercase bearer authorization scheme', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'lowercase-bearer';
    saveSession(storage, storageKey, {
      access_token: 'access-token',
      token_type: 'bearer',
    });
    let authorization = '';
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher((input) => {
        authorization = requestHeaders(input).get('Authorization') ?? '';
        return new Response(null, { status: 200 });
      }),
    });

    await provider.createAuthenticatedFetch()('https://api.test/private');

    expect(authorization).toBe('Bearer access-token');
    provider.destroy();
  });

  test('replays one POST after 401 with the rotated token and intact body', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'fetch-recovery';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'Bearer',
    });
    let refreshCalls = 0;
    const apiBodies: string[] = [];
    const apiTokens: string[] = [];
    const fetcher = asFetcher(async (input) => {
      const url = requestUrl(input);
      if (url === endpoints.token_endpoint) {
        refreshCalls += 1;
        return jsonResponse({
          access_token: 'new-access',
          refresh_token: 'refresh-2',
          expires_in: 3600,
        });
      }

      const request = input as Request;
      apiTokens.push(request.headers.get('Authorization') ?? '');
      apiBodies.push(await request.text());
      return new Response(null, { status: apiTokens.length === 1 ? 401 : 200 });
    });
    const provider = createProvider({ storage, storageKey, fetcher });
    const authFetch = provider.createAuthenticatedFetch();

    const response = await authFetch('https://api.test/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'demo' }),
    });

    expect(response.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(apiTokens).toEqual(['Bearer old-access', 'Bearer new-access']);
    expect(apiBodies).toEqual(['{"name":"demo"}', '{"name":"demo"}']);
    provider.destroy();
  });

  test('does not loop when the replay also returns 401', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'second-401';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'Bearer',
    });
    let refreshCalls = 0;
    let apiCalls = 0;
    const fetcher = asFetcher((input) => {
      if (requestUrl(input) === endpoints.token_endpoint) {
        refreshCalls += 1;
        return jsonResponse({
          access_token: 'new-access',
          refresh_token: 'refresh-2',
          expires_in: 3600,
        });
      }
      apiCalls += 1;
      return new Response(null, { status: 401 });
    });
    const provider = createProvider({ storage, storageKey, fetcher });

    const response = await provider.createAuthenticatedFetch()('https://api.test/private');

    expect(response.status).toBe(401);
    expect(response.headers.get('X-Svadmin-Auth-Retry')).toBe('exhausted');
    expect(apiCalls).toBe(2);
    expect(refreshCalls).toBe(1);
    expect(await provider.onError?.({
      statusCode: 401,
      code: response.headers.get('X-Svadmin-Auth-Retry') === 'exhausted'
        ? 'auth_retry_exhausted'
        : undefined,
    })).toEqual({ logout: true, redirectTo: '/login' });
    expect(refreshCalls).toBe(1);
    provider.destroy();
  });

  test('does not refresh or sign out on 403', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'forbidden';
    saveSession(storage, storageKey, {
      access_token: 'access',
      refresh_token: 'refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'Bearer',
    });
    let refreshCalls = 0;
    const fetcher = asFetcher((input) => {
      if (requestUrl(input) === endpoints.token_endpoint) refreshCalls += 1;
      return new Response(null, { status: 403 });
    });
    const provider = createProvider({ storage, storageKey, fetcher });

    const response = await provider.createAuthenticatedFetch()('https://api.test/admin');

    expect(response.status).toBe(403);
    expect(refreshCalls).toBe(0);
    expect(await provider.getSession()).not.toBeNull();
    expect(await provider.onError?.({ statusCode: 403 })).toEqual({});
    expect(await provider.onError?.({ statusCode: 403, code: 'invalid_token' })).toEqual({});
    provider.destroy();
  });

  test('20 concurrent 401 responses share one refresh result', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'concurrent-401';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'refresh-1',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'Bearer',
    });
    let refreshCalls = 0;
    const fetcher = asFetcher(async (input, init) => {
      if (requestUrl(input) === endpoints.token_endpoint) {
        refreshCalls += 1;
        await Promise.resolve();
        return jsonResponse({
          access_token: 'new-access',
          refresh_token: 'refresh-2',
          expires_in: 3600,
        });
      }
      const token = requestHeaders(input, init).get('Authorization');
      return new Response(null, { status: token === 'Bearer old-access' ? 401 : 200 });
    });
    const provider = createProvider({ storage, storageKey, fetcher });
    const authFetch = provider.createAuthenticatedFetch();

    const responses = await Promise.all(Array.from(
      { length: 20 },
      (_, index) => authFetch(`https://api.test/items/${index}`),
    ));

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(refreshCalls).toBe(1);
    provider.destroy();
  });

  test('fails explicitly when the original Request body is already consumed', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'used-body';
    saveSession(storage, storageKey, {
      access_token: 'access',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => new Response(null, { status: 200 })),
    });
    const request = new Request('https://api.test/items', {
      method: 'POST',
      body: 'already-used',
    });
    await request.text();

    await expect(provider.createAuthenticatedFetch()(request)).rejects.toMatchObject({
      code: 'request_not_replayable',
    });
    provider.destroy();
  });
});

describe('logout and SSR behavior', () => {
  test('navigates the discovered end-session endpoint without an ID token hint', async () => {
    const location = { href: 'https://app.test/' };
    Object.defineProperty(globalThis, 'window', {
      value: { location } as unknown as Window,
      configurable: true,
    });
    const storage = createMemoryStorage();
    const storageKey = 'logout-without-id-token';
    saveSession(storage, storageKey, {
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'Bearer',
    });
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'https://app.test/callback',
      postLogoutRedirectUri: 'https://app.test/signed-out',
      storage,
      storageKey,
      autoRefresh: false,
      manualEndpoints: endpoints,
    });

    expect(await provider.logout()).toEqual({ success: true });
    const logoutUrl = new URL(location.href);
    expect(`${logoutUrl.origin}${logoutUrl.pathname}`).toBe(endpoints.end_session_endpoint);
    expect(logoutUrl.searchParams.get('client_id')).toBe('admin-console');
    expect(logoutUrl.searchParams.get('id_token_hint')).toBeNull();
    expect(logoutUrl.searchParams.get('post_logout_redirect_uri')).toBe(
      'https://app.test/signed-out',
    );
    expect(storage.getItem(sessionKey(storageKey))).toBeNull();
    provider.destroy();
  });

  test('uses an explicit end-session endpoint without discovery', async () => {
    const location = { href: 'https://app.test/' };
    Object.defineProperty(globalThis, 'window', {
      value: { location } as unknown as Window,
      configurable: true,
    });
    const storage = createMemoryStorage();
    const storageKey = 'explicit-end-session-endpoint';
    storage.setItem(`${storageKey}_state`, 'pending-state');
    storage.setItem(`${storageKey}_pkce_verifier`, 'pending-verifier');
    saveSession(storage, storageKey, {
      access_token: 'access',
      id_token: 'id-token',
      token_type: 'bearer',
    });
    let discoveryCalls = 0;
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'https://app.test/callback',
      postLogoutRedirectUri: 'https://app.test/signed-out',
      endSessionEndpoint: 'https://public-idp.test/logout?tenant=default#signed-out',
      storage,
      storageKey,
      autoRefresh: false,
      fetcher: asFetcher(() => {
        discoveryCalls += 1;
        throw new TypeError('discovery unavailable');
      }),
    });

    expect(await provider.logout()).toEqual({ success: true });
    const logoutUrl = new URL(location.href);
    expect(`${logoutUrl.origin}${logoutUrl.pathname}`).toBe('https://public-idp.test/logout');
    expect(logoutUrl.searchParams.get('tenant')).toBe('default');
    expect(logoutUrl.searchParams.get('client_id')).toBe('admin-console');
    expect(logoutUrl.searchParams.get('id_token_hint')).toBe('id-token');
    expect(logoutUrl.searchParams.get('post_logout_redirect_uri')).toBe(
      'https://app.test/signed-out',
    );
    expect(logoutUrl.hash).toBe('#signed-out');
    expect(discoveryCalls).toBe(0);
    expect(storage.getItem(sessionKey(storageKey))).toBeNull();
    expect(storage.getItem(`${storageKey}_state`)).toBeNull();
    expect(storage.getItem(`${storageKey}_pkce_verifier`)).toBeNull();
    provider.destroy();
  });

  test('explicit end-session endpoint overrides the discovered endpoint', async () => {
    const location = { href: 'https://app.test/' };
    Object.defineProperty(globalThis, 'window', {
      value: { location } as unknown as Window,
      configurable: true,
    });
    const storage = createMemoryStorage();
    const storageKey = 'override-discovered-end-session-endpoint';
    saveSession(storage, storageKey, {
      access_token: 'access',
      id_token: 'id-token',
      token_type: 'Bearer',
    });
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'https://app.test/callback',
      endSessionEndpoint: 'https://public-idp.test/configured-logout',
      storage,
      storageKey,
      autoRefresh: false,
      fetcher: asFetcher(() => jsonResponse({
        authorization_endpoint: endpoints.authorization_endpoint,
        token_endpoint: endpoints.token_endpoint,
        userinfo_endpoint: endpoints.userinfo_endpoint,
        end_session_endpoint: 'https://discovered-idp.test/logout',
      })),
    });

    expect(await provider.logout()).toEqual({ success: true });
    expect(new URL(location.href).origin).toBe('https://public-idp.test');
    expect(new URL(location.href).pathname).toBe('/configured-logout');
    provider.destroy();
  });

  test('overwrites persisted tokens when storage removal fails', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'logout-remove-failure';
    saveSession(storage, storageKey, {
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'Bearer',
    });
    const originalRemoveItem = storage.removeItem;
    storage.removeItem = (key) => {
      if (key === sessionKey(storageKey)) throw new DOMException('blocked', 'SecurityError');
      originalRemoveItem(key);
    };
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => { throw new TypeError('offline'); }),
    });

    const result = await provider.logout();

    expect(result.success).toBe(true);
    expect(storage.getItem(sessionKey(storageKey))).toBe('');
    expect(await provider.getSession()).toBeNull();
    provider.destroy();
  });

  test('fails closed in memory when storage cannot remove or overwrite tokens', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'logout-persistence-failure';
    saveSession(storage, storageKey, {
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'Bearer',
    });
    const originalSetItem = storage.setItem;
    const originalRemoveItem = storage.removeItem;
    storage.setItem = (key, value) => {
      if (key === sessionKey(storageKey) && value === '') throw new DOMException('blocked', 'SecurityError');
      originalSetItem(key, value);
    };
    storage.removeItem = (key) => {
      if (key === sessionKey(storageKey)) throw new DOMException('blocked', 'SecurityError');
      originalRemoveItem(key);
    };
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => { throw new TypeError('offline'); }),
    });

    await expect(provider.logout()).rejects.toMatchObject({
      code: 'session_persistence_failed',
      retryable: false,
    });
    expect(await provider.getSession()).toBeNull();
    provider.destroy();
  });

  test('does not revive a failed local logout from a remote refresh event', async () => {
    let storageListener: ((event: StorageEvent) => void) | undefined;
    Object.defineProperty(globalThis, 'window', {
      value: {
        navigator: {},
        addEventListener: (type: string, listener: (event: StorageEvent) => void) => {
          if (type === 'storage') storageListener = listener;
        },
        removeEventListener: () => undefined,
      } as unknown as Window,
      configurable: true,
    });
    const storage = createMemoryStorage();
    const storageKey = 'logout-no-revival';
    saveSession(storage, storageKey, {
      access_token: 'old-access',
      refresh_token: 'old-refresh',
      token_type: 'Bearer',
    });
    const originalSetItem = storage.setItem;
    const originalRemoveItem = storage.removeItem;
    storage.setItem = (key, value) => {
      if (key === sessionKey(storageKey) && value === '') {
        throw new DOMException('blocked', 'SecurityError');
      }
      originalSetItem(key, value);
    };
    storage.removeItem = (key) => {
      if (key === sessionKey(storageKey)) throw new DOMException('blocked', 'SecurityError');
      originalRemoveItem(key);
    };
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => { throw new TypeError('offline'); }),
    });

    await expect(provider.logout()).rejects.toMatchObject({ code: 'session_persistence_failed' });
    const remoteRaw = JSON.stringify({
      access_token: 'remote-access',
      refresh_token: 'remote-refresh',
      token_type: 'Bearer',
    });
    originalSetItem(sessionKey(storageKey), remoteRaw);
    storageListener?.({
      key: sessionKey(storageKey),
      newValue: remoteRaw,
    } as StorageEvent);

    expect(await provider.getSession()).toBeNull();
    provider.destroy();
  });

  test('clears local state before best-effort discovery failure', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'logout';
    saveSession(storage, storageKey, {
      access_token: 'access',
      id_token: 'id-token',
      refresh_token: 'refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'Bearer',
    });
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'https://app.test/callback',
      postLogoutRedirectUri: '/signed-out',
      storage,
      storageKey,
      autoRefresh: false,
      fetcher: asFetcher(() => { throw new TypeError('offline'); }),
    });

    const result = await provider.logout();

    expect(result).toEqual({ success: true, redirectTo: '/signed-out' });
    expect(storage.getItem(sessionKey(storageKey))).toBeNull();
    provider.destroy();
  });

  test('supports SSR with injected storage and no window', async () => {
    Reflect.deleteProperty(globalThis, 'window');
    const storage = createMemoryStorage();
    const storageKey = 'ssr';
    saveSession(storage, storageKey, {
      access_token: 'access',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'Bearer',
    });
    const provider = createProvider({
      storage,
      storageKey,
      fetcher: asFetcher(() => new Response(null, { status: 200 })),
    });

    expect(await provider.check()).toEqual({ authenticated: true });
    expect(await provider.getAccessToken()).toBe('access');
    provider.destroy();
  });
});
