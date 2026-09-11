/**
 * Session token management — generate, validate, and parse session tokens.
 *
 * Uses HMAC-SHA256 signatures for stateless session cookies.
 * The token format is: `base64url(payload).base64url(signature)`
 *
 * @example
 * ```ts
 * import { createSessionManager } from '@svadmin/auth-utils/session';
 *
 * const sessions = createSessionManager('your-secret-key');
 *
 * // Generate a session token
 * const token = await sessions.create({ userId: '123', role: 'admin' });
 *
 * // Validate and parse
 * const payload = await sessions.verify(token);
 * if (payload) console.log(payload.userId);
 * ```
 */

// ─── Types ────────────────────────────────────────────────────

export interface SessionPayload {
  /** User ID */
  sub: string;
  /** Issued at (unix seconds) */
  iat: number;
  /** Expiration (unix seconds) */
  exp: number;
  /** Custom data */
  [key: string]: unknown;
}

export interface SessionOptions {
  /** Session TTL in seconds. Default: 86400 (24 hours) */
  ttl?: number;
  /** Cookie name. Default: 'svadmin_session' */
  cookieName?: string;
}

export interface SessionManager {
  /** Create a new signed session token */
  create: (data: Record<string, unknown>) => Promise<string>;
  /** Verify and decode a session token. Returns null if invalid/expired. */
  verify: (token: string) => Promise<SessionPayload | null>;
  /** Generate a random session ID (32 bytes, hex) */
  generateId: () => string;
}

// ─── Base64url helpers ────────────────────────────────────────

function base64urlEncode(data: string): string {
  const bytes = new TextEncoder().encode(data);
  const binString = Array.from(bytes, (bite) => String.fromCodePoint(bite)).join('');
  return btoa(binString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(str)) {
    throw new Error('Invalid base64url payload');
  }
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const binString = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;

  if (!('sub' in value) || !('iat' in value) || !('exp' in value)) return false;
  const payload = value;
  return (
    typeof payload['sub'] === 'string' &&
    payload['sub'].length > 0 &&
    typeof payload['iat'] === 'number' &&
    Number.isSafeInteger(payload['iat']) &&
    payload['iat'] >= 0 &&
    typeof payload['exp'] === 'number' &&
    Number.isSafeInteger(payload['exp']) &&
    payload['exp'] > 0 &&
    payload['exp'] >= payload['iat']
  );
}

// ─── Factory ──────────────────────────────────────────────────

/**
 * Create a session manager with HMAC-SHA256 signed tokens.
 *
 * @param secret - Secret key for signing (minimum 32 characters recommended)
 * @param options - Configuration options
 */
export function createSessionManager(
  secret: string,
  options?: SessionOptions,
): SessionManager {
  const ttl = options?.ttl ?? 86400;
  let cryptoKey: CryptoKey | null = null;

  async function getKey(): Promise<CryptoKey> {
    if (cryptoKey) return cryptoKey;
    cryptoKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
    return cryptoKey;
  }

  function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
  }

  async function sign(payload: string): Promise<string> {
    const key = await getKey();
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    return toHex(sig);
  }

  return {
    async create(data: Record<string, unknown>): Promise<string> {
      const now = Math.floor(Date.now() / 1000);
      const subject = typeof data['userId'] === 'string'
        ? data['userId']
        : typeof data['sub'] === 'string'
          ? data['sub']
          : '';
      const payload: SessionPayload = {
        ...data,
        sub: subject,
        iat: now,
        exp: now + ttl,
      };
      const payloadStr = base64urlEncode(JSON.stringify(payload));
      const signature = await sign(payloadStr);
      return `${payloadStr}.${signature}`;
    },

    async verify(token: string): Promise<SessionPayload | null> {
      const parts = token.split('.');
      if (parts.length !== 2) return null;

      const [payloadStr, signature] = parts;
      if (!payloadStr || !signature) return null;

      try {
        const signatureBytes = hexToBytes(signature);
        if (!signatureBytes) return null;

        const key = await getKey();
        const validSignature = await crypto.subtle.verify(
          'HMAC',
          key,
          signatureBytes,
          new TextEncoder().encode(payloadStr),
        );
        if (!validSignature) return null;

        const payload: unknown = JSON.parse(base64urlDecode(payloadStr));
        if (!isSessionPayload(payload)) return null;

        const now = Math.floor(Date.now() / 1000);
        if (payload.exp <= now) return null;
        return payload;
      } catch {
        return null;
      }
    },

    generateId(): string {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    },
  };
}
