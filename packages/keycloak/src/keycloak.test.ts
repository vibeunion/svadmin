import { describe, expect, it, mock } from 'bun:test';
import { createKeycloakAuthProvider } from './keycloak-auth-provider.js';
import type { KeycloakClientLike } from './keycloak-auth-provider.js';

describe('createKeycloakAuthProvider', () => {
  it('handles login with keycloak client login method', async () => {
    const loginMock = mock().mockResolvedValue(undefined);
    const client: KeycloakClientLike = {
      login: loginMock,
    };

    const provider = createKeycloakAuthProvider(client);
    const result = await provider.login({ redirectUri: '/dashboard' });

    expect(result.success).toBe(true);
    expect(loginMock).toHaveBeenCalledWith({ redirectUri: '/dashboard' });
  });

  it('handles login error gracefully', async () => {
    const loginMock = mock().mockRejectedValue(new Error('User cancelled login'));
    const client: KeycloakClientLike = {
      login: loginMock,
    };

    const provider = createKeycloakAuthProvider(client);
    const result = await provider.login({});

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('User cancelled login');
  });

  it('handles logout with redirect uri', async () => {
    const logoutMock = mock().mockResolvedValue(undefined);
    const client: KeycloakClientLike = {
      logout: logoutMock,
    };

    const provider = createKeycloakAuthProvider(client, {
      logoutRedirectUri: '/logged-out',
    });
    const result = await provider.logout();

    expect(result.success).toBe(true);
    expect(logoutMock).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUri: '/logged-out' }),
    );
    expect(result.redirectTo).toBe('/logged-out');
  });

  it('checks authentication status and triggers silent token update', async () => {
    const updateTokenMock = mock().mockResolvedValue(true);
    const client: KeycloakClientLike = {
      authenticated: true,
      updateToken: updateTokenMock,
    };

    const provider = createKeycloakAuthProvider(client, {
      minTokenValidity: 60,
    });
    const checkResult = await provider.check();

    expect(checkResult.authenticated).toBe(true);
    expect(updateTokenMock).toHaveBeenCalledWith(60);
  });

  it('reports unauthenticated when token update fails', async () => {
    const updateTokenMock = mock().mockRejectedValue(new Error('Refresh token expired'));
    const onTokenRefreshFailed = mock();
    const client: KeycloakClientLike = {
      authenticated: true,
      updateToken: updateTokenMock,
    };

    const provider = createKeycloakAuthProvider(client, {
      loginUrl: '/auth/login',
      onTokenRefreshFailed,
    });
    const checkResult = await provider.check();

    expect(checkResult.authenticated).toBe(false);
    expect(checkResult.redirectTo).toBe('/auth/login');
    expect(onTokenRefreshFailed).toHaveBeenCalled();
  });

  it('extracts identity from token claims and user profile', async () => {
    const client: KeycloakClientLike = {
      authenticated: true,
      subject: 'kc-user-123',
      tokenParsed: {
        sub: 'kc-user-123',
        preferred_username: 'kc_admin',
        name: 'Keycloak Administrator',
        email: 'admin@keycloak.local',
        picture: 'https://keycloak.local/avatars/admin.png',
      },
      loadUserProfile: mock().mockResolvedValue({
        id: 'kc-user-123',
        firstName: 'Keycloak',
        lastName: 'Administrator',
        email: 'admin@keycloak.local',
      }),
    };

    const provider = createKeycloakAuthProvider(client);
    const identity = await provider.getIdentity();

    expect(identity).toEqual({
      id: 'kc-user-123',
      name: 'Keycloak Administrator',
      email: 'admin@keycloak.local',
      avatar: 'https://keycloak.local/avatars/admin.png',
    });
  });

  it('resolves combined realm and client resource roles', async () => {
    const client: KeycloakClientLike = {
      tokenParsed: {
        realm_access: {
          roles: ['offline_access', 'uma_authorization', 'admin'],
        },
        resource_access: {
          'svadmin-frontend': {
            roles: ['editor', 'analytics_viewer'],
          },
          'other-service': {
            roles: ['service_user'],
          },
        },
      },
    };

    // When clientId is specified, it extracts realm + that clientId
    const provider = createKeycloakAuthProvider(client, {
      clientId: 'svadmin-frontend',
      rolesSource: 'all',
    });
    const roles = await provider.getPermissions?.();

    expect(roles).toEqual(
      expect.arrayContaining(['offline_access', 'uma_authorization', 'admin', 'editor', 'analytics_viewer']),
    );
    expect(roles).not.toContain('service_user');
  });

  it('resolves only realm roles when rolesSource is realm', async () => {
    const client: KeycloakClientLike = {
      tokenParsed: {
        realm_access: {
          roles: ['realm_admin'],
        },
        resource_access: {
          'svadmin-frontend': {
            roles: ['client_admin'],
          },
        },
      },
    };

    const provider = createKeycloakAuthProvider(client, {
      clientId: 'svadmin-frontend',
      rolesSource: 'realm',
    });
    const roles = await provider.getPermissions?.();

    expect(roles).toEqual(['realm_admin']);
  });

  it('returns default fallback role when no roles found in token', async () => {
    const client: KeycloakClientLike = {
      tokenParsed: {},
    };

    const provider = createKeycloakAuthProvider(client, {
      defaultRole: 'guest',
    });
    const roles = await provider.getPermissions?.();

    expect(roles).toEqual(['guest']);
  });

  it('triggers logout on 401 or 403 API errors', async () => {
    const provider = createKeycloakAuthProvider({}, {
      loginUrl: '/auth/login',
    });

    const errorResult401 = await provider.onError?.({ status: 401 });
    expect(errorResult401).toEqual({
      logout: true,
      redirectTo: '/auth/login',
    });

    const errorResult403 = await provider.onError?.({ statusCode: 403 });
    expect(errorResult403).toEqual({
      logout: true,
      redirectTo: '/auth/login',
    });

    const errorResult500 = await provider.onError?.({ status: 500 });
    expect(errorResult500).toEqual({});
  });
});
