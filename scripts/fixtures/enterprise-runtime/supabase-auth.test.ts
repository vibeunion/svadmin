import { describe, expect, it } from 'bun:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import { createSupabaseAuthProvider } from '../../../packages/supabase/src/auth-provider';

const authUrl = process.env['SVADMIN_AUTH_URL'];
const jwtSecret = process.env['SVADMIN_AUTH_JWT_SECRET'];
const enabled = Boolean(authUrl && jwtSecret && jwtSecret.length >= 32);

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
      return fetch(new Request(target, request));
    }
    return fetch(request);
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
    if (!authUrl || !jwtSecret) throw new Error('GoTrue acceptance environment is incomplete');
    const key = await anonKey(jwtSecret);
    const client = clientFor(authUrl, key, 'svadmin-enterprise-auth');
    const auth = createSupabaseAuthProvider(client);
    const email = `auth-${crypto.randomUUID()}@example.test`;
    const password = `Pw-${crypto.randomUUID().replaceAll('-', '')}`;

    const registered = await auth.register({ email, password, name: 'Local Auth' });
    expect(registered.success).toBe(true);

    const loggedIn = await auth.login({ email, password });
    expect(loggedIn.success).toBe(true);

    const identity = await auth.getIdentity();
    expect(identity?.email).toBe(email);
    expect(identity?.name).toBe('Local Auth');
    expect(identity?.id).toEqual(expect.any(String));
    const userId = identity?.id;
    if (!userId) throw new Error('GoTrue identity did not return a user id');

    const beforeRefresh = await client.auth.getSession();
    const previousAccessToken = beforeRefresh.data.session?.access_token;
    if (!previousAccessToken || !beforeRefresh.data.session?.refresh_token) throw new Error('Login did not persist a GoTrue session');

    await Bun.sleep(1100);
    const refreshed = await client.auth.refreshSession();
    expect(refreshed.error).toBeNull();
    expect(refreshed.data.session?.user.id).toBe(userId);
    expect(refreshed.data.session?.access_token).toEqual(expect.any(String));
    expect(refreshed.data.session?.access_token).not.toBe(previousAccessToken);
    const currentRefreshToken = refreshed.data.session?.refresh_token;
    if (!currentRefreshToken) throw new Error('Refresh did not return a refresh token');

    const refreshedIdentity = await auth.getIdentity();
    expect(refreshedIdentity?.id).toBe(userId);
    expect(refreshedIdentity?.token).toBe(refreshed.data.session?.access_token);

    const loggedOut = await auth.logout();
    expect(loggedOut.success).toBe(true);
    expect((await client.auth.getSession()).data.session).toBeNull();
    expect(await auth.check()).toMatchObject({ authenticated: false, redirectTo: '/login' });

    const replay = clientFor(authUrl, key, 'svadmin-enterprise-auth-replay');
    const restored = await replay.auth.refreshSession({ refresh_token: currentRefreshToken });
    expect(restored.data.session).toBeNull();
    expect(restored.error).not.toBeNull();

    const rejected = await auth.login({ email, password: `${password}-rejected` });
    expect(rejected.success).toBe(false);
    if (!rejected.success) expect(rejected.error?.name).toBe('AUTH_REJECTED');

    expect((await auth.login({ email, password })).success).toBe(true);
    expect((await auth.logout()).success).toBe(true);
  });
});
