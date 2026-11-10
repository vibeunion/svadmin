/**
 * Computes an HMAC-SHA256 signature for a string payload using Web Crypto API.
 * Returns in standard 'sha256=<hex>' format.
 */
export async function createHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : (globalThis as unknown as { crypto: Crypto }).crypto;

  const cryptoKey = await cryptoObj.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await cryptoObj.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(payload),
  );

  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hexHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hexHash}`;
}

/**
 * Constant-time comparison between two strings to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies that the provided signature matches the payload and secret.
 * Optionally verifies timestamp tolerance to prevent replay attacks.
 */
export async function verifyHmacSignature(
  payload: string,
  secret: string,
  headerValue: string,
  options: { maxAgeMs?: number; timestamp?: number } = {},
): Promise<boolean> {
  if (!headerValue || !secret) return false;

  if (options.timestamp && options.maxAgeMs) {
    const age = Math.abs(Date.now() - options.timestamp);
    if (age > options.maxAgeMs) {
      return false;
    }
  }

  const expected = await createHmacSignature(payload, secret);
  return constantTimeEqual(expected, headerValue);
}
