import type {
  AuthProvider,
  AuthActionResult,
  CheckResult,
  Identity,
  AuthErrorResult,
} from '@svadmin/core';

export interface KeycloakTokenParsed {
  sub?: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, {
    roles?: string[];
  }>;
  [key: string]: unknown;
}

export interface KeycloakProfileLike {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface KeycloakClientLike {
  authenticated?: boolean;
  token?: string;
  tokenParsed?: KeycloakTokenParsed;
  idToken?: string;
  idTokenParsed?: KeycloakTokenParsed;
  subject?: string;
  realmAccess?: {
    roles?: string[];
  };
  resourceAccess?: Record<string, {
    roles?: string[];
  }>;
  login?: (options?: Record<string, unknown>) => Promise<void>;
  logout?: (options?: Record<string, unknown>) => Promise<void>;
  register?: (options?: Record<string, unknown>) => Promise<void>;
  accountManagement?: () => Promise<void>;
  updateToken?: (minValidity?: number) => Promise<boolean>;
  loadUserProfile?: () => Promise<KeycloakProfileLike>;
  loadUserInfo?: () => Promise<Record<string, unknown>>;
  hasRealmRole?: (role: string) => boolean;
  hasResourceRole?: (role: string, resource?: string) => boolean;
}

export interface KeycloakAuthOptions {
  /** The Keycloak Client ID used to resolve client-specific resource roles */
  clientId?: string;
  /**
   * Sources to extract roles from.
   * - 'realm': only `realm_access.roles`
   * - 'resource': only `resource_access[clientId].roles`
   * - 'all': combines both realm and client resource roles (default)
   */
  rolesSource?: 'realm' | 'resource' | 'all';
  /** Default fallback role when no roles are configured in token claims. Defaults to 'user' */
  defaultRole?: string;
  /** Fallback redirect path or URL for login */
  loginUrl?: string;
  /** Return URI after logout. Defaults to current window location origin or '/' */
  logoutRedirectUri?: string;
  /** Minimum token validity in seconds before triggering silent token refresh. Defaults to 30 */
  minTokenValidity?: number;
  /** Callback fired when token refresh fails */
  onTokenRefreshFailed?: () => void;
}

function asInternalRedirect(value: string | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return undefined;
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x20 || code === 0x7f) return undefined;
  }
  return value;
}

export function createKeycloakAuthProvider(
  keycloak: KeycloakClientLike,
  options: KeycloakAuthOptions = {},
): AuthProvider {
  const rolesSource = options.rolesSource ?? 'all';
  const defaultRole = options.defaultRole ?? 'user';
  const minTokenValidity = options.minTokenValidity ?? 30;

  return {
    async login(params: Record<string, unknown> = {}): Promise<AuthActionResult> {
      try {
        if (keycloak.login) {
          await keycloak.login(params);
          return { success: true };
        }
        if (options.loginUrl && typeof window !== 'undefined') {
          window.location.href = options.loginUrl;
          return { success: true };
        }
        return {
          success: false,
          error: {
            name: 'KEYCLOAK_NOT_CONFIGURED',
            message: 'Keycloak client login method is not available.',
          },
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        return {
          success: false,
          error: {
            name: error.name || 'KEYCLOAK_LOGIN_ERROR',
            message: error.message,
          },
        };
      }
    },

    async logout(params?: Record<string, unknown>): Promise<AuthActionResult> {
      const returnTo = options.logoutRedirectUri ?? (typeof window !== 'undefined' ? window.location.origin : '/');
      if (keycloak.logout) {
        await keycloak.logout({
          redirectUri: returnTo,
          ...params,
        });
      }
      const redirectTo = asInternalRedirect(returnTo);
      return redirectTo ? { success: true, redirectTo } : { success: true };
    },

    async check(): Promise<CheckResult> {
      try {
        if (!keycloak.authenticated) {
          const redirectTo = asInternalRedirect(options.loginUrl);
          return { authenticated: false, ...(redirectTo ? { redirectTo } : {}) };
        }

        // Silent token refresh check
        if (typeof keycloak.updateToken === 'function') {
          try {
            await keycloak.updateToken(minTokenValidity);
          } catch {
            options.onTokenRefreshFailed?.();
            const redirectTo = asInternalRedirect(options.loginUrl);
            return { authenticated: false, ...(redirectTo ? { redirectTo } : {}) };
          }
        }

        return { authenticated: true };
      } catch {
        const redirectTo = asInternalRedirect(options.loginUrl);
        return { authenticated: false, ...(redirectTo ? { redirectTo } : {}) };
      }
    },

    async getIdentity(): Promise<Identity | null> {
      if (!keycloak.authenticated && !keycloak.tokenParsed && !keycloak.subject) {
        return null;
      }

      let profile: KeycloakProfileLike | undefined;
      if (typeof keycloak.loadUserProfile === 'function') {
        try {
          profile = await keycloak.loadUserProfile();
        } catch {
          // fallback to token claims
        }
      }

      const tokenClaims = keycloak.idTokenParsed ?? keycloak.tokenParsed ?? {};

      const userId = profile?.id ?? keycloak.subject ?? tokenClaims.sub ?? 'unknown';

      const firstName = profile?.firstName ?? tokenClaims.given_name;
      const lastName = profile?.lastName ?? tokenClaims.family_name;
      const joinedName = [firstName, lastName].filter(Boolean).join(' ');

      const computedName =
        tokenClaims.name ??
        profile?.username ??
        tokenClaims.preferred_username ??
        (joinedName.length > 0 ? joinedName : 'Keycloak User');

      const email = profile?.email ?? tokenClaims.email;
      const avatar = (tokenClaims.picture as string | undefined) ?? undefined;

      return {
        id: userId,
        name: computedName,
        ...(email ? { email } : {}),
        ...(avatar ? { avatar } : {}),
      };
    },

    async getPermissions(): Promise<unknown> {
      const roles = new Set<string>();
      const tokenClaims = keycloak.tokenParsed ?? {};

      // 1. Realm roles
      if (rolesSource === 'realm' || rolesSource === 'all') {
        const realmRoles = tokenClaims.realm_access?.roles ?? keycloak.realmAccess?.roles;
        if (Array.isArray(realmRoles)) {
          for (const role of realmRoles) {
            roles.add(role);
          }
        }
      }

      // 2. Resource (Client) roles
      if (rolesSource === 'resource' || rolesSource === 'all') {
        const resourceAccess = tokenClaims.resource_access ?? keycloak.resourceAccess;
        if (resourceAccess) {
          if (options.clientId && resourceAccess[options.clientId]?.roles) {
            const clientRoles = resourceAccess[options.clientId].roles;
            if (Array.isArray(clientRoles)) {
              for (const role of clientRoles) {
                roles.add(role);
              }
            }
          } else {
            // Aggregate all resource roles if no specific clientId specified
            for (const clientKey of Object.keys(resourceAccess)) {
              const clientRoles = resourceAccess[clientKey]?.roles;
              if (Array.isArray(clientRoles)) {
                for (const role of clientRoles) {
                  roles.add(role);
                }
              }
            }
          }
        }
      }

      if (roles.size > 0) {
        return Array.from(roles);
      }

      return [defaultRole];
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
