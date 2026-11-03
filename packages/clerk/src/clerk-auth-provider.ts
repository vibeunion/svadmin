import type { AuthProvider, AuthActionResult, CheckResult, Identity } from '@svadmin/core';

export interface ClerkUserLike {
  id: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
  imageUrl?: string | null;
  publicMetadata?: Record<string, unknown>;
}

export interface ClerkClientLike {
  user?: ClerkUserLike | null;
  session?: { id: string } | null;
  loaded?: boolean;
  openSignIn?: (options?: Record<string, unknown>) => void;
  signOut?: (options?: Record<string, unknown>) => Promise<void>;
  redirectToSignIn?: (options?: Record<string, unknown>) => Promise<unknown> | void;
}

export interface ClerkAuthOptions {
  signInUrl?: string;
  rolesKey?: string;
  defaultRole?: string;
}

export function createClerkAuthProvider(
  clerk: ClerkClientLike,
  options: ClerkAuthOptions = {},
): AuthProvider {
  const rolesKey = options.rolesKey ?? 'role';

  return {
    async login(params?: Record<string, unknown>): Promise<AuthActionResult> {
      if (clerk.openSignIn) {
        clerk.openSignIn(params);
        return { success: true };
      }
      if (clerk.redirectToSignIn) {
        await clerk.redirectToSignIn(params);
        return { success: true };
      }
      if (options.signInUrl && typeof window !== 'undefined') {
        window.location.href = options.signInUrl;
        return { success: true };
      }
      return { success: true };
    },

    async logout(params?: Record<string, unknown>): Promise<AuthActionResult> {
      if (clerk.signOut) {
        await clerk.signOut(params);
      }
      return { success: true, redirectTo: options.signInUrl ?? '/login' };
    },

    async check(): Promise<CheckResult> {
      const authenticated = Boolean(clerk.user && clerk.session);
      return {
        authenticated,
        redirectTo: authenticated ? undefined : (options.signInUrl ?? '/login'),
      };
    },

    async getIdentity(): Promise<Identity | null> {
      const user = clerk.user;
      if (!user) return null;
      const computedName = user.fullName ?? [user.firstName, user.lastName].filter(Boolean).join(' ');
      return {
        id: user.id,
        name: computedName || undefined,
        email: user.primaryEmailAddress?.emailAddress,
        avatar: user.imageUrl ?? undefined,
      };
    },

    async getPermissions(): Promise<unknown> {
      const user = clerk.user;
      if (!user) return null;
      const metadata = user.publicMetadata ?? {};
      const roles = metadata[rolesKey] ?? options.defaultRole ?? 'user';
      return roles;
    },
  };
}
