/**
 * @svadmin/sso — Presets Unit Tests
 */
import { describe, test, expect } from 'bun:test';
import type { TokenStorage } from './auth-provider';

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
