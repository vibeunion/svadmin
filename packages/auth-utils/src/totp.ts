/**
 * TOTP (Time-based One-Time Password) utilities for MFA.
 *
 * Implements RFC 6238 (TOTP) using Web Crypto API — zero dependencies.
 *
 * @example
 * ```ts
 * import { generateSecret, generateTOTP, verifyTOTP, generateQRUri } from '@svadmin/auth-utils/totp';
 *
 * // Setup: generate a secret and show QR code
 * const secret = generateSecret();
 * const qrUri = generateQRUri(secret, 'user@example.com', 'MyApp');
 *
 * // Verify user's code
 * const valid = await verifyTOTP('123456', secret);
 * ```
 */

// ─── Types ────────────────────────────────────────────────────

export interface TOTPOptions {
  /** Number of digits. Default: 6 */
  digits?: number;
  /** Time step in seconds. Default: 30 */
  period?: number;
  /** HMAC algorithm. Default: 'SHA-1' (per RFC 6238) */
  algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512';
  /** Number of time steps to check before/after current. Default: 1 */
  window?: number;
}

// ─── Base32 encoding/decoding ─────────────────────────────────

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Uint8Array): string {
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }
  return result;
}

function base32Decode(encoded: string): Uint8Array<ArrayBuffer> {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const output: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of cleaned) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

// ─── HMAC ─────────────────────────────────────────────────────

async function hmac(
  algorithm: string,
  key: Uint8Array<ArrayBuffer>,
  data: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  // Map algo names for Web Crypto
  const algoMap: Record<string, string> = {
    'SHA-1': 'SHA-1',
    'SHA-256': 'SHA-256',
    'SHA-512': 'SHA-512',
  };
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: algoMap[algorithm] ?? 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(sig);
}

// ─── HOTP (base for TOTP) ─────────────────────────────────────

async function hotp(
  secret: Uint8Array<ArrayBuffer>,
  counter: number,
  digits: number,
  algorithm: string,
): Promise<string> {
  // Convert counter to 8-byte big-endian buffer
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(counter));

  const hash = await hmac(algorithm, secret, new Uint8Array(buffer));

  // Dynamic truncation (RFC 4226 §5.4)
  if (hash.byteLength < 20) throw new Error('Invalid HMAC digest length');
  const hashView = new DataView(hash.buffer, hash.byteOffset, hash.byteLength);
  const offset = hashView.getUint8(hash.byteLength - 1) & 0x0f;
  if (offset + 4 > hash.byteLength) throw new Error('Invalid HMAC truncation offset');
  const code = hashView.getUint32(offset, false) & 0x7fffffff;

  return (code % 10 ** digits).toString().padStart(digits, '0');
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Generate a random TOTP secret (20 bytes, base32 encoded).
 */
export function generateSecret(byteLength = 20): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return base32Encode(bytes);
}

/**
 * Generate a TOTP code for the current time.
 *
 * @param secret - Base32-encoded secret
 * @param opts - TOTP options
 * @returns The current TOTP code string
 */
export async function generateTOTP(
  secret: string,
  opts?: TOTPOptions,
): Promise<string> {
  const period = opts?.period ?? 30;
  const digits = opts?.digits ?? 6;
  const algorithm = opts?.algorithm ?? 'SHA-1';

  const counter = Math.floor(Date.now() / 1000 / period);
  const secretBytes = base32Decode(secret);
  return hotp(secretBytes, counter, digits, algorithm);
}

/**
 * Verify a TOTP code against the secret.
 *
 * Checks the current time step ± window.
 *
 * @param code - The code to verify
 * @param secret - Base32-encoded secret
 * @param opts - TOTP options
 * @returns `true` if the code is valid
 */
export async function verifyTOTP(
  code: string,
  secret: string,
  opts?: TOTPOptions,
): Promise<boolean> {
  const period = opts?.period ?? 30;
  const digits = opts?.digits ?? 6;
  const algorithm = opts?.algorithm ?? 'SHA-1';
  const window = opts?.window ?? 1;

  const now = Math.floor(Date.now() / 1000 / period);
  const secretBytes = base32Decode(secret);

  for (let i = -window; i <= window; i++) {
    const expected = await hotp(secretBytes, now + i, digits, algorithm);
    if (timingSafeEqual(code, expected)) return true;
  }

  return false;
}

/**
 * Generate an `otpauth://` URI for QR code generation.
 *
 * @param secret - Base32-encoded secret
 * @param accountName - User identifier (e.g., email)
 * @param issuer - App name displayed in authenticator
 * @param opts - TOTP options
 */
export function generateQRUri(
  secret: string,
  accountName: string,
  issuer: string,
  opts?: TOTPOptions,
): string {
  const period = opts?.period ?? 30;
  const digits = opts?.digits ?? 6;
  const algorithm = opts?.algorithm ?? 'SHA-1';

  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: algorithm.replace('-', ''),
    digits: String(digits),
    period: String(period),
  });

  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params}`;
}

// ─── Timing-safe comparison ───────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
