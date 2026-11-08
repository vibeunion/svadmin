import { describe, expect, it, mock } from 'bun:test';
import { createAuth0AuthProvider, type Auth0ClientLike, type Auth0UserLike } from './index.js';

describe('createAuth0AuthProvider', () => {
  const mockUser: Auth0UserLike = {
    sub: 'auth0|123456',
    name: 'Jane Doe',
    email: 'jane@example.com',
    picture: 'https://cdn.auth0.com/avatars/jane.png',
    roles: ['admin', 'manager'],
  };

  it('reports authenticated when client confirms', async () => {
    const client: Auth0ClientLike = {
      isAuthenticated: mock(() => Promise.resolve(true)),
      getUser: mock(() => Promise.resolve(mockUser)),
    };
    const provider = createAuth0AuthProvider(client);
    const result = await provider.check();
    expect(result.authenticated).toBe(true);
  });

  it('reports unauthenticated and redirects to loginUrl when unauthenticated', async () => {
    const client: Auth0ClientLike = {
      isAuthenticated: mock(() => Promise.resolve(false)),
      getUser: mock(() => Promise.resolve(undefined)),
    };
    const provider = createAuth0AuthProvider(client, { loginUrl: '/auth/login' });
    const result = await provider.check();
    expect(result.authenticated).toBe(false);
    expect(result.redirectTo).toBe('/auth/login');
  });

  it('extracts identity profile cleanly', async () => {
    const client: Auth0ClientLike = {
      isAuthenticated: mock(() => Promise.resolve(true)),
      getUser: mock(() => Promise.resolve(mockUser)),
    };
    const provider = createAuth0AuthProvider(client);
    const identity = await provider.getIdentity?.();
    expect(identity).toEqual({
      id: 'auth0|123456',
      name: 'Jane Doe',
      email: 'jane@example.com',
      avatar: 'https://cdn.auth0.com/avatars/jane.png',
    });
  });

  it('extracts permissions and roles with custom claims key', async () => {
    const client: Auth0ClientLike = {
      isAuthenticated: mock(() => Promise.resolve(true)),
      getUser: mock(() => Promise.resolve({
        sub: 'auth0|789',
        'https://mycorp.com/roles': ['billing_admin'],
      })),
      getIdTokenClaims: mock(() => Promise.resolve({
        'https://mycorp.com/roles': ['billing_admin'],
      })),
    };
    const provider = createAuth0AuthProvider(client, {
      rolesKey: 'https://mycorp.com/roles',
    });
    const roles = await provider.getPermissions?.();
    expect(roles).toEqual(['billing_admin']);
  });

  it('triggers loginWithRedirect by default', async () => {
    const loginWithRedirect = mock(() => Promise.resolve());
    const client: Auth0ClientLike = {
      isAuthenticated: mock(() => Promise.resolve(false)),
      getUser: mock(() => Promise.resolve(undefined)),
      loginWithRedirect,
    };
    const provider = createAuth0AuthProvider(client);
    const result = await provider.login({ prompt: 'login' });
    expect(result.success).toBe(true);
    expect(loginWithRedirect).toHaveBeenCalledWith({ prompt: 'login' });
  });

  it('triggers loginWithPopup when loginMode is popup', async () => {
    const loginWithPopup = mock(() => Promise.resolve());
    const client: Auth0ClientLike = {
      isAuthenticated: mock(() => Promise.resolve(false)),
      getUser: mock(() => Promise.resolve(undefined)),
      loginWithPopup,
    };
    const provider = createAuth0AuthProvider(client, { loginMode: 'popup' });
    const result = await provider.login({});
    expect(result.success).toBe(true);
    expect(loginWithPopup).toHaveBeenCalled();
  });

  it('handles logout and returns redirect URL', async () => {
    const logout = mock(() => Promise.resolve());
    const client: Auth0ClientLike = {
      isAuthenticated: mock(() => Promise.resolve(true)),
      getUser: mock(() => Promise.resolve(mockUser)),
      logout,
    };
    const provider = createAuth0AuthProvider(client, {
      logoutRedirectUri: 'https://app.example.com/bye',
    });
    const result = await provider.logout();
    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe('https://app.example.com/bye');
    expect(logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: 'https://app.example.com/bye' },
    });
  });

  it('handles 401 error in onError hook', async () => {
    const client: Auth0ClientLike = {
      isAuthenticated: mock(() => Promise.resolve(true)),
      getUser: mock(() => Promise.resolve(mockUser)),
    };
    const provider = createAuth0AuthProvider(client, { loginUrl: '/login' });
    const errorResult = await provider.onError?.({ status: 401 });
    expect(errorResult?.logout).toBe(true);
    expect(errorResult?.redirectTo).toBe('/login');
  });
});
