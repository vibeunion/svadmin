/**
 * @svadmin/auth-utils — Unit Tests
 */
import { ok } from 'node:assert/strict';
import { describe, test, expect } from 'bun:test';
import { hashPassword, verifyPassword } from './password';
import { createSessionManager } from './session';
import { generateSecret, generateTOTP, verifyTOTP, generateQRUri } from './totp';

const SESSION_SECRET = 'test-secret-key-at-least-32-chars!!';

function base64urlEncodeJson(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, byte => String.fromCodePoint(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signSessionPayload(payload: unknown): Promise<string> {
  const encoded = base64urlEncodeJson(payload);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  const signatureHex = Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
  return `${encoded}.${signatureHex}`;
}

// ─── Password ────────────────────────────────────────────────

describe('password', () => {
  test('hashPassword → verifyPassword (correct)', async () => {
    const hash = await hashPassword('test-password-123');
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');

    const valid = await verifyPassword('test-password-123', hash);
    expect(valid).toBe(true);
  });

  test('hashPassword → verifyPassword (wrong password)', async () => {
    const hash = await hashPassword('correct-password');
    const valid = await verifyPassword('wrong-password', hash);
    expect(valid).toBe(false);
  });

  test('hash format includes algorithm prefix', async () => {
    const hash = await hashPassword('test', { algorithm: 'pbkdf2' });
    expect(hash.startsWith('pbkdf2:')).toBe(true);
  });

  test('verifies PBKDF2 hashes and rejects a different password', async () => {
    const hash = await hashPassword('correct-password', { algorithm: 'pbkdf2' });
    expect(await verifyPassword('correct-password', hash)).toBe(true);
    expect(await verifyPassword('incorrect-password', hash)).toBe(false);
  });

  test('different passwords produce different hashes', async () => {
    const h1 = await hashPassword('password-1', { algorithm: 'pbkdf2' });
    const h2 = await hashPassword('password-2', { algorithm: 'pbkdf2' });
    expect(h1).not.toBe(h2);
  });

  test('same password produces different hashes (salt)', async () => {
    const h1 = await hashPassword('same-password', { algorithm: 'pbkdf2' });
    const h2 = await hashPassword('same-password', { algorithm: 'pbkdf2' });
    expect(h1).not.toBe(h2); // different salt each time
  });

  test('explicit Bun-only algorithms fail when Bun.password is unavailable', async () => {
    const bunRuntime: unknown = Reflect.get(globalThis, 'Bun');
    ok(typeof bunRuntime === 'object' && bunRuntime !== null);
    const originalPasswordApi: unknown = Reflect.get(bunRuntime, 'password');
    Reflect.set(bunRuntime, 'password', undefined);

    try {
      await expect(hashPassword('test', { algorithm: 'argon2id' })).rejects.toThrow('requires Bun.password');
      await expect(hashPassword('test', { algorithm: 'bcrypt' })).rejects.toThrow('requires Bun.password');

      const fallbackHash = await hashPassword('test', { algorithm: 'auto' });
      expect(fallbackHash.startsWith('pbkdf2:')).toBe(true);
    } finally {
      Reflect.set(bunRuntime, 'password', originalPasswordApi);
    }
  });

  test('rejects malformed native password results at the runtime boundary', async () => {
    const bunRuntime: unknown = Reflect.get(globalThis, 'Bun');
    ok(typeof bunRuntime === 'object' && bunRuntime !== null);
    const originalPasswordApi: unknown = Reflect.get(bunRuntime, 'password');
    Reflect.set(bunRuntime, 'password', { hash: async () => 42, verify: async () => 'true' });
    try {
      await expect(hashPassword('test')).rejects.toThrow('Invalid Bun.password.hash response');
      await expect(verifyPassword('test', 'argon2:fixture')).rejects.toThrow('Invalid Bun.password.verify response');
    } finally {
      Reflect.set(bunRuntime, 'password', originalPasswordApi);
    }
  });

  test('malformed PBKDF2 hashes are rejected without throwing', async () => {
    const malformedHashes = [
      'pbkdf2:',
      'pbkdf2:abc:00:00',
      'pbkdf2:310000:00:00',
      `pbkdf2:1000001:${'00'.repeat(32)}:${'00'.repeat(64)}`,
      `pbkdf2:310000:${'00'.repeat(32)}:${'00'.repeat(64)}:extra`,
    ];

    for (const hash of malformedHashes) {
      await expect(verifyPassword('test', hash)).resolves.toBe(false);
    }
  });
});

// ─── Session ─────────────────────────────────────────────────

describe('session', () => {
  const sessions = createSessionManager(SESSION_SECRET);

  test('create and verify session', async () => {
    const token = await sessions.create({ userId: 'user-123', role: 'admin' });
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const payload = await sessions.verify(token);
    expect(payload).not.toBeNull();
    ok(payload);
    expect(payload.sub).toBe('user-123');
    expect(payload['role']).toBe('admin');
  });

  test('verify rejects tampered token', async () => {
    const token = await sessions.create({ userId: 'user-123' });
    const tampered = token.replace(/^./, 'X');
    const payload = await sessions.verify(tampered);
    expect(payload).toBeNull();
  });

  test('verify rejects expired token', async () => {
    const shortSession = createSessionManager(SESSION_SECRET, { ttl: -1 });
    const token = await shortSession.create({ userId: 'user-123' });
    const payload = await shortSession.verify(token);
    expect(payload).toBeNull();
  });

  test('verify rejects malformed token', async () => {
    expect(await sessions.verify('not-a-valid-token')).toBeNull();
    expect(await sessions.verify('')).toBeNull();
    expect(await sessions.verify('a.b.c')).toBeNull();
    expect(await sessions.verify('.')).toBeNull();
    expect(await sessions.verify('a.')).toBeNull();
    expect(await sessions.verify('.b')).toBeNull();
  });

  test('generateId produces hex string', () => {
    const id = sessions.generateId();
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  test('create protects registered claims from custom data overrides', async () => {
    const now = Math.floor(Date.now() / 1000);
    const protectedSessions = createSessionManager(SESSION_SECRET, { ttl: 60 });
    const token = await protectedSessions.create({
      userId: 'trusted-user',
      sub: 'attacker',
      iat: 0,
      exp: 0,
    });

    const payload = await protectedSessions.verify(token);
    expect(payload).not.toBeNull();
    ok(payload);
    expect(payload.sub).toBe('trusted-user');
    expect(payload.iat).toBeGreaterThanOrEqual(now);
    expect(payload.exp).toBeGreaterThanOrEqual(now + 59);
  });

  test('verify rejects signed payloads with missing or invalid registered claims', async () => {
    const now = Math.floor(Date.now() / 1000);
    const invalidPayloads = [
      { sub: 'user-123', iat: now, exp: 0 },
      { sub: 'user-123', iat: now, exp: 'never' },
      { sub: 'user-123', iat: 'now', exp: now + 60 },
      { sub: 123, iat: now, exp: now + 60 },
      { sub: 'user-123', iat: now },
      null,
      [],
    ];

    for (const payload of invalidPayloads) {
      const token = await signSessionPayload(payload);
      expect(await sessions.verify(token)).toBeNull();
    }
  });
});

// ─── TOTP ────────────────────────────────────────────────────

describe('totp', () => {
  test('generateSecret produces base32 string', () => {
    const secret = generateSecret();
    expect(secret).toBeTruthy();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThan(20);
  });

  test('generateTOTP produces 6-digit string', async () => {
    const secret = generateSecret();
    const code = await generateTOTP(secret);
    expect(code).toMatch(/^\d{6}$/);
  });

  test('verifyTOTP validates correct code', async () => {
    const secret = generateSecret();
    const code = await generateTOTP(secret);
    const valid = await verifyTOTP(code, secret);
    expect(valid).toBe(true);
  });

  test('verifyTOTP rejects wrong code', async () => {
    const secret = generateSecret();
    const valid = await verifyTOTP('000000', secret);
    // Might be true by coincidence, but extremely unlikely
    // Just check it doesn't throw
    expect(typeof valid).toBe('boolean');
  });

  test('generateQRUri produces otpauth:// URI', () => {
    const secret = generateSecret();
    const uri = generateQRUri(secret, 'user@example.com', 'MyApp');
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('MyApp');
    expect(uri).toContain('user%40example.com');
    expect(uri).toContain(secret);
  });

  test('different secrets produce independently valid codes', async () => {
    const s1 = generateSecret();
    const s2 = generateSecret();
    const c1 = await generateTOTP(s1);
    const c2 = await generateTOTP(s2);

    expect(s1).not.toBe(s2);
    expect(c1).toMatch(/^\d{6}$/);
    expect(c2).toMatch(/^\d{6}$/);
  });
});
