/**
 * Password hashing and verification utilities.
 *
 * Uses Bun's native `Bun.password` API when available (Argon2id by default),
 * with a Web Crypto API fallback using PBKDF2-SHA256 for non-Bun runtimes.
 *
 * @example
 * ```ts
 * import { hashPassword, verifyPassword } from '@svadmin/auth-utils/password';
 *
 * const hash = await hashPassword('my-password');
 * const valid = await verifyPassword('my-password', hash);
 * ```
 */

// ─── Types ────────────────────────────────────────────────────

export interface PasswordOptions {
  /**
   * Algorithm to use. Default: 'auto' (uses Bun.password if available, else PBKDF2).
   * - 'argon2id' — requires Bun runtime
   * - 'bcrypt' — requires Bun runtime
   * - 'pbkdf2' — Web Crypto API, works everywhere
   * - 'auto' — best available
   */
  algorithm?: 'argon2id' | 'bcrypt' | 'pbkdf2' | 'auto';
}

// ─── Bun detection ────────────────────────────────────────────

interface BunPasswordApi {
  hash: (password: string, options?: { algorithm: 'argon2id' | 'bcrypt' }) => Promise<string>;
  verify: (password: string, hash: string) => Promise<boolean>;
}

function getBunPasswordApi(): BunPasswordApi | null {
  const runtime: unknown = Reflect.get(globalThis, 'Bun');
  if (runtime === null || typeof runtime !== 'object') return null;

  const passwordApi: unknown = Reflect.get(runtime, 'password');
  if (passwordApi === null || typeof passwordApi !== 'object') return null;
  const hash: unknown = Reflect.get(passwordApi, 'hash');
  const verify: unknown = Reflect.get(passwordApi, 'verify');
  if (typeof hash !== 'function' || typeof verify !== 'function') return null;
  return {
    async hash(password, options) {
      const result: unknown = await Reflect.apply(hash, passwordApi, [password, options]);
      if (typeof result !== 'string') throw new Error('Invalid Bun.password.hash response');
      return result;
    },
    async verify(password, storedHash) {
      const result: unknown = await Reflect.apply(verify, passwordApi, [password, storedHash]);
      if (typeof result !== 'boolean') throw new Error('Invalid Bun.password.verify response');
      return result;
    },
  };
}

// ─── PBKDF2 fallback (Web Crypto API) ─────────────────────────

const PBKDF2_ITERATIONS = 310_000; // OWASP recommended
const PBKDF2_MAX_ITERATIONS = 1_000_000;
const PBKDF2_SALT_LENGTH = 32;
const PBKDF2_KEY_LENGTH = 64;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: unknown): Uint8Array<ArrayBuffer> | null {
  if (typeof hex !== 'string') return null;
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function pbkdf2Hash(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    PBKDF2_KEY_LENGTH * 8,
  );
  return `pbkdf2:${PBKDF2_ITERATIONS}:${toHex(salt.buffer)}:${toHex(derived)}`;
}

async function pbkdf2Verify(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const [, iterStr, saltHex, hashHex] = parts;
  const iterations = Number(iterStr);
  const salt = fromHex(saltHex);
  const expectedHash = fromHex(hashHex);
  if (
    !Number.isSafeInteger(iterations) ||
    iterations <= 0 ||
    iterations > PBKDF2_MAX_ITERATIONS ||
    !salt ||
    salt.length !== PBKDF2_SALT_LENGTH ||
    !expectedHash ||
    expectedHash.length !== PBKDF2_KEY_LENGTH
  ) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    PBKDF2_KEY_LENGTH * 8,
  );
  const actualHash = new Uint8Array(derived);
  if (actualHash.length !== expectedHash.length) return false;

  const actualView = new DataView(actualHash.buffer, actualHash.byteOffset, actualHash.byteLength);
  const expectedView = new DataView(expectedHash.buffer, expectedHash.byteOffset, expectedHash.byteLength);
  let difference = 0;
  for (let index = 0; index < actualHash.length; index += 1) {
    difference |= actualView.getUint8(index) ^ expectedView.getUint8(index);
  }
  return difference === 0;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Hash a password using the best available algorithm.
 *
 * @returns A string containing the algorithm prefix + hash, safe to store in DB.
 */
export async function hashPassword(
  password: string,
  opts?: PasswordOptions,
): Promise<string> {
  const algo = opts?.algorithm ?? 'auto';
  const bunPassword = getBunPasswordApi();

  if (algo === 'pbkdf2') {
    return pbkdf2Hash(password);
  }

  if (bunPassword) {
    return bunPassword.hash(password, { algorithm: algo === 'auto' ? 'argon2id' : algo });
  }

  if (algo === 'auto') {
    return pbkdf2Hash(password);
  }

  throw new Error(`[auth-utils] ${algo} requires Bun.password in the current runtime.`);
}

/**
 * Verify a password against a stored hash.
 *
 * @returns `true` if the password matches, `false` otherwise.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  // Auto-detect algorithm from hash format
  if (hash.startsWith('pbkdf2:')) {
    return pbkdf2Verify(password, hash);
  }

  // Argon2 / bcrypt hashes — use Bun.password.verify
  const bunPassword = getBunPasswordApi();
  if (bunPassword) {
    return bunPassword.verify(password, hash);
  }

  throw new Error(
    `[auth-utils] Cannot verify hash format "${hash.substring(0, 10)}...". ` +
    'Argon2/bcrypt hashes require the Bun runtime.',
  );
}
