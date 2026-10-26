import { describe, expect, it } from 'bun:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import { createSupabaseAuthProvider } from '../../../packages/supabase/src/auth-provider';

const authUrl = process.env['SVADMIN_AUTH_URL'];
const jwtSecret = process.env['SVADMIN_AUTH_JWT_SECRET'];
const enabled = Boolean(process.env['SVADMIN_AUTH_SMOKE_RUN']);

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

function gotrueFetch(base: string): typeof fetch {
  const origin = new URL(base);
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
    const url = new URL(request.url);
    const prefix = '/auth/v1';
    if (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)) {
      const target = new URL(origin.href);
      const suffix = url.pathname.slice(prefix.length);
      target.pathname = suffix.length > 0 ? suffix : '/';
      target.search = url.search;
      return fetch(new Request(target, request), { signal: AbortSignal.timeout(5000), redirect: 'error' });
    }
    throw new Error('Unexpected non-Auth smoke request');
  };
  return Object.assign(wrapped, { preconnect: fetch.preconnect });
}

async function anonKey(secret: string): Promise<string> {
  return new SignJWT({ role: 'anon' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('supabase')
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(new TextEncoder().encode(secret));
}

function clientFor(url: string, key: string, storageKey: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: memoryStorage(),
      storageKey,
    },
    global: { fetch: gotrueFetch(url) },
  });
}

describe.skipIf(!enabled)('OrbStack GoTrue auth provider', () => {
  it('registers, refreshes, logs out, and rejects a wrong password', async () => {
    if (!authUrl || !/^http:\/\/127\.0\.0\.1:\d+$/.test(authUrl) || !jwtSecret || jwtSecret.length < 32) {
      throw new Error('GoTrue smoke requires a loopback URL and temporary credentials');
    }
    const key = await anonKey(jwtSecret);
    const client = clientFor(authUrl, key, 'svadmin-enterprise-auth');
    const auth = createSupabaseAuthProvider(client);
    const email = `auth-${crypto.randomUUID()}@example.test`;
    const password = `Pw-${crypto.randomUUID().replaceAll('-', '')}`;

    let stage = 'register';
    const replay = clientFor(authUrl, key, 'svadmin-enterprise-auth-replay');
    try {
      const registered = await auth.register({ email, password, name: 'Local Auth' });
      expect(registered.success).toBe(true);

      stage = 'login';
      const loggedIn = await auth.login({ email, password });
      expect(loggedIn.success).toBe(true);
      expect((await auth.check()).authenticated).toBe(true);

      const identity = await auth.getIdentity();
      expect(identity?.email === email).toBe(true);
      expect(identity?.name).toBe('Local Auth');
      expect(identity?.id).toEqual(expect.any(String));
      const userId = identity?.id;
      if (!userId) throw new Error('GoTrue identity did not return a user id');

      const beforeRefresh = await client.auth.getSession();
      const previousAccessToken = beforeRefresh.data.session?.access_token;
      if (!previousAccessToken || !beforeRefresh.data.session?.refresh_token) throw new Error('Login did not persist a GoTrue session');

      stage = 'refresh';
      const refreshed = await client.auth.refreshSession();
      expect(refreshed.error === null).toBe(true);
      expect(refreshed.data.session?.user.id).toBe(userId);
      expect(typeof refreshed.data.session?.access_token === 'string').toBe(true);
      const currentRefreshToken = refreshed.data.session?.refresh_token;
      if (!currentRefreshToken) throw new Error('Refresh did not return a refresh token');
      expect(currentRefreshToken !== beforeRefresh.data.session?.refresh_token).toBe(true);

      const refreshedIdentity = await auth.getIdentity();
      expect(refreshedIdentity?.id).toBe(userId);
      expect(refreshedIdentity?.token === refreshed.data.session?.access_token).toBe(true);
      expect((await auth.check()).authenticated).toBe(true);

      stage = 'logout';
      const loggedOut = await auth.logout();
      expect(loggedOut.success).toBe(true);
      expect((await client.auth.getSession()).data.session === null).toBe(true);
      expect(await auth.check()).toMatchObject({ authenticated: false, redirectTo: '/login' });

      stage = 'revocation';
      const restored = await replay.auth.refreshSession({ refresh_token: currentRefreshToken });
      expect(restored.data.session === null).toBe(true);
      expect(restored.error?.code === 'refresh_token_not_found').toBe(true);

      stage = 'wrong-password';
      const rejected = await auth.login({ email, password: `${password}-rejected` });
      expect(rejected.success).toBe(false);
      if (!rejected.success) expect(rejected.error?.name).toBe('AUTH_REJECTED');

      expect((await auth.login({ email, password })).success).toBe(true);
      expect((await auth.logout()).success).toBe(true);
      console.info('AUTH_SMOKE_COMPLETE');
    } catch {
      // 不允许断言 diff 或 SDK 异常携带随机凭据和令牌。
      console.error(`AUTH_SMOKE_STAGE_FAILED ${stage}`);
      throw new Error(`Auth smoke failed at ${stage}`);
    } finally {
      await client.auth.stopAutoRefresh();
      await replay.auth.stopAutoRefresh();
    }
  });
});
