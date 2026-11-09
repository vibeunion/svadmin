import { describe, expect, it, mock } from 'bun:test';
import { createKindeAuthProvider, type KindeClientLike, type KindeUserLike } from './index.js';

describe('createKindeAuthProvider', () => {
  const mockUser: KindeUserLike = {
    id: 'kp_12345678',
    given_name: 'Alex',
    family_name: 'Rivera',
    email: 'alex@example.com',
    picture: 'https://kinde.com/avatars/alex.png',
  };

  it('checks authenticated status from client', async () => {
    const client: KindeClientLike = {
      isAuthenticated: mock(() => Promise.resolve(true)),
      getUser: mock(() => Promise.resolve(mockUser)),
    };
    const provider = createKindeAuthProvider(client);
    const result = await provider.check();
    expect(result.authenticated).toBe(true);
  });

  it('handles unauthenticated state and redirects', async () => {
    const client: KindeClientLike = {
      isAuthenticated: mock(() => Promise.resolve(false)),
      getUser: mock(() => Promise.resolve(undefined)),
    };
    const provider = createKindeAuthProvider(client, { loginUrl: '/auth/kinde' });
    const result = await provider.check();
    expect(result.authenticated).toBe(false);
    expect(result.redirectTo).toBe('/auth/kinde');
  });

  it('retrieves identity with full name and avatar', async () => {
    const client: KindeClientLike = {
      isAuthenticated: mock(() => Promise.resolve(true)),
      getUser: mock(() => Promise.resolve(mockUser)),
    };
    const provider = createKindeAuthProvider(client);
    const identity = await provider.getIdentity?.();
    expect(identity).toEqual({
      id: 'kp_12345678',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      avatar: 'https://kinde.com/avatars/alex.png',
    });
  });

  it('extracts permissions from getPermissions', async () => {
    const client: KindeClientLike = {
      isAuthenticated: mock(() => Promise.resolve(true)),
      getUser: mock(() => Promise.resolve(mockUser)),
      getPermissions: mock(() => Promise.resolve({
        permissions: ['read:users', 'write:users', 'admin'],
        orgCode: 'org_main',
      })),
    };
    const provider = createKindeAuthProvider(client);
    const permissions = await provider.getPermissions?.();
    expect(permissions).toEqual(['read:users', 'write:users', 'admin']);
  });

  it('triggers login method on client', async () => {
    const loginMock = mock((_opts?: Record<string, unknown>) => Promise.resolve());
    const client: KindeClientLike = {
      isAuthenticated: mock(() => Promise.resolve(false)),
      getUser: mock(() => Promise.resolve(undefined)),
      login: loginMock,
    };
    const provider = createKindeAuthProvider(client);
    const result = await provider.login({ postLoginRedirectUri: '/dashboard' });
    expect(result.success).toBe(true);
    expect(loginMock).toHaveBeenCalledWith({ postLoginRedirectUri: '/dashboard' });
  });

  it('handles logout and returns redirect URL', async () => {
    const logoutMock = mock((_opts?: Record<string, unknown>) => Promise.resolve());
    const client: KindeClientLike = {
      isAuthenticated: mock(() => Promise.resolve(true)),
      getUser: mock(() => Promise.resolve(mockUser)),
      logout: logoutMock,
    };
    const provider = createKindeAuthProvider(client, {
      logoutRedirectUri: 'https://myapp.com/logout',
    });
    const result = await provider.logout();
    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe('https://myapp.com/logout');
    expect(logoutMock).toHaveBeenCalled();
  });
});
