/**
 * Social login presets — pre-configured SSO providers for common identity platforms.
 *
 * Each factory function returns an AuthProvider via `createSSOAuthProvider()`
 * with the correct issuer and default scopes for that platform.
 *
 * @example
 * ```ts
 * import { createGoogleAuth } from '@svadmin/sso';
 * import { setAuthProvider } from '@svadmin/core';
 *
 * setAuthProvider(createGoogleAuth('your-client-id'));
 * ```
 */

import { createSSOAuthProvider, type SSOConfig } from './auth-provider';

// ─── Shared helpers ──────────────────────────────────────────

type PresetOptions = Omit<SSOConfig, 'issuer' | 'clientId'>;

function resolveRedirectUri(opts?: PresetOptions): string {
  return opts?.redirectUri ?? (typeof window !== 'undefined' ? `${window.location.origin}/callback` : '/callback');
}

// ─── Google ──────────────────────────────────────────────────

/**
 * Google Sign-In via OIDC (OpenID Connect).
 *
 * Prerequisites:
 * 1. Create OAuth2 credentials at https://console.cloud.google.com/apis/credentials
 * 2. Add authorized redirect URIs (e.g., `http://localhost:5173/callback`)
 *
 * @param clientId - Google OAuth2 Client ID
 */
export function createGoogleAuth(clientId: string, opts?: PresetOptions) {
  const issuer = 'https://accounts.google.com';
  return createSSOAuthProvider({
    issuer,
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: resolveRedirectUri(opts),
    ...opts,
  });
}

// ─── Microsoft / Azure AD (Entra ID) ────────────────────────

/**
 * Microsoft / Azure AD Sign-In via OIDC.
 *
 * @param clientId - Azure App Registration Client ID
 * @param tenantId - Azure tenant ID. Default: 'common' (multi-tenant)
 */
export function createMicrosoftAuth(
  clientId: string,
  tenantId = 'common',
  opts?: PresetOptions,
) {
  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  return createSSOAuthProvider({
    issuer,
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: resolveRedirectUri(opts),
    ...opts,
  });
}

// ─── GitHub ──────────────────────────────────────────────────

/**
 * GitHub Sign-In via OAuth2.
 *
 * Note: GitHub does NOT support OIDC discovery, so we manually specify endpoints.
 * The `issuer` field is used for identification only.
 *
 * Prerequisites:
 * 1. Create an OAuth App at https://github.com/settings/developers
 * 2. Set the callback URL to your redirect URI
 *
 * @param clientId - GitHub OAuth App Client ID
 */
export function createGitHubAuth(clientId: string, opts?: PresetOptions) {
  // GitHub uses standard OAuth2, not OIDC — requires manual endpoint config.
  // We leverage the SSO provider but override the discovery with manual endpoints.
  const redirectUri = resolveRedirectUri(opts);
  const issuer = 'https://github.com';

  return createSSOAuthProvider({
    issuer,
    clientId,
    scopes: ['read:user', 'user:email'],
    redirectUri,
    // GitHub doesn't support OIDC discovery, provide manual endpoints
    manualEndpoints: {
      authorization_endpoint: 'https://github.com/login/oauth/authorize',
      token_endpoint: 'https://github.com/login/oauth/access_token',
      userinfo_endpoint: 'https://api.github.com/user',
    },
    mapIdentity: (userinfo) => ({
      id: String(userinfo.id ?? ''),
      name: (userinfo.name as string) ?? (userinfo.login as string) ?? '',
      avatar: (userinfo.avatar_url as string) ?? undefined,
      email: (userinfo.email as string) ?? undefined,
    }),
    ...opts,
  });
}

// ─── GitLab ──────────────────────────────────────────────────

/**
 * GitLab Sign-In via OIDC.
 *
 * @param clientId - GitLab Application ID
 * @param instanceUrl - GitLab instance URL. Default: 'https://gitlab.com'
 */
export function createGitLabAuth(
  clientId: string,
  instanceUrl = 'https://gitlab.com',
  opts?: PresetOptions,
) {
  const issuer = instanceUrl;
  return createSSOAuthProvider({
    issuer,
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: resolveRedirectUri(opts),
    ...opts,
  });
}

// ─── Keycloak ────────────────────────────────────────────────

/**
 * Keycloak Sign-In via OIDC.
 *
 * @param baseUrl - Keycloak base URL (e.g., 'https://keycloak.example.com')
 * @param realm - Keycloak realm name
 * @param clientId - Keycloak Client ID
 */
export function createKeycloakAuth(
  baseUrl: string,
  realm: string,
  clientId: string,
  opts?: PresetOptions,
) {
  const issuer = `${baseUrl.replace(/\/$/, '')}/realms/${realm}`;
  return createSSOAuthProvider({
    issuer,
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: resolveRedirectUri(opts),
    ...opts,
  });
}

// ─── Auth0 ───────────────────────────────────────────────────

/**
 * Auth0 Sign-In via OIDC.
 *
 * @param domain - Auth0 domain (e.g., 'your-tenant.auth0.com')
 * @param clientId - Auth0 Client ID
 */
export function createAuth0Auth(
  domain: string,
  clientId: string,
  opts?: PresetOptions,
) {
  const issuer = `https://${domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  return createSSOAuthProvider({
    issuer,
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: resolveRedirectUri(opts),
    ...opts,
  });
}

// ─── Type exports ────────────────────────────────────────────

export type { PresetOptions };

// ─── Supauth / GoTrue ────────────────────────────────────────

function normalizeSupauthIssuer(configuredIssuer: string): {
  issuer: string;
  publicRoot: string;
} {
  const normalizedIssuer = configuredIssuer.replace(/\/+$/, '');
  if (!normalizedIssuer || normalizedIssuer.endsWith('/auth/v1')) {
    return {
      issuer: normalizedIssuer,
      publicRoot: normalizedIssuer.slice(0, -'/auth/v1'.length),
    };
  }
  return { issuer: `${normalizedIssuer}/auth/v1`, publicRoot: normalizedIssuer };
}

/**
 * Supauth hosted OIDC Sign-In.
 *
 * Targets the SupAuth contract hosted by SupaCloud or SupaOAuth: OIDC endpoints
 * live below `/auth/v1`, while browser sign-out lives at the public root
 * `/logout`. Other GoTrue deployments should provide explicit endpoints or use
 * `createSSOAuthProvider()` directly.
 *
 * @param clientId - OAuth2 Client ID
 * @param opts - SSO options. `opts.issuer` accepts a Supauth public root or `/auth/v1` issuer URL.
 */
export function createSupauthAuth(
  clientId: string,
  opts?: PresetOptions & { issuer?: string },
) {
  const manualLogoutEndpoint = opts?.manualEndpoints?.end_session_endpoint;
  const {
    issuer: configuredIssuer = '',
    endSessionEndpoint: configuredLogoutEndpoint,
    storageKey: configuredStorageKey,
    ...providerOptions
  } = opts ?? {};
  const { issuer, publicRoot } = normalizeSupauthIssuer(configuredIssuer);
  const storageKey = configuredStorageKey
    ?? `svadmin_sso:${encodeURIComponent(configuredIssuer)}:${encodeURIComponent(clientId)}`;
  const endSessionEndpoint = configuredLogoutEndpoint
    ?? manualLogoutEndpoint
    ?? (publicRoot ? `${publicRoot}/logout` : undefined);

  return createSSOAuthProvider({
    issuer,
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: resolveRedirectUri(opts),
    storageKey,
    ...(endSessionEndpoint === undefined ? {} : { endSessionEndpoint }),
    ...providerOptions,
  });
}
