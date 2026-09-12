/**
 * Browser-side OIDC/OAuth2 authentication helpers.
 *
 * Provides PKCE generation, OIDC Discovery endpoint resolution, redirect validation,
 * and reverse-proxy origin recovery.
 */

/** Encodes a Uint8Array as base64url using only Web APIs. */
function base64url(array: Uint8Array): string {
  let binary = "";
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Generates a random OAuth state value. */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64url(array);
}

/** Generates a PKCE code verifier. */
export function generateVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64url(array);
}

/** Computes the S256 code challenge from a code verifier. */
export async function generateChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(hash));
}

/**
 * Validates a returnTo redirect and prevents open-redirect vulnerabilities.
 * Allows only same-origin relative paths (starting with / but not //).
 */
export function isValidReturnTo(url: string): boolean {
  if (!url) return false;
  if (url.includes("\\")) return false;
  return /^\/[^/].*/.test(url) || url === "/";
}

/** Recovers the public origin from reverse-proxy headers. */
export function getForwardedOrigin(req: Request, fallbackUrl: URL): string {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host") || fallbackUrl.host;
  const protocol = (forwardedProto || fallbackUrl.protocol.replace(/:$/, "")).replace(/:$/, "");
  return `${protocol}://${host}`;
}

interface OidcDiscoveryDocument {
  authorization_endpoint?: string;
  token_endpoint?: string;
}

/** Resolves the authorization endpoint URL through OIDC Discovery. */
export async function resolveAuthorizeUrl(
  issuer: string,
  overrideUrl = "",
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const normalizedIssuer = issuer.replace(/\/$/, "");
  const normalizedOverride = overrideUrl.trim();

  if (normalizedOverride) return normalizedOverride;

  if (normalizedIssuer) {
    try {
      const response = await fetcher(`${normalizedIssuer}/.well-known/openid-configuration`);
      if (response.ok) {
        const discovery = await response.json() as OidcDiscoveryDocument;
        if (discovery.authorization_endpoint) return discovery.authorization_endpoint;
      }
    } catch {
      // Ignore discovery failures and use the fallback.
    }
  }

  if (normalizedIssuer) return `${normalizedIssuer}/oauth/authorize`;

  return "";
}

/** Resolves the token endpoint URL through OIDC Discovery. */
export async function resolveTokenUrl(
  issuer: string,
  overrideUrlOrFetcher: string | typeof fetch = "",
  fetcherOverride: typeof fetch = fetch,
): Promise<string> {
  const normalizedIssuer = issuer.replace(/\/$/, "");
  const fetcher = typeof overrideUrlOrFetcher === "function" ? overrideUrlOrFetcher : fetcherOverride;
  const overrideUrl = typeof overrideUrlOrFetcher === "string" ? overrideUrlOrFetcher : "";
  const normalizedOverride = overrideUrl.trim();

  if (normalizedOverride) return normalizedOverride;
  if (!normalizedIssuer) return "";

  try {
    const response = await fetcher(`${normalizedIssuer}/.well-known/openid-configuration`);
    if (response.ok) {
      const discovery = await response.json() as OidcDiscoveryDocument;
      if (discovery.token_endpoint) return discovery.token_endpoint;
    }
  } catch {
    // Ignore discovery failures.
  }

  return `${normalizedIssuer}/oauth/token`;
}
