/**
 * @svadmin/sso — OIDC/OAuth2 SSO AuthProvider for svadmin.
 *
 * Uses the Authorization Code Flow with PKCE and supports rotation-safe
 * refresh-token handling for browser applications.
 */

import type { AuthProvider, Identity } from '@svadmin/core';
import { createAuthenticatedFetch as buildAuthenticatedFetch } from './authenticated-fetch';
import {
  createSSOAuthNetworkError,
  createSSOAuthResponseError,
  isTerminalSessionError,
  SSOAuthError,
} from './errors';
import {
  createSessionManager,
  type AuthStateChangeCallback,
  type GetAccessTokenOptions,
  type RefreshLock,
  type SSOSession,
} from './session-manager';

const DEFAULT_STORAGE_KEY = 'svadmin_sso';

export interface SSOConfig {
  /** OIDC Issuer URL (e.g., 'https://your-tenant.okta.com') */
  issuer: string;
  /** OAuth2 Client ID */
  clientId: string;
  /** Redirect URI after login (e.g., '/callback') */
  redirectUri: string;
  /** OAuth2 scopes. Default: ['openid', 'profile', 'email'] */
  scopes?: string[];
  /** Where to redirect after logout */
  postLogoutRedirectUri?: string;
  /** Optional public RP-initiated logout endpoint override. */
  endSessionEndpoint?: string;
  /** Token storage backend. Default: 'local' (localStorage) */
  storage?: 'local' | 'session' | TokenStorage;
  /** Storage namespace. Defaults to an issuer/client-specific key. */
  storageKey?: string;
  /** Explicit legacy namespace to migrate after confirming it belongs to this provider. */
  legacyStorageKey?: string;
  /** Custom identity mapper — transform OIDC userinfo to svadmin Identity */
  mapIdentity?: (userinfo: Record<string, unknown>) => Identity;
  /** Auto-refresh tokens before expiry. Default: true */
  autoRefresh?: boolean;
  /** Seconds before expiry to trigger refresh. Default: 60 */
  refreshBuffer?: number;
  /** Additional authorization request parameters, e.g. audience or prompt. */
  authorizationParams?: Record<string, string>;
  /**
   * Atomic authentication coordination lock override. Browsers use Web Locks
   * by default and fail closed when unavailable; non-browser runtimes
   * serialize within the process.
   */
  refreshLock?: RefreshLock;
  /** Injectable fetch implementation for testing and SSR runtimes. */
  fetcher?: typeof fetch;
  /**
   * Manual OAuth2 endpoints for providers that don't support OIDC discovery
   * (e.g., GitHub). When provided, OIDC auto-discovery is skipped.
   */
  manualEndpoints?: {
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
    end_session_endpoint?: string;
  };
}

export interface TokenStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface SSOAuthProvider extends AuthProvider {
  getSession: () => Promise<SSOSession | null>;
  refreshSession: () => Promise<SSOSession | null>;
  getAccessToken: (options?: GetAccessTokenOptions) => Promise<string | null>;
  onAuthStateChange: (callback: AuthStateChangeCallback) => () => void;
  createAuthenticatedFetch: (fetcher?: typeof fetch) => typeof fetch;
  destroy: () => void;
}

interface OIDCConfig {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
}

type TokenResponse = Record<string, unknown>;

interface TokenResponseDefaults {
  idToken?: string;
  refreshToken?: string;
  tokenType: string;
}

type TokenStringField = 'access_token' | 'refresh_token' | 'token_type';

const REQUIRED_OIDC_ENDPOINTS = [
  'authorization_endpoint',
  'token_endpoint',
  'userinfo_endpoint',
] as const;

function readOIDCConfig(body: unknown): OIDCConfig {
  const discovery = typeof body === 'object' && body !== null && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const missingEndpoints = REQUIRED_OIDC_ENDPOINTS.filter((endpoint) => {
    const value = discovery[endpoint];
    return typeof value !== 'string' || value.length === 0;
  });
  if (missingEndpoints.length > 0) {
    throw new SSOAuthError(
      `OIDC discovery returned incomplete endpoints: missing ${missingEndpoints.join(', ')}`,
      502,
      {
        code: 'invalid_discovery_document',
        body,
      },
    );
  }

  return {
    authorization_endpoint: discovery.authorization_endpoint as string,
    token_endpoint: discovery.token_endpoint as string,
    userinfo_endpoint: discovery.userinfo_endpoint as string,
    ...(typeof discovery.end_session_endpoint === 'string'
      && discovery.end_session_endpoint.length > 0
      ? { end_session_endpoint: discovery.end_session_endpoint }
      : {}),
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payloadStr = parts[1];
  const padded = payloadStr + '='.repeat((4 - (payloadStr.length % 4)) % 4);
  const binString = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binString, (value) => value.codePointAt(0) ?? 0);
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

function getAccessTokenExpiry(data: TokenResponse, accessToken: string): number | undefined {
  if (typeof data.expires_in === 'number' && Number.isFinite(data.expires_in)) {
    return Math.floor(Date.now() / 1000) + data.expires_in;
  }

  try {
    const payload = decodeJwtPayload(accessToken);
    return typeof payload?.exp === 'number' ? payload.exp : undefined;
  } catch {
    return undefined;
  }
}

function createInvalidTokenResponseError(
  fallbackMessage: string,
  field: string,
  body: unknown,
): SSOAuthError {
  return new SSOAuthError(`${fallbackMessage}: invalid ${field}`, 502, {
    code: 'invalid_token_response',
    body,
    retryable: true,
  });
}

function readTokenResponse(body: unknown, fallbackMessage: string): TokenResponse {
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    return body as TokenResponse;
  }
  throw createInvalidTokenResponseError(fallbackMessage, 'response body', body);
}

function requireTokenString(
  response: TokenResponse,
  field: TokenStringField,
  fallbackMessage: string,
): string {
  const token = response[field];
  if (typeof token === 'string' && token.length > 0) return token;
  throw createInvalidTokenResponseError(fallbackMessage, field, response);
}

function readOptionalTokenString(
  response: TokenResponse,
  field: TokenStringField,
  fallback: string | undefined,
  fallbackMessage: string,
): string | undefined {
  return response[field] === undefined
    ? fallback
    : requireTokenString(response, field, fallbackMessage);
}

function authorizationScheme(tokenType: string): string {
  return tokenType.toLowerCase() === 'bearer' ? 'Bearer' : tokenType;
}

function normalizeTokenResponse(
  body: unknown,
  defaults: TokenResponseDefaults,
  fallbackMessage: string,
): SSOSession {
  const response = readTokenResponse(body, fallbackMessage);
  const accessToken = requireTokenString(response, 'access_token', fallbackMessage);
  return {
    access_token: accessToken,
    id_token: typeof response.id_token === 'string' ? response.id_token : defaults.idToken,
    refresh_token: readOptionalTokenString(
      response,
      'refresh_token',
      defaults.refreshToken,
      fallbackMessage,
    ),
    expires_at: getAccessTokenExpiry(response, accessToken),
    token_type: authorizationScheme(
      readOptionalTokenString(
        response,
        'token_type',
        defaults.tokenType,
        fallbackMessage,
      ) ?? defaults.tokenType,
    ),
  };
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (value) => chars[value % chars.length]).join('');
}

async function createPKCEChallenge(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64);
  const hashed = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const bytes = new Uint8Array(hashed);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const challenge = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return { verifier, challenge };
}

function createMemoryStorage(): TokenStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

function storageProbe(storage: Storage): boolean {
  const probeKey = `svadmin_sso_probe_${Math.random().toString(36).slice(2)}`;
  try {
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function unavailableStorage(): TokenStorage {
  return {
    getItem: () => null,
    setItem: () => {
      throw new SSOAuthError('Browser storage is unavailable', 0, {
        code: 'storage_unavailable',
        retryable: false,
      });
    },
    removeItem: () => undefined,
  };
}

function safeBrowserStorage(readStorage: () => Storage): Storage | null {
  try {
    const storage = readStorage();
    return storageProbe(storage) ? storage : null;
  } catch {
    return null;
  }
}

function getStorage(config: SSOConfig): TokenStorage {
  if (config.storage && typeof config.storage === 'object') return config.storage;
  if (typeof window === 'undefined') return createMemoryStorage();

  const requestedStorage = config.storage === 'session'
    ? safeBrowserStorage(() => window.sessionStorage)
    : safeBrowserStorage(() => window.localStorage)
      ?? safeBrowserStorage(() => window.sessionStorage);
  if (!requestedStorage) return unavailableStorage();
  return {
    getItem: (key) => requestedStorage.getItem(key),
    setItem: (key, value) => { requestedStorage.setItem(key, value); },
    removeItem: (key) => { requestedStorage.removeItem(key); },
  };
}

function getErrorResult(error: unknown): { message: string; name?: string } {
  if (error instanceof SSOAuthError) {
    return { message: error.message, name: error.code ?? error.name };
  }
  if (error instanceof Error) return { message: error.message, name: error.name };
  return { message: String(error) };
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('statusCode' in error && typeof error.statusCode === 'number') return error.statusCode;
  if ('status' in error && typeof error.status === 'number') return error.status;
  return undefined;
}

/** Create an OIDC/OAuth2 SSO AuthProvider. */
export function createSSOAuthProvider(config: SSOConfig): SSOAuthProvider {
  const scopes = config.scopes ?? ['openid', 'profile', 'email'];
  const refreshBuffer = Math.max(0, config.refreshBuffer ?? 60);
  const storage = getStorage(config);
  const storageKey = config.storageKey
    ?? `${DEFAULT_STORAGE_KEY}:${encodeURIComponent(config.issuer)}:${encodeURIComponent(config.clientId)}`;
  let oidcConfig: OIDCConfig | null = null;

  function getFetcher(): typeof fetch {
    const fetcher = config.fetcher ?? globalThis.fetch;
    if (typeof fetcher !== 'function') {
      throw new SSOAuthError('No fetch implementation found', 0, {
        code: 'fetch_unavailable',
        retryable: false,
      });
    }
    return fetcher.bind(globalThis) as typeof fetch;
  }

  async function discover(): Promise<OIDCConfig> {
    if (oidcConfig) return oidcConfig;
    if (config.manualEndpoints) {
      oidcConfig = {
        ...config.manualEndpoints,
        ...(config.endSessionEndpoint ? { end_session_endpoint: config.endSessionEndpoint } : {}),
      };
      return oidcConfig;
    }

    const url = `${config.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
    let response: Response;
    try {
      response = await getFetcher()(url);
    } catch (error) {
      throw createSSOAuthNetworkError(error, 'OIDC discovery failed');
    }
    if (!response.ok) throw await createSSOAuthResponseError(response, 'OIDC discovery failed');

    let discovered: unknown;
    try {
      discovered = await response.json() as unknown;
    } catch (error) {
      throw new SSOAuthError('OIDC discovery returned invalid JSON', 502, {
        code: 'invalid_discovery_document',
        retryable: true,
        cause: error,
      });
    }
    const discoveredConfig = readOIDCConfig(discovered);
    oidcConfig = config.endSessionEndpoint
      ? { ...discoveredConfig, end_session_endpoint: config.endSessionEndpoint }
      : discoveredConfig;
    return oidcConfig;
  }

  async function requestToken(
    endpoint: string,
    body: URLSearchParams,
    fallbackMessage: string,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await getFetcher()(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (error) {
      throw createSSOAuthNetworkError(error, fallbackMessage);
    }

    if (!response.ok) throw await createSSOAuthResponseError(response, fallbackMessage);

    try {
      return await response.json() as unknown;
    } catch (error) {
      throw new SSOAuthError(`${fallbackMessage}: invalid JSON response`, 502, {
        code: 'invalid_token_response',
        retryable: true,
        cause: error,
      });
    }
  }

  async function performRefresh(current: SSOSession): Promise<SSOSession> {
    if (!current.refresh_token) {
      throw new SSOAuthError('Refresh token is unavailable', 401, {
        code: 'session_not_found',
      });
    }

    const endpoints = await discover();
    const response = await requestToken(
      endpoints.token_endpoint,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        refresh_token: current.refresh_token,
      }),
      'Token refresh failed',
    );
    return normalizeTokenResponse(response, {
      idToken: current.id_token,
      refreshToken: current.refresh_token,
      tokenType: current.token_type,
    }, 'Token refresh failed');
  }

  const sessions = createSessionManager({
    storage,
    storageKey,
    autoRefresh: config.autoRefresh ?? true,
    refreshBuffer,
    refreshLock: config.refreshLock,
    refresh: performRefresh,
    legacyStorageKey: config.legacyStorageKey,
  });

  function assertAuthorizationExchangeCurrent(
    authGeneration: number,
    expectedState: string,
  ): void {
    if (
      sessions.getAuthGeneration() === authGeneration
      && sessions.getLoginState() === expectedState
    ) return;

    throw new SSOAuthError('Authorization exchange was cancelled by a newer session action', 409, {
      code: 'authorization_exchange_cancelled',
      retryable: false,
    });
  }

  async function clearOwnedLoginState(expectedState: string): Promise<void> {
    try {
      await sessions.runAuthMutation(async () => {
        sessions.clearLoginState(expectedState);
      });
    } catch (error) {
      if (!(error instanceof SSOAuthError) || error.code !== 'auth_lock_failed') throw error;
      sessions.clearLoginState(expectedState);
    }
  }

  async function exchangeCode(code: string, expectedState: string): Promise<SSOSession> {
    const authGeneration = sessions.getAuthGeneration();
    const verifier = sessions.getPKCEVerifier();
    const endpoints = await discover();
    assertAuthorizationExchangeCurrent(authGeneration, expectedState);
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: config.redirectUri,
      ...(verifier ? { code_verifier: verifier } : {}),
    });
    const response = await requestToken(endpoints.token_endpoint, body, 'Token exchange failed');
    const session = normalizeTokenResponse(response, { tokenType: 'Bearer' }, 'Token exchange failed');
    assertAuthorizationExchangeCurrent(authGeneration, expectedState);
    return sessions.runAuthMutation(async () => {
      assertAuthorizationExchangeCurrent(authGeneration, expectedState);
      sessions.saveSession(session);
      sessions.clearLoginState(expectedState);
      return session;
    });
  }

  const mapIdentity = config.mapIdentity ?? ((userinfo: Record<string, unknown>): Identity => ({
    id: (userinfo.sub as string) ?? '',
    name: (userinfo.name as string) ?? (userinfo.preferred_username as string) ?? '',
    avatar: (userinfo.picture as string) ?? undefined,
    email: (userinfo.email as string) ?? undefined,
  }));

  const authorizationSource = {
    getAuthorizationHeader: async (options?: GetAccessTokenOptions) => {
      const accessToken = await sessions.getAccessToken(options);
      const session = sessions.getSession();
      return accessToken && session?.access_token === accessToken
        ? `${authorizationScheme(session.token_type)} ${accessToken}`
        : null;
    },
  };

  const provider: SSOAuthProvider = {
    async login() {
      if (typeof window === 'undefined') {
        return { success: false, error: { message: 'SSO login requires a browser environment' } };
      }

      const state = generateRandomString(32);
      try {
        await sessions.runAuthMutation(async () => {
          sessions.beginAuthAttempt();
          sessions.setLoginState('', state);
        });
        const endpoints = await discover();
        const { verifier, challenge } = await createPKCEChallenge();
        await sessions.runAuthMutation(async () => {
          if (sessions.getLoginState() !== state) {
            throw new SSOAuthError('Login attempt was superseded', 409, {
              code: 'authorization_exchange_cancelled',
              retryable: false,
            });
          }
          sessions.setLoginState(verifier, state);
        });

        const params = new URLSearchParams({
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          scope: scopes.join(' '),
          state,
          code_challenge: challenge,
          code_challenge_method: 'S256',
          ...config.authorizationParams,
        });
        window.location.href = `${endpoints.authorization_endpoint}?${params}`;
        return { success: true };
      } catch (error) {
        try {
          await clearOwnedLoginState(state);
        } catch {
          // 保留触发失败的原始认证错误；清理失败不能掩盖根因。
        }
        return { success: false, error: getErrorResult(error) };
      }
    },

    async logout() {
      const session = sessions.getSession();
      sessions.beginSignOut();
      try {
        await sessions.runAuthMutation(async () => {
          sessions.clearSession();
        });
      } catch (error) {
        if (!(error instanceof SSOAuthError) || error.code !== 'auth_lock_failed') throw error;
        // 无跨上下文锁时 callback commit 同样会失败；本地登出仍应清理会话。
        sessions.clearSession();
      }

      try {
        const endSessionEndpoint = config.endSessionEndpoint
          ?? (await discover()).end_session_endpoint;
        if (typeof window !== 'undefined' && endSessionEndpoint) {
          const logoutUrl = new URL(endSessionEndpoint, window.location.href);
          logoutUrl.searchParams.set('client_id', config.clientId);
          logoutUrl.searchParams.delete('id_token_hint');
          if (session?.id_token) logoutUrl.searchParams.set('id_token_hint', session.id_token);
          if (config.postLogoutRedirectUri) {
            logoutUrl.searchParams.set('post_logout_redirect_uri', config.postLogoutRedirectUri);
          }
          window.location.href = logoutUrl.href;
          return { success: true };
        }
      } catch {
        // 本地会话已清理，发现或跳转失败不能恢复为登录态。
      }

      return {
        success: true,
        redirectTo: config.postLogoutRedirectUri ?? '/',
      };
    },

    async check() {
      let existingSession = sessions.getSession();
      if (!existingSession) {
        try {
          await sessions.clearInvalidSession();
          existingSession = sessions.getSession();
        } catch (error) {
          return { authenticated: false, error: getErrorResult(error) };
        }
      }
      if (typeof window === 'undefined') {
        const now = Math.floor(Date.now() / 1000);
        return existingSession && (
          existingSession.expires_at === undefined || existingSession.expires_at > now
        )
          ? { authenticated: true }
          : { authenticated: false, logout: true };
      }

      const url = new URL(window.location.href);
      const callbackError = url.searchParams.get('error');
      if (callbackError) {
        const callbackState = url.searchParams.get('state');
        const savedState = sessions.getLoginState();
        if (callbackState && savedState && callbackState === savedState) {
          try {
            await clearOwnedLoginState(savedState);
          } catch {
            // 错误回调仍返回 IdP 的原始错误；清理失败不掩盖它。
          }
        }
        return {
          authenticated: false,
          error: {
            message: url.searchParams.get('error_description') ?? callbackError,
            name: callbackError,
          },
        };
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (code) {
        const savedState = sessions.getLoginState();
        if (!state || !savedState || state !== savedState) {
          return { authenticated: false, error: { message: 'State mismatch' } };
        }

        try {
          await exchangeCode(code, savedState);
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
          return { authenticated: true };
        } catch (error) {
          try {
            await clearOwnedLoginState(savedState);
          } catch {
            // 保留 token exchange 的原始错误。
          }
          return { authenticated: false, error: getErrorResult(error) };
        }
      }

      const session = sessions.getSession();
      if (!session) return { authenticated: false, logout: true };

      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at !== undefined && session.expires_at <= now) {
        if (!session.refresh_token) {
          try {
            if (await sessions.getAccessToken()) return { authenticated: true };
            return sessions.getLoginState()
              ? { authenticated: false }
              : { authenticated: false, logout: true };
          } catch (error) {
            return { authenticated: false, error: getErrorResult(error) };
          }
        }

        try {
          return await sessions.refreshSession()
            ? { authenticated: true }
            : { authenticated: false, logout: true };
        } catch (error) {
          return {
            authenticated: false,
            error: getErrorResult(error),
            ...(isTerminalSessionError(error) ? { logout: true } : {}),
          };
        }
      }

      return { authenticated: true };
    },

    async getIdentity(): Promise<Identity | null> {
      if (!sessions.getSession()) return null;
      const authGeneration = sessions.getAuthGeneration();
      try {
        const endpoints = await discover();
        const response = await buildAuthenticatedFetch(
          authorizationSource,
          getFetcher(),
          { requireAuthorization: true },
        )(endpoints.userinfo_endpoint);
        if (!response.ok) return null;
        const userinfo = await response.json() as Record<string, unknown>;
        if (
          sessions.getAuthGeneration() !== authGeneration
          || !sessions.getSession()
        ) return null;
        return mapIdentity(userinfo);
      } catch {
        return null;
      }
    },

    getSession: async () => sessions.getSession(),
    refreshSession: () => sessions.refreshSession(),
    getAccessToken: (options) => sessions.getAccessToken(options),
    onAuthStateChange: (callback) => sessions.onAuthStateChange(callback),
    createAuthenticatedFetch: (fetcher) => buildAuthenticatedFetch(
      authorizationSource,
      fetcher ?? getFetcher(),
    ),
    destroy: () => sessions.destroy(),

    async onError(error) {
      const status = getErrorStatus(error);
      if (status === 403) return {};
      if (isTerminalSessionError(error)) return { logout: true, redirectTo: '/login' };
      if (status !== 401) return {};

      const session = sessions.getSession();
      if (!session?.refresh_token) return { logout: true, redirectTo: '/login' };

      try {
        return await sessions.getAccessToken({ forceRefresh: true })
          ? {}
          : { logout: true, redirectTo: '/login' };
      } catch (refreshError) {
        return isTerminalSessionError(refreshError)
          ? { logout: true, redirectTo: '/login' }
          : {};
      }
    },
  };

  return provider;
}

export type {
  AuthStateChangeCallback,
  AuthStateChangeEvent,
  GetAccessTokenOptions,
  RefreshLock,
  SSOSession,
} from './session-manager';
