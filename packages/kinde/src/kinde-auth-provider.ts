import type {
  AuthProvider,
  AuthActionResult,
  CheckResult,
  Identity,
  AuthErrorResult,
} from '@svadmin/core';

export interface KindeUserLike {
  id: string;
  given_name?: string | null;
  family_name?: string | null;
  email?: string | null;
  picture?: string | null;
  [key: string]: unknown;
}

export interface KindeClientLike {
  isAuthenticated: () => Promise<boolean>;
  getUser: () => Promise<KindeUserLike | undefined>;
  getUserProfile?: () => Promise<KindeUserLike | undefined>;
  login?: (options?: Record<string, unknown>) => Promise<void>;
  register?: (options?: Record<string, unknown>) => Promise<void>;
  logout?: (options?: Record<string, unknown>) => Promise<void> | void;
  getToken?: () => Promise<string>;
  getPermissions?: () => Promise<{ permissions: string[]; orgCode?: string } | undefined>;
  getOrganization?: () => Promise<{ orgCode: string } | undefined>;
}

export interface KindeAuthOptions {
  /** Fallback login redirect path or URL */
  loginUrl?: string;
  /** Return URI after logout. Defaults to '/' */
  logoutRedirectUri?: string;
  /** Default fallback role when no permissions are found. Defaults to 'user' */
  defaultRole?: string;
}

export function createKindeAuthProvider(
  kinde: KindeClientLike,
  options: KindeAuthOptions = {},
): AuthProvider {
  const defaultRole = options.defaultRole ?? 'user';

  return {
    async login(params: Record<string, unknown> = {}): Promise<AuthActionResult> {
      try {
        if (kinde.login) {
          await kinde.login(params);
          return { success: true };
        }
        if (options.loginUrl && typeof window !== 'undefined') {
          window.location.href = options.loginUrl;
          return { success: true };
        }
        return {
          success: false,
          error: {
            name: 'KINDE_NOT_CONFIGURED',
            message: 'Kinde client login method is not available.',
          },
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        return {
          success: false,
          error: {
            name: error.name || 'KINDE_LOGIN_ERROR',
            message: error.message,
          },
        };
      }
    },

    async logout(params?: Record<string, unknown>): Promise<AuthActionResult> {
      const returnTo = options.logoutRedirectUri ?? (typeof window !== 'undefined' ? window.location.origin : '/');
      if (kinde.logout) {
        await kinde.logout(params);
      }
      return { success: true, redirectTo: returnTo };
    },

    async check(): Promise<CheckResult> {
      try {
        const authenticated = await kinde.isAuthenticated();
        if (authenticated) {
          return { authenticated: true };
        }
        return {
          authenticated: false,
          ...(options.loginUrl ? { redirectTo: options.loginUrl } : {}),
        };
      } catch {
        return {
          authenticated: false,
          ...(options.loginUrl ? { redirectTo: options.loginUrl } : {}),
        };
      }
    },

    async getIdentity(): Promise<Identity | null> {
      const user = (await kinde.getUserProfile?.()) ?? (await kinde.getUser());
      if (!user) return null;

      const parts = [user.given_name, user.family_name].filter(Boolean);
      const computedName = parts.length > 0 ? parts.join(' ') : 'Anonymous User';

      return {
        id: user.id ?? 'unknown',
        name: computedName,
        ...(user.email ? { email: user.email } : {}),
        ...(user.picture ? { avatar: user.picture } : {}),
      };
    },

    async getPermissions(): Promise<unknown> {
      const perms = await kinde.getPermissions?.();
      if (perms?.permissions && perms.permissions.length > 0) {
        return perms.permissions;
      }
      return [defaultRole];
    },

    async onError(error: unknown): Promise<AuthErrorResult> {
      const status = (error as { status?: number; statusCode?: number })?.status ??
        (error as { status?: number; statusCode?: number })?.statusCode;
      if (status === 401 || status === 403) {
        return {
          logout: true,
          redirectTo: options.loginUrl ?? '/login',
        };
      }
      return {};
    },
  };
}
