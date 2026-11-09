import type { AuthProvider, AuthActionResult, CheckResult, Identity, AuthErrorResult } from '@svadmin/core';

export interface Auth0UserLike {
  sub?: string;
  name?: string | null;
  nickname?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  email?: string | null;
  picture?: string | null;
  [key: string]: unknown;
}

export interface Auth0ClientLike {
  isAuthenticated: () => Promise<boolean>;
  getUser: () => Promise<Auth0UserLike | undefined>;
  getIdTokenClaims?: () => Promise<Record<string, unknown> | undefined>;
  loginWithRedirect?: (options?: Record<string, unknown>) => Promise<void>;
  loginWithPopup?: (options?: Record<string, unknown>) => Promise<void>;
  logout?: (options?: Record<string, unknown>) => Promise<void> | void;
  getTokenSilently?: (options?: Record<string, unknown>) => Promise<string>;
}

export interface Auth0AuthOptions {
  /** Custom claims key for roles, e.g. 'https://svadmin.dev/roles' or 'roles'. Defaults to 'roles' */
  rolesKey?: string;
  /** Custom claims key for permissions. Defaults to 'permissions' */
  permissionsKey?: string;
  /** Fallback default role when no role claim exists. Defaults to 'user' */
  defaultRole?: string;
  /** Return URI after logout. Defaults to '/' */
  logoutRedirectUri?: string;
  /** Fallback login redirect path or URL */
  loginUrl?: string;
  /** Login invocation mode: 'redirect' or 'popup'. Defaults to 'redirect' */
  loginMode?: 'redirect' | 'popup';
}

function asInternalRedirect(value: string | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return undefined;
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x20 || code === 0x7f) return undefined;
  }
  return value;
}

export function createAuth0AuthProvider(
  auth0: Auth0ClientLike,
  options: Auth0AuthOptions = {},
): AuthProvider {
  const rolesKey = options.rolesKey ?? 'roles';
  const permissionsKey = options.permissionsKey ?? 'permissions';
  const defaultRole = options.defaultRole ?? 'user';
  const loginMode = options.loginMode ?? 'redirect';

  return {
    async login(params: Record<string, unknown> = {}): Promise<AuthActionResult> {
      try {
        if (loginMode === 'popup' && auth0.loginWithPopup) {
          await auth0.loginWithPopup(params);
          return { success: true };
        }
        if (auth0.loginWithRedirect) {
          await auth0.loginWithRedirect(params);
          return { success: true };
        }
        if (options.loginUrl && typeof window !== 'undefined') {
          window.location.href = options.loginUrl;
          return { success: true };
        }
        return {
          success: false,
          error: {
            name: 'AUTH0_NOT_CONFIGURED',
            message: 'Auth0 client login method is not available.',
          },
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        return {
          success: false,
          error: {
            name: error.name || 'AUTH0_LOGIN_ERROR',
            message: error.message,
          },
        };
      }
    },

    async logout(params?: Record<string, unknown>): Promise<AuthActionResult> {
      const returnTo = options.logoutRedirectUri ?? (typeof window !== 'undefined' ? window.location.origin : '/');
      if (auth0.logout) {
        await auth0.logout({
          logoutParams: { returnTo },
          ...params,
        });
      }
      const redirectTo = asInternalRedirect(returnTo);
      return redirectTo ? { success: true, redirectTo } : { success: true };
    },

    async check(): Promise<CheckResult> {
      try {
        const authenticated = await auth0.isAuthenticated();
        if (authenticated) {
          return { authenticated: true };
        }
        const redirectTo = asInternalRedirect(options.loginUrl);
        return { authenticated: false, ...(redirectTo ? { redirectTo } : {}) };
      } catch {
        const redirectTo = asInternalRedirect(options.loginUrl);
        return { authenticated: false, ...(redirectTo ? { redirectTo } : {}) };
      }
    },

    async getIdentity(): Promise<Identity | null> {
      const user = await auth0.getUser();
      if (!user) return null;

      const joinedName = [user.given_name, user.family_name].filter(Boolean).join(' ');
      const computedName =
        user.name ??
        user.nickname ??
        (joinedName.length > 0 ? joinedName : 'Anonymous User');

      return {
        id: user.sub ?? 'unknown',
        name: computedName,
        ...(user.email ? { email: user.email } : {}),
        ...(user.picture ? { avatar: user.picture } : {}),
      };
    },

    async getPermissions(): Promise<unknown> {
      const claims = (await auth0.getIdTokenClaims?.()) ?? (await auth0.getUser()) ?? {};
      const roles = claims[rolesKey] ?? claims[permissionsKey] ?? defaultRole;
      return roles;
    },

    async onError(error: unknown): Promise<AuthErrorResult> {
      const status = (error as { status?: number; statusCode?: number })?.status ??
        (error as { status?: number; statusCode?: number })?.statusCode;
      if (status === 401 || status === 403) {
        const redirectTo = asInternalRedirect(options.loginUrl);
        return {
          logout: true,
          ...(redirectTo ? { redirectTo } : { redirectTo: '/login' }),
        };
      }
      return {};
    },
  };
}
