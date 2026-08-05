import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createSSOAuthProvider, type TokenStorage } from './auth-provider';

const STORAGE_PREFIX = `svadmin_sso:${encodeURIComponent('https://idp.test')}:${encodeURIComponent('admin-console')}_`;

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function createMemoryStorage(): TokenStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
}

function installWindow(href = 'http://app.test/'): void {
  const testWindow = {
    location: {
      href,
      origin: new URL(href).origin,
    },
    history: {
      replaceState: (_state: unknown, _title: string, url: string) => {
        testWindow.location.href = new URL(url, testWindow.location.href).href;
      },
    },
  };

  Object.defineProperty(globalThis, 'window', {
    value: testWindow,
    configurable: true,
    writable: true,
  });
}

function uninstallWindow(): void {
  Reflect.deleteProperty(globalThis, 'window');
}

function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function installFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): FetchCall[] {
  const calls: FetchCall[] = [];
  Object.defineProperty(globalThis, 'fetch', {
    value: async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      const effectiveInit = input instanceof Request
        ? { method: input.method, headers: input.headers, signal: input.signal }
        : init;
      calls.push({ url, init: effectiveInit });
      return handler(url, effectiveInit);
    },
    configurable: true,
    writable: true,
  });
  return calls;
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

function uninstallFetch(): void {
  Reflect.deleteProperty(globalThis, 'fetch');
}

function formBody(init?: RequestInit): URLSearchParams {
  expect(init?.body).toBeInstanceOf(URLSearchParams);
  const body = init?.body;
  if (!(body instanceof URLSearchParams)) {
    throw new Error('Expected URLSearchParams body');
  }
  return body;
}

function jwt(payload: Record<string, unknown>): string {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${encoded}.signature`;
}

const manualEndpoints = {
  authorization_endpoint: 'https://idp.test/oauth2/authorize',
  token_endpoint: 'https://idp.test/oauth2/token',
  userinfo_endpoint: 'https://idp.test/oauth2/userinfo',
  end_session_endpoint: 'https://idp.test/oauth2/logout',
};

describe('createSSOAuthProvider', () => {
  beforeEach(() => {
    installWindow();
  });

  afterEach(() => {
    uninstallWindow();
    uninstallFetch();
  });

  test('starts OIDC authorization code flow with PKCE and custom params', async () => {
    const storage = createMemoryStorage();
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      authorizationParams: {
        audience: 'admin-api',
        prompt: 'login',
      },
      manualEndpoints,
    });

    const result = await provider.login({});
    expect(result.success).toBe(true);

    const redirectUrl = new URL(window.location.href);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe(manualEndpoints.authorization_endpoint);
    expect(redirectUrl.searchParams.get('response_type')).toBe('code');
    expect(redirectUrl.searchParams.get('client_id')).toBe('admin-console');
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://app.test/callback');
    expect(redirectUrl.searchParams.get('scope')).toBe('openid profile email');
    expect(redirectUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(redirectUrl.searchParams.get('audience')).toBe('admin-api');
    expect(redirectUrl.searchParams.get('prompt')).toBe('login');
    expect(redirectUrl.searchParams.get('state')).toBe(storage.getItem(`${STORAGE_PREFIX}state`));
    expect(storage.getItem(`${STORAGE_PREFIX}pkce_verifier`)).toBeTruthy();
    expect(redirectUrl.searchParams.get('code_challenge')).toBeTruthy();
    expect(redirectUrl.searchParams.get('code_challenge')).not.toBe(storage.getItem(`${STORAGE_PREFIX}pkce_verifier`));
  });

  test('isolates direct providers by issuer and client id without explicit storage keys', async () => {
    const storage = createMemoryStorage();
    const firstPrefix = `svadmin_sso:${encodeURIComponent('https://idp.test')}:${encodeURIComponent('client-a')}_`;
    const secondPrefix = `svadmin_sso:${encodeURIComponent('https://idp.test')}:${encodeURIComponent('client-b')}_`;
    storage.setItem(`${firstPrefix}tokens`, JSON.stringify({
      access_token: 'access-a',
      token_type: 'Bearer',
    }));
    storage.setItem(`${secondPrefix}tokens`, JSON.stringify({
      access_token: 'access-b',
      token_type: 'Bearer',
    }));
    const first = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'client-a',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });
    const second = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'client-b',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    expect((await first.getSession())?.access_token).toBe('access-a');
    expect((await second.getSession())?.access_token).toBe('access-b');
    first.destroy();
    second.destroy();
  });

  test('discovers OIDC endpoints before redirecting to the authorization server', async () => {
    const storage = createMemoryStorage();
    const calls = installFetch((url) => {
      expect(url).toBe('https://issuer.test/.well-known/openid-configuration');
      return jsonResponse(manualEndpoints);
    });
    const provider = createSSOAuthProvider({
      issuer: 'https://issuer.test/',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
    });

    const result = await provider.login({});

    expect(result.success).toBe(true);
    expect(calls).toHaveLength(1);
    expect(new URL(window.location.href).origin).toBe('https://idp.test');
  });

  test('rejects discovery documents missing required endpoints', async () => {
    const storage = createMemoryStorage();
    const calls = installFetch(() => jsonResponse({
      authorization_endpoint: manualEndpoints.authorization_endpoint,
    }));
    const provider = createSSOAuthProvider({
      issuer: 'https://issuer.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
    });

    const loginResult = await provider.login({});

    expect(loginResult.success).toBe(false);
    expect(loginResult.error?.message).toBe(
      'OIDC discovery returned incomplete endpoints: missing token_endpoint, userinfo_endpoint',
    );
    expect(calls).toHaveLength(1);
    expect(window.location.href).toBe('http://app.test/');
  });

  test('exchanges callback code, stores tokens, and preserves unrelated URL parts', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}pkce_verifier`, 'verifier-123');
    storage.setItem(`${STORAGE_PREFIX}state`, 'state-123');
    installWindow('http://app.test/callback?code=code-123&state=state-123&next=%2Fdashboard#top');

    const calls = installFetch((_url, _init) => jsonResponse({
      access_token: 'access-123',
      id_token: jwt({
        roles: ['admin'],
        groups: ['administrators'],
        permissions: ['users:delete'],
      }),
      refresh_token: 'refresh-123',
      expires_in: 3600,
      token_type: 'bearer',
    }));
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const result = await provider.check();

    expect(result).toEqual({ authenticated: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(manualEndpoints.token_endpoint);
    const body = formBody(calls[0]?.init);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('client_id')).toBe('admin-console');
    expect(body.get('code')).toBe('code-123');
    expect(body.get('redirect_uri')).toBe('http://app.test/callback');
    expect(body.get('code_verifier')).toBe('verifier-123');
    expect(window.location.href).toBe('http://app.test/callback?next=%2Fdashboard#top');
    expect(storage.getItem(`${STORAGE_PREFIX}pkce_verifier`)).toBeNull();
    expect(storage.getItem(`${STORAGE_PREFIX}state`)).toBeNull();
    expect(await provider.getAccessToken()).toBe('access-123');
    expect((await provider.getSession())?.token_type).toBe('Bearer');
    expect(provider.getPermissions).toBeUndefined();
  });

  test('does not restore a callback session after logout cancels an in-flight exchange', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}pkce_verifier`, 'verifier-123');
    storage.setItem(`${STORAGE_PREFIX}state`, 'state-123');
    installWindow('http://app.test/callback?code=code-123&state=state-123');
    const exchangeStarted = createDeferred<undefined>();
    const exchangeResponse = createDeferred<Response>();
    installFetch(() => {
      exchangeStarted.resolve(undefined);
      return exchangeResponse.promise;
    });
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const check = provider.check();
    await exchangeStarted.promise;
    await provider.logout();
    exchangeResponse.resolve(jsonResponse({
      access_token: 'post-logout-access',
      refresh_token: 'post-logout-refresh',
      token_type: 'Bearer',
    }));

    expect((await check).authenticated).toBe(false);
    expect(await provider.getSession()).toBeNull();
    provider.destroy();
  });

  test('does not let a stale callback exchange consume a newer login attempt', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}pkce_verifier`, 'old-verifier');
    storage.setItem(`${STORAGE_PREFIX}state`, 'old-state');
    installWindow('http://app.test/callback?code=old-code&state=old-state');
    const exchangeStarted = createDeferred<undefined>();
    const exchangeResponse = createDeferred<Response>();
    installFetch(() => {
      exchangeStarted.resolve(undefined);
      return exchangeResponse.promise;
    });
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const check = provider.check();
    await exchangeStarted.promise;
    expect((await provider.login({})).success).toBe(true);
    const newerState = storage.getItem(`${STORAGE_PREFIX}state`);
    expect(newerState).not.toBe('old-state');
    exchangeResponse.resolve(jsonResponse({
      access_token: 'stale-access',
      refresh_token: 'stale-refresh',
      token_type: 'Bearer',
    }));

    expect((await check).authenticated).toBe(false);
    expect(await provider.getSession()).toBeNull();
    expect(storage.getItem(`${STORAGE_PREFIX}state`)).toBe(newerState);
    provider.destroy();
  });

  test('does not restore a callback session after a remote sign-out event', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}pkce_verifier`, 'verifier-123');
    storage.setItem(`${STORAGE_PREFIX}state`, 'state-123');
    installWindow('http://app.test/callback?code=code-123&state=state-123');
    let storageListener: ((event: StorageEvent) => void) | undefined;
    Object.assign(window, {
      navigator: {},
      addEventListener: (type: string, listener: (event: StorageEvent) => void) => {
        if (type === 'storage') storageListener = listener;
      },
      removeEventListener: () => undefined,
    });
    const exchangeStarted = createDeferred<undefined>();
    const exchangeResponse = createDeferred<Response>();
    installFetch(() => {
      exchangeStarted.resolve(undefined);
      return exchangeResponse.promise;
    });
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const check = provider.check();
    await exchangeStarted.promise;
    storage.removeItem(`${STORAGE_PREFIX}pkce_verifier`);
    storage.removeItem(`${STORAGE_PREFIX}state`);
    storageListener?.({
      key: `${STORAGE_PREFIX}tokens`,
      newValue: null,
    } as StorageEvent);
    exchangeResponse.resolve(jsonResponse({
      access_token: 'post-signout-access',
      refresh_token: 'post-signout-refresh',
      token_type: 'Bearer',
    }));

    expect((await check).authenticated).toBe(false);
    expect(await provider.getSession()).toBeNull();
    provider.destroy();
  });

  test('rejects callback token responses with an empty token_type', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}pkce_verifier`, 'verifier-123');
    storage.setItem(`${STORAGE_PREFIX}state`, 'state-123');
    installWindow('http://app.test/callback?code=code-123&state=state-123');
    installFetch(() => jsonResponse({
      access_token: 'access-123',
      token_type: '',
    }));
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const result = await provider.check();

    expect(result.authenticated).toBe(false);
    expect(result.error).toMatchObject({ name: 'invalid_token_response' });
    expect(await provider.getSession()).toBeNull();
    provider.destroy();
  });

  test('rejects callback codes without matching state', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}pkce_verifier`, 'verifier-123');
    storage.setItem(`${STORAGE_PREFIX}state`, 'state-123');
    installWindow('http://app.test/callback?code=code-123&state=wrong-state');

    const calls = installFetch(() => jsonResponse({ access_token: 'access-123' }));
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const result = await provider.check();

    expect(result.authenticated).toBe(false);
    expect(result.error?.message).toBe('State mismatch');
    expect(calls).toHaveLength(0);
    expect(storage.getItem(`${STORAGE_PREFIX}pkce_verifier`)).toBe('verifier-123');
    expect(storage.getItem(`${STORAGE_PREFIX}state`)).toBe('state-123');
  });

  test('surfaces OAuth callback errors and clears transient state', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}pkce_verifier`, 'verifier-123');
    storage.setItem(`${STORAGE_PREFIX}state`, 'state-123');
    installWindow(
      'http://app.test/callback?error=access_denied&error_description=Denied&state=state-123',
    );
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const result = await provider.check();

    expect(result.authenticated).toBe(false);
    expect(result.logout).toBeUndefined();
    expect(result.error).toEqual({ message: 'Denied', name: 'access_denied' });
    expect(storage.getItem(`${STORAGE_PREFIX}pkce_verifier`)).toBeNull();
    expect(storage.getItem(`${STORAGE_PREFIX}state`)).toBeNull();
  });

  test('does not clear a valid session or newer login state for a stale OAuth error', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}tokens`, JSON.stringify({
      access_token: 'valid-access',
      token_type: 'Bearer',
    }));
    storage.setItem(`${STORAGE_PREFIX}pkce_verifier`, 'new-verifier');
    storage.setItem(`${STORAGE_PREFIX}state`, 'new-state');
    installWindow('http://app.test/callback?error=access_denied&state=old-state');
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const result = await provider.check();

    expect(result.authenticated).toBe(false);
    expect(result.logout).toBeUndefined();
    expect((await provider.getSession())?.access_token).toBe('valid-access');
    expect(storage.getItem(`${STORAGE_PREFIX}state`)).toBe('new-state');
    expect(storage.getItem(`${STORAGE_PREFIX}pkce_verifier`)).toBe('new-verifier');
    provider.destroy();
  });

  test('refreshes expired tokens during auth checks and access-token reads', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}tokens`, JSON.stringify({
      access_token: 'expired-access',
      refresh_token: 'refresh-123',
      expires_at: Math.floor(Date.now() / 1000) - 5,
      token_type: 'Bearer',
    }));
    const calls = installFetch((_url, init) => {
      const body = formBody(init);
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('client_id')).toBe('admin-console');
      expect(body.get('refresh_token')).toBe('refresh-123');
      return jsonResponse({
        access_token: 'fresh-access',
        refresh_token: 'refresh-456',
        expires_in: 3600,
        token_type: 'Bearer',
      });
    });
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const result = await provider.check();

    expect(result).toEqual({ authenticated: true });
    expect(calls).toHaveLength(1);
    expect(await provider.getAccessToken()).toBe('fresh-access');
  });

  test('rejects and removes malformed persisted token sets', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}tokens`, JSON.stringify({
      access_token: 42,
      token_type: 'Bearer',
    }));
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const authCheck = await provider.check();

    expect(authCheck).toEqual({ authenticated: false, logout: true });
    expect(storage.getItem(`${STORAGE_PREFIX}tokens`)).toBeNull();
    expect(await provider.getAccessToken()).toBeNull();
  });

  test('treats empty storage as logged out when browser Web Locks are unavailable', async () => {
    Object.assign(window, { document: {}, navigator: {} });
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage: createMemoryStorage(),
      autoRefresh: false,
      manualEndpoints,
    });

    expect(await provider.check()).toEqual({ authenticated: false, logout: true });
    provider.destroy();
  });

  test('does not clear a newer session while removing malformed persisted tokens', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}tokens`, JSON.stringify({
      access_token: 42,
      token_type: 'Bearer',
    }));
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });
    const originalGetItem = storage.getItem;
    let replaced = false;
    storage.getItem = (key) => {
      const value = originalGetItem(key);
      if (!replaced && key === `${STORAGE_PREFIX}tokens`) {
        replaced = true;
        storage.setItem(key, JSON.stringify({
          access_token: 'new-access',
          token_type: 'Bearer',
        }));
      }
      return value;
    };

    expect(await provider.getAccessToken()).toBeNull();
    expect(JSON.parse(originalGetItem(`${STORAGE_PREFIX}tokens`) ?? '{}')).toMatchObject({
      access_token: 'new-access',
    });
  });

  test('maps identity from userinfo endpoint', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}tokens`, JSON.stringify({
      access_token: 'access-123',
      token_type: 'bearer',
    }));
    const calls = installFetch((url, init) => {
      expect(url).toBe(manualEndpoints.userinfo_endpoint);
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer access-123');
      return jsonResponse({
        sub: 'user-123',
        name: 'Admin User',
        email: 'admin@example.com',
        picture: 'https://example.com/avatar.png',
      });
    });
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const identity = await provider.getIdentity();

    expect(calls).toHaveLength(1);
    expect(identity).toEqual({
      id: 'user-123',
      name: 'Admin User',
      email: 'admin@example.com',
      avatar: 'https://example.com/avatar.png',
    });
  });

  test('returns userinfo after refreshing an expired session', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}tokens`, JSON.stringify({
      access_token: 'expired-access',
      refresh_token: 'refresh-123',
      expires_at: 1,
      token_type: 'Bearer',
    }));
    const calls = installFetch((url, init) => {
      if (url === manualEndpoints.token_endpoint) {
        return jsonResponse({
          access_token: 'fresh-access',
          refresh_token: 'refresh-456',
          expires_in: 3600,
          token_type: 'Bearer',
        });
      }
      expect(url).toBe(manualEndpoints.userinfo_endpoint);
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer fresh-access');
      return jsonResponse({ sub: 'user-123', name: 'Fresh User' });
    });
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    expect(await provider.getIdentity()).toMatchObject({ id: 'user-123', name: 'Fresh User' });
    expect(calls.map(({ url }) => url)).toEqual([
      manualEndpoints.token_endpoint,
      manualEndpoints.userinfo_endpoint,
    ]);
    provider.destroy();
  });

  test('does not clear a valid session or newer login state for a stale callback', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}tokens`, JSON.stringify({
      access_token: 'valid-access',
      token_type: 'Bearer',
    }));
    storage.setItem(`${STORAGE_PREFIX}pkce_verifier`, 'new-verifier');
    storage.setItem(`${STORAGE_PREFIX}state`, 'new-state');
    installWindow('http://app.test/callback?code=old-code&state=old-state');
    const calls = installFetch(() => jsonResponse({ access_token: 'unexpected' }));
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    expect((await provider.check()).authenticated).toBe(false);
    expect((await provider.getSession())?.access_token).toBe('valid-access');
    expect(storage.getItem(`${STORAGE_PREFIX}state`)).toBe('new-state');
    expect(storage.getItem(`${STORAGE_PREFIX}pkce_verifier`)).toBe('new-verifier');
    expect(calls).toHaveLength(0);
    provider.destroy();
  });

  test('does not call userinfo without a session', async () => {
    const storage = createMemoryStorage();
    const calls = installFetch(() => jsonResponse({
      sub: 'unexpected-user',
      name: 'Unexpected User',
    }));
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    expect(await provider.getIdentity()).toBeNull();
    expect(calls).toHaveLength(0);
    provider.destroy();
  });

  test('does not call userinfo when logout wins during endpoint discovery', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}tokens`, JSON.stringify({
      access_token: 'access-123',
      token_type: 'Bearer',
    }));
    const calls = installFetch(() => jsonResponse({
      sub: 'cookie-user',
      name: 'Cookie User',
    }));
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const identity = provider.getIdentity();
    const logout = provider.logout();

    expect(await identity).toBeNull();
    expect(calls).toHaveLength(0);
    expect((await logout).success).toBe(true);
    provider.destroy();
  });

  test('does not return userinfo when logout wins after the request starts', async () => {
    const storage = createMemoryStorage();
    storage.setItem(`${STORAGE_PREFIX}tokens`, JSON.stringify({
      access_token: 'access-123',
      token_type: 'Bearer',
    }));
    const userinfoStarted = createDeferred<undefined>();
    const userinfoResponse = createDeferred<Response>();
    installFetch(() => {
      userinfoStarted.resolve(undefined);
      return userinfoResponse.promise;
    });
    const provider = createSSOAuthProvider({
      issuer: 'https://idp.test',
      clientId: 'admin-console',
      redirectUri: 'http://app.test/callback',
      storage,
      autoRefresh: false,
      manualEndpoints,
    });

    const identity = provider.getIdentity();
    await userinfoStarted.promise;
    await provider.logout();
    userinfoResponse.resolve(jsonResponse({ sub: 'stale-user', name: 'Stale User' }));

    expect(await identity).toBeNull();
    expect(await provider.getSession()).toBeNull();
    provider.destroy();
  });
});
