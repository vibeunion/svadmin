import { describe, expect, it } from 'bun:test';
import { createClerkAuthProvider, type ClerkClientLike } from './clerk-auth-provider';

describe('@svadmin/clerk AuthProvider', () => {
  it('reports unauthenticated when user or session is missing', async () => {
    const clerk: ClerkClientLike = {
      user: null,
      session: null,
      loaded: true,
    };
    const authProvider = createClerkAuthProvider(clerk, { signInUrl: '/auth/signin' });

    const check = await authProvider.check();
    expect(check.authenticated).toBe(false);
    expect(check.redirectTo).toBe('/auth/signin');

    const identity = await authProvider.getIdentity();
    expect(identity).toBeNull();
  });

  it('reports authenticated and identity when user and session exist', async () => {
    const clerk: ClerkClientLike = {
      user: {
        id: 'user_123',
        fullName: 'Jane Doe',
        primaryEmailAddress: { emailAddress: 'jane@example.com' },
        imageUrl: 'https://img.clerk.com/avatar.jpg',
        publicMetadata: { role: 'admin' },
      },
      session: { id: 'sess_abc' },
      loaded: true,
    };
    const authProvider = createClerkAuthProvider(clerk);

    const check = await authProvider.check();
    expect(check.authenticated).toBe(true);
    expect(check.redirectTo).toBeUndefined();

    const identity = await authProvider.getIdentity();
    expect(identity).not.toBeNull();
    expect(identity?.id).toBe('user_123');
    expect(identity?.name).toBe('Jane Doe');
    expect(identity?.email).toBe('jane@example.com');
    expect(identity?.avatar).toBe('https://img.clerk.com/avatar.jpg');

    const roles = await authProvider.getPermissions?.();
    expect(roles).toBe('admin');
  });

  it('calls signOut and returns success on logout', async () => {
    let signedOut = false;
    const clerk: ClerkClientLike = {
      user: { id: 'user_123' },
      session: { id: 'sess_abc' },
      signOut: async () => {
        signedOut = true;
      },
    };
    const authProvider = createClerkAuthProvider(clerk, { signInUrl: '/login' });
    const logoutRes = await authProvider.logout();
    expect(signedOut).toBe(true);
    expect(logoutRes.success).toBe(true);
    expect(logoutRes.redirectTo).toBe('/login');
  });
});
