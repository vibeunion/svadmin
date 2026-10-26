import { describe, expect, it } from 'bun:test';
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';

const storageUrl = process.env['SVADMIN_STORAGE_URL'];
const jwtSecret = process.env['SVADMIN_STORAGE_JWT_SECRET'];
const enabled = Boolean(process.env['SVADMIN_STORAGE_SMOKE_RUN']);

function storageFetch(base: string): typeof fetch {
  const origin = new URL(base);
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
    const url = new URL(request.url);
    const prefix = '/storage/v1';
    if (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)) {
      const target = new URL(origin.href);
      const suffix = url.pathname.slice(prefix.length);
      target.pathname = suffix.length > 0 ? suffix : '/';
      target.search = url.search;
      return fetch(new Request(target, request), { signal: AbortSignal.timeout(8000), redirect: 'error' });
    }
    throw new Error('Unexpected non-storage smoke request');
  };
  return Object.assign(wrapped, { preconnect: fetch.preconnect });
}

async function token(secret: string, role: 'service_role' | 'anon'): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('supabase')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
}

describe.skipIf(!enabled)('OrbStack object storage', () => {
  it('uploads, reads back, and rejects an anonymous read', async () => {
    if (!storageUrl || !/^http:\/\/127\.0\.0\.1:\d+$/.test(storageUrl) || !jwtSecret || jwtSecret.length < 32) {
      throw new Error('Storage smoke requires a loopback URL and temporary credentials');
    }
    const serviceKey = await token(jwtSecret, 'service_role');
    const anonKey = await token(jwtSecret, 'anon');
    const admin = createClient(storageUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: storageFetch(storageUrl) },
    });
    const anonymous = createClient(storageUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: storageFetch(storageUrl) },
    });
    const bucket = `smoke-${crypto.randomUUID()}`;
    const path = 'notes/hello.txt';
    const payload = new Blob(['local-object'], { type: 'text/plain' });

    const created = await admin.storage.createBucket(bucket, { public: false });
    expect(created.error).toBeNull();
    const uploaded = await admin.storage.from(bucket).upload(path, payload, { contentType: 'text/plain', upsert: false });
    expect(uploaded.error).toBeNull();
    const downloaded = await admin.storage.from(bucket).download(path);
    expect(downloaded.error).toBeNull();
    expect(await downloaded.data?.text()).toBe('local-object');

    const denied = await anonymous.storage.from(bucket).download(path);
    expect(denied.data).toBeNull();
    expect(denied.error).not.toBeNull();

    const removed = await admin.storage.from(bucket).remove([path]);
    expect(removed.error).toBeNull();
    const deleted = await admin.storage.deleteBucket(bucket);
    expect(deleted.error).toBeNull();
  });
});
