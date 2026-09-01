/**
 * @svadmin/sso — Presets Unit Tests
 */
import { afterEach, describe, test, expect } from 'bun:test';
import type { TokenStorage } from './auth-provider';

const originalFetch = globalThis.fetch;

function installWindow(href = 'http://app.test/'): { location: { href: string; origin: string } } {
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
  return testWindow;
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function asFetcher(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): typeof fetch {
  return handler as typeof fetch;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
  Object.defineProperty(globalThis, 'fetch', {
    value: originalFetch,
    configurable: true,
    writable: true,
  });
});

// In-memory storage for tests (localStorage not available in Bun test)
function createMemoryStorage(): TokenStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
}

describe('SSO presets', () => {
  // Import the module to verify it compiles correctly
  test('presets module exports all factories', async () => {
    const presets = await import('./presets');
    expect(typeof presets.createGoogleAuth).toBe('function');
    expect(typeof presets.createMicrosoftAuth).toBe('function');
    expect(typeof presets.createGitHubAuth).toBe('function');
    expect(typeof presets.createGitLabAuth).toBe('function');
    expect(typeof presets.createKeycloakAuth).toBe('function');
    expect(typeof presets.createAuth0Auth).toBe('function');
    expect(typeof presets.createSupauthAuth).toBe('function');
  });

  test('createGoogleAuth returns AuthProvider', async () => {
    const { createGoogleAuth } = await import('./presets');
    const provider = createGoogleAuth('test-client-id', {
      redirectUri: 'http://localhost/callback',
      storage: createMemoryStorage(),
    });
    expect(provider).toBeTruthy();
    expect(typeof provider.login).toBe('function');
    expect(typeof provider.logout).toBe('function');
    expect(typeof provider.check).toBe('function');
    expect(typeof provider.getIdentity).toBe('function');
  });

  test('createMicrosoftAuth accepts tenantId', async () => {
    const { createMicrosoftAuth } = await import('./presets');
    const provider = createMicrosoftAuth('test-id', 'my-tenant', {
      redirectUri: 'http://localhost/callback',
      storage: createMemoryStorage(),
    });
    expect(provider).toBeTruthy();
    expect(typeof provider.login).toBe('function');
  });

  test('createGitHubAuth returns AuthProvider', async () => {
    const { createGitHubAuth } = await import('./presets');
    const provider = createGitHubAuth('test-github-id', {
      redirectUri: 'http://localhost/callback',
      storage: createMemoryStorage(),
    });
    expect(provider).toBeTruthy();
    expect(typeof provider.login).toBe('function');
    expect(typeof provider.getIdentity).toBe('function');
  });

  test('createKeycloakAuth returns AuthProvider', async () => {
    const { createKeycloakAuth } = await import('./presets');
    const provider = createKeycloakAuth('https://kc.example.com', 'my-realm', 'client-id', {
      redirectUri: 'http://localhost/callback',
      storage: createMemoryStorage(),
    });
    expect(provider).toBeTruthy();
    expect(typeof provider.login).toBe('function');
  });

  test('createAuth0Auth returns AuthProvider', async () => {
    const { createAuth0Auth } = await import('./presets');
    const provider = createAuth0Auth('my-tenant.auth0.com', 'client-id', {
      redirectUri: 'http://localhost/callback',
      storage: createMemoryStorage(),
    });
    expect(provider).toBeTruthy();
    expect(typeof provider.login).toBe('function');
  });

  test('createGitLabAuth returns AuthProvider', async () => {
    const { createGitLabAuth } = await import('./presets');
    const provider = createGitLabAuth('test-id', 'https://gitlab.example.com', {
      redirectUri: 'http://localhost/callback',
      storage: createMemoryStorage(),
    });
    expect(provider).toBeTruthy();
    expect(typeof provider.login).toBe('function');
  });

  test('normalizes a Supauth public root for discovery and PKCE authorization', async () => {
    const { createSupauthAuth } = await import('./presets');
    const testWindow = installWindow();
    const calls: string[] = [];
    const provider = createSupauthAuth('admin-console', {
      issuer: 'https://auth.example.test/',
      redirectUri: 'http://app.test/callback',
      storage: createMemoryStorage(),
      autoRefresh: false,
      fetcher: asFetcher(async (input) => {
        calls.push(input instanceof Request ? input.url : String(input));
        return jsonResponse({
          authorization_endpoint: 'https://auth.example.test/auth/v1/oauth/authorize',
          token_endpoint: 'https://auth.example.test/auth/v1/oauth/token',
          userinfo_endpoint: 'https://auth.example.test/auth/v1/oauth/userinfo',
        });
      }),
    });

    expect(await provider.login({})).toEqual({ success: true });
    expect(calls).toEqual([
      'https://auth.example.test/auth/v1/.well-known/openid-configuration',
    ]);
    const redirect = new URL(testWindow.location.href);
    expect(`${redirect.origin}${redirect.pathname}`).toBe(
      'https://auth.example.test/auth/v1/oauth/authorize',
    );
    expect(redirect.searchParams.get('client_id')).toBe('admin-console');
    expect(redirect.searchParams.get('code_challenge_method')).toBe('S256');
    expect(redirect.searchParams.get('code_challenge')).toBeTruthy();
    provider.destroy();
  });

  test('does not duplicate an existing Supauth auth API path', async () => {
    const { createSupauthAuth } = await import('./presets');
    installWindow();
    const calls: string[] = [];
    const provider = createSupauthAuth('admin-console', {
      issuer: 'https://auth.example.test/auth/v1/',
      redirectUri: 'http://app.test/callback',
      storage: createMemoryStorage(),
      autoRefresh: false,
      fetcher: asFetcher(async (input) => {
        calls.push(input instanceof Request ? input.url : String(input));
        return jsonResponse({
          authorization_endpoint: 'https://auth.example.test/auth/v1/oauth/authorize',
          token_endpoint: 'https://auth.example.test/auth/v1/oauth/token',
          userinfo_endpoint: 'https://auth.example.test/auth/v1/oauth/userinfo',
        });
      }),
    });

    expect(await provider.login({})).toEqual({ success: true });
    expect(calls).toEqual([
      'https://auth.example.test/auth/v1/.well-known/openid-configuration',
    ]);
    provider.destroy();
  });

  test('uses the Supauth hosted logout endpoint without discovery', async () => {
    const { createSupauthAuth } = await import('./presets');
    const storage = createMemoryStorage();
    const storageKey = `svadmin_sso:${encodeURIComponent('https://auth.example.test')}:${encodeURIComponent('admin-console')}`;
    storage.setItem(`${storageKey}_tokens`, JSON.stringify({
      access_token: 'access-token',
      id_token: 'id-token',
      token_type: 'Bearer',
    }));
    const testWindow = installWindow();
    let discoveryCalls = 0;
    const provider = createSupauthAuth('admin-console', {
      issuer: 'https://auth.example.test',
      redirectUri: 'http://app.test/callback',
      postLogoutRedirectUri: 'http://app.test/signed-out',
      storage,
      autoRefresh: false,
      fetcher: asFetcher(async () => {
        discoveryCalls += 1;
        throw new TypeError('discovery should not run');
      }),
    });

    expect(await provider.logout()).toEqual({ success: true });
    const logout = new URL(testWindow.location.href);
    expect(`${logout.origin}${logout.pathname}`).toBe('https://auth.example.test/logout');
    expect(logout.searchParams.get('client_id')).toBe('admin-console');
    expect(logout.searchParams.get('id_token_hint')).toBe('id-token');
    expect(logout.searchParams.get('post_logout_redirect_uri')).toBe(
      'http://app.test/signed-out',
    );
    expect(discoveryCalls).toBe(0);
    expect(storage.getItem(`${storageKey}_tokens`)).toBeNull();
    provider.destroy();
  });

  test('maps a canonical Supauth auth issuer to the hosted root logout', async () => {
    const { createSupauthAuth } = await import('./presets');
    const testWindow = installWindow();
    const provider = createSupauthAuth('admin-console', {
      issuer: 'https://auth.example.test/auth/v1/',
      redirectUri: 'http://app.test/callback',
      storage: createMemoryStorage(),
      autoRefresh: false,
    });

    expect(await provider.logout()).toEqual({ success: true });
    const logout = new URL(testWindow.location.href);
    expect(`${logout.origin}${logout.pathname}`).toBe('https://auth.example.test/logout');
    provider.destroy();
  });

  test('preserves an explicit Supauth logout endpoint override', async () => {
    const { createSupauthAuth } = await import('./presets');
    const testWindow = installWindow();
    const provider = createSupauthAuth('admin-console', {
      issuer: 'https://auth.example.test',
      redirectUri: 'http://app.test/callback',
      endSessionEndpoint: 'https://gateway.example.test/sign-out?tenant=acme',
      storage: createMemoryStorage(),
      autoRefresh: false,
    });

    expect(await provider.logout()).toEqual({ success: true });
    const logout = new URL(testWindow.location.href);
    expect(`${logout.origin}${logout.pathname}`).toBe('https://gateway.example.test/sign-out');
    expect(logout.searchParams.get('tenant')).toBe('acme');
    provider.destroy();
  });

  test('preserves a manual Supauth logout endpoint over the hosted default', async () => {
    const { createSupauthAuth } = await import('./presets');
    const testWindow = installWindow();
    const provider = createSupauthAuth('admin-console', {
      issuer: 'https://auth.example.test',
      redirectUri: 'http://app.test/callback',
      manualEndpoints: {
        authorization_endpoint: 'https://gateway.example.test/authorize',
        token_endpoint: 'https://gateway.example.test/token',
        userinfo_endpoint: 'https://gateway.example.test/userinfo',
        end_session_endpoint: 'https://gateway.example.test/sign-out?tenant=acme',
      },
      storage: createMemoryStorage(),
      autoRefresh: false,
    });

    expect(await provider.logout()).toEqual({ success: true });
    const logout = new URL(testWindow.location.href);
    expect(`${logout.origin}${logout.pathname}`).toBe('https://gateway.example.test/sign-out');
    expect(logout.searchParams.get('tenant')).toBe('acme');
    provider.destroy();
  });

  test('derives isolated storage namespaces for Supauth clients', async () => {
    const { createSupauthAuth } = await import('./presets');
    const storage = createMemoryStorage();
    const issuer = 'https://auth.example.test';
    const firstKey = `svadmin_sso:${encodeURIComponent(issuer)}:${encodeURIComponent('client-a')}_tokens`;
    const secondKey = `svadmin_sso:${encodeURIComponent(issuer)}:${encodeURIComponent('client-b')}_tokens`;
    storage.setItem(firstKey, JSON.stringify({
      access_token: 'access-a',
      token_type: 'Bearer',
    }));
    storage.setItem(secondKey, JSON.stringify({
      access_token: 'access-b',
      token_type: 'Bearer',
    }));

    const first = createSupauthAuth('client-a', {
      issuer,
      redirectUri: 'http://localhost/callback',
      storage,
      autoRefresh: false,
    });
    const second = createSupauthAuth('client-b', {
      issuer,
      redirectUri: 'http://localhost/callback',
      storage,
      autoRefresh: false,
    });

    expect((await first.getSession())?.access_token).toBe('access-a');
    expect((await second.getSession())?.access_token).toBe('access-b');
    first.destroy();
    second.destroy();
  });

  test('migrates a legacy preset session only when the new namespace is empty', async () => {
    const { createGoogleAuth } = await import('./presets');
    const storage = createMemoryStorage();
    storage.setItem('svadmin_sso_tokens', JSON.stringify({
      access_token: 'legacy-access',
      refresh_token: 'legacy-refresh',
      token_type: 'Bearer',
    }));

    const provider = createGoogleAuth('legacy-client', {
      redirectUri: 'http://localhost/callback',
      storage,
      legacyStorageKey: 'svadmin_sso',
      autoRefresh: false,
    });

    expect((await provider.getSession())?.access_token).toBe('legacy-access');
    expect(storage.getItem('svadmin_sso_tokens')).toBeNull();
    expect(storage.getItem(
      `svadmin_sso:${encodeURIComponent('https://accounts.google.com')}:${encodeURIComponent('legacy-client')}_tokens`,
    )).toContain('legacy-access');
    provider.destroy();
  });

  test('does not claim an ambiguous legacy session by default', async () => {
    const { createGoogleAuth } = await import('./presets');
    const storage = createMemoryStorage();
    storage.setItem('svadmin_sso_tokens', JSON.stringify({
      access_token: 'legacy-access',
      refresh_token: 'legacy-refresh',
      token_type: 'Bearer',
    }));

    const provider = createGoogleAuth('new-client', {
      redirectUri: 'http://localhost/callback',
      storage,
      autoRefresh: false,
    });

    expect(await provider.getSession()).toBeNull();
    expect(storage.getItem('svadmin_sso_tokens')).toContain('legacy-access');
    provider.destroy();
  });
});
