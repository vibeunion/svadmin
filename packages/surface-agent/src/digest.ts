import type { JsonObject, JsonValue } from '@svadmin/surface';

function canonicalJson(input: JsonValue): string {
  if (input === null || typeof input !== 'object') return JSON.stringify(input);
  if (Array.isArray(input)) return `[${input.map(canonicalJson).join(',')}]`;
  const inputObject = input as JsonObject;
  const entries = Object.keys(inputObject)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(inputObject[key])}`);
  return `{${entries.join(',')}}`;
}

export async function defaultSurfaceProposalDigest(binding: JsonValue): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable');
  const bytes = new TextEncoder().encode(canonicalJson(binding));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const hexadecimal = [...new Uint8Array(digest)]
    .map((entry) => entry.toString(16).padStart(2, '0'))
    .join('');
  return `sha256:${hexadecimal}`;
}

export function defaultSurfaceProposalId(): string {
  if (!globalThis.crypto?.randomUUID) throw new Error('Secure proposal identifiers are unavailable');
  return globalThis.crypto.randomUUID();
}
