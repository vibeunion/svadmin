import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { AuthApiError, AuthRetryableFetchError, createClient } from '@supabase/supabase-js';
import { resetAuditLogProvider, setAuditHandler, type AuditEntry } from '@svadmin/core/audit';
import { requireValue } from '../../../scripts/test-assertions';
import { createSupabaseAuthProvider, type SupabaseAuthClient } from './auth-provider';
import { type SupabaseAuthSession, type SupabaseAuthUser } from './auth-contract';

function user(id = 'user-1'): SupabaseAuthUser {
  return {
    id, aud: 'authenticated', created_at: '2026-09-09T00:00:00Z', email: 'admin@example.com',
    app_metadata: { provider: 'email' },
    user_metadata: { name: 'Admin', avatar_url: 'https://example.com/avatar', role: 'editable' },
  };
}

function session(id = 'user-1', token = 'access-token'): SupabaseAuthSession {
  return {
    access_token: token, refresh_token: 'refresh-token', token_type: 'bearer',
    expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: user(id),
  };
}

function fixture() {
  let stored: unknown = session();
  let subject: unknown = user();
  const sdk = {
    signInWithPassword: mock(async (_credentials: { email: string; password: string }): Promise<unknown> => {
      stored = session();
      subject = user();
      return { data: { user: subject, session: stored }, error: null };
    }),
    signUp: mock(async (_credentials: { email: string; password: string; options: { data: Record<string, unknown> } }): Promise<unknown> =>
      ({ data: { user: user(), session: null }, error: null })),
    signOut: mock(async (_options?: { scope: 'local' | 'global' }): Promise<unknown> => {
      stored = null;
      subject = null;
      return { error: null };
    }),
    getSession: mock(async (): Promise<unknown> => ({ data: { session: stored }, error: null })),
    getUser: mock(async (_jwt?: string): Promise<unknown> => ({ data: { user: subject }, error: null })),
    resetPasswordForEmail: mock(async (_email: string): Promise<unknown> => ({ data: {}, error: null })),
    updateUser: mock(async (_attributes: { password: string }): Promise<unknown> => ({ data: { user: user() }, error: null })),
  };
  const client = { auth: sdk } satisfies SupabaseAuthClient;
  return {
    client, sdk, auth: createSupabaseAuthProvider(client),
    store(value: unknown) { stored = value; },
    subject(value: unknown) { subject = value; },
  };
}

function deferred() {
  let complete: ((value: unknown) => void) | undefined;
  const promise = new Promise<unknown>(resolve => { complete = resolve; });
  return { promise, resolve(value: unknown) { requireValue(complete)(value); } };
}

async function flush(): Promise<void> {
  for (let index = 0; index < 20; index++) await Promise.resolve();
}

let audits: AuditEntry[] = [];
beforeEach(() => {
  audits = [];
  resetAuditLogProvider();
  setAuditHandler(entry => { audits.push(entry); });
});
afterEach(() => resetAuditLogProvider());

describe('Supabase authentication boundaries', () => {
  test('validates current form credentials and strips the duplicate identifier before dispatch', async () => {
    const f = fixture();
    expect(await f.auth.login({ email: 'admin@example.com', username: 'admin@example.com', password: 'secret' }))
      .toEqual({ success: true, redirectTo: '/' });
    expect(f.sdk.signInWithPassword).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'secret' });
    expect(audits.map(entry => ({ action: entry.action, userId: entry.userId })))
      .toEqual([{ action: 'login', userId: 'user-1' }]);
  });

  test('rejects invalid inputs, conflicting identifiers and accessors before dispatch', async () => {
    const f = fixture();
    let reads = 0;
    for (const input of [
      {}, { email: 1, password: 'secret' }, { email: 'a', password: null },
      { email: 'a', password: '' }, { email: 'a', username: 'b', password: 'secret' },
      { email: 'a', password: 'secret', unexpected: true },
      { email: 'a', password: 'secret', username: undefined },
      { email: 'a', get password() { reads++; return 'secret'; } },
    ]) expect((await f.auth.login(input)).error?.name).toBe('INVALID_AUTH_INPUT');
    expect(f.sdk.signInWithPassword).not.toHaveBeenCalled();
    expect(f.sdk.signOut).not.toHaveBeenCalled();
    expect(audits).toEqual([]);
    expect(reads).toBe(0);
  });

  test('rejects malformed login envelopes and clears potentially saved credentials', async () => {
    for (const result of [
      undefined, {}, { data: {}, error: null }, { data: { user: null, session: session() }, error: null },
      { data: { user: user(), session: { ...session(), expires_at: undefined } }, error: null },
      { data: { user: user(), session: session() }, error: false },
    ]) {
      const f = fixture();
      f.sdk.signInWithPassword.mockResolvedValueOnce(result);
      expect((await f.auth.login({ email: 'a', password: 'secret' })).error?.name).toBe('WRITE_OUTCOME_UNKNOWN');
      expect(f.sdk.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect((await f.auth.check()).authenticated).toBe(false);
      expect(audits).toEqual([]);
    }
  });

  test('rejects mismatched login user/session identities and expired token lifetimes', async () => {
    for (const value of [
      session('other-user'), { ...session(), expires_at: Math.floor(Date.now() / 1000) - 1 },
    ]) {
      const f = fixture();
      f.sdk.signInWithPassword.mockResolvedValueOnce({ data: { user: user(), session: value }, error: null });
      expect((await f.auth.login({ email: 'a', password: 'secret' })).success).toBe(false);
      expect(f.sdk.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(audits).toEqual([]);
    }
  });

  test('sanitizes SDK error messages and distinguishes rejection from uncertain writes', async () => {
    const f = fixture();
    f.sdk.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null }, error: new AuthApiError('secret credential', 400, 'invalid_credentials'),
    });
    expect(await f.auth.login({ email: 'a', password: 'secret' })).toEqual({
      success: false, error: { name: 'AUTH_REJECTED', message: 'Authentication request was rejected.' },
    });
    expect(f.sdk.signOut).not.toHaveBeenCalled();
    f.sdk.signInWithPassword.mockRejectedValueOnce(new Error('secret transport'));
    expect((await f.auth.login({ email: 'a', password: 'secret' })).error?.name).toBe('WRITE_OUTCOME_UNKNOWN');
    expect(f.sdk.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  test('verifies the user against the captured token before authenticating', async () => {
    const f = fixture();
    expect(await f.auth.check()).toEqual({ authenticated: true });
    expect(f.sdk.getUser).toHaveBeenCalledWith('access-token');
    expect(f.sdk.getSession).toHaveBeenCalledTimes(2);
    expect(await f.auth.getIdentity()).toEqual({
      id: 'user-1', name: 'Admin', email: 'admin@example.com',
      avatar: 'https://example.com/avatar', token: 'access-token',
    });
  });

  test('does not return retained identities when there is no session', async () => {
    const f = fixture();
    f.store(null);
    expect(await f.auth.getIdentity()).toBeNull();
    expect(await f.auth.check()).toEqual({ authenticated: false, redirectTo: '/login', logout: true });
    expect(f.sdk.getUser).not.toHaveBeenCalled();
  });

  test('rejects malformed sessions and user metadata without trusting storage', async () => {
    for (const stored of [
      {}, [], { ...session(), access_token: '' }, { ...session(), expires_in: '3600' },
      { ...session(), token_type: 'Basic' }, { ...session(), refresh_token: null },
      { ...session(), user: { ...user(), id: 1 } },
      { ...session(), user: { ...user(), user_metadata: { name: {} } } },
    ]) {
      const f = fixture();
      f.store(stored);
      const result = await f.auth.check();
      expect(result.authenticated).toBe(false);
      expect(result.error?.name).toBe('INVALID_AUTH_SESSION');
      expect(f.sdk.signOut).toHaveBeenCalledWith({ scope: 'local' });
    }
  });

  test('rejects unverified or mismatched remote user identities', async () => {
    for (const subject of [null, {}, user('other-user'), { ...user(), user_metadata: { avatar_url: 123 } }]) {
      const f = fixture();
      f.subject(subject);
      expect(await f.auth.getIdentity()).toBeNull();
      expect(f.sdk.signOut).toHaveBeenCalledWith({ scope: 'local' });
    }
  });

  test('supports absent and null presentation fields without inventing unvalidated identity data', async () => {
    const f = fixture();
    const subject = { ...user(), user_metadata: { name: null, avatar_url: null } };
    f.subject(subject);
    expect(await f.auth.getIdentity()).toEqual({
      id: 'user-1', name: 'admin', email: 'admin@example.com', token: 'access-token',
    });
  });

  test('handles structured session-expiry errors and does not inspect message substrings', async () => {
    const f = fixture();
    f.sdk.getSession.mockResolvedValueOnce({
      data: { session: null }, error: new AuthApiError('secret', 400, 'refresh_token_not_found'),
    });
    expect((await f.auth.check()).error?.name).toBe('AUTH_SESSION_EXPIRED');
    expect(f.sdk.signOut).toHaveBeenCalledWith({ scope: 'local' });
    f.sdk.signOut.mockClear();
    const handle = requireValue(f.auth.onError);
    expect(await handle(new Error('401 Unauthorized: Invalid Refresh Token'))).toEqual({});
    let reads = 0;
    expect(await handle({ get status() { reads++; return 401; } })).toEqual({});
    expect(await handle(new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('secret'); } }))).toEqual({});
    expect(reads).toBe(0);
    expect(f.sdk.signOut).not.toHaveBeenCalled();
  });

  test('does not turn transient identity lookup errors into a successful identity or a logout', async () => {
    const f = fixture();
    f.sdk.getUser.mockResolvedValue({
      data: { user: null }, error: new AuthRetryableFetchError('secret upstream details', 503),
    });
    await expect(f.auth.getIdentity()).rejects.toMatchObject({ code: 'AUTH_REQUEST_FAILED' });
    expect(await f.auth.check()).toEqual({
      authenticated: false,
      error: { name: 'AUTH_REQUEST_FAILED', message: 'Authentication request failed.' },
    });
    expect(f.sdk.signOut).not.toHaveBeenCalled();
  });

  test('does not combine an old verified identity with a newer session token', async () => {
    const f = fixture();
    f.sdk.getUser.mockImplementationOnce(async () => {
      f.store(session('user-2', 'new-token'));
      return { data: { user: user() }, error: null };
    });
    expect(await f.auth.getIdentity()).toBeNull();
    expect(f.sdk.signOut).not.toHaveBeenCalled();
  });

  test('fails closed without a configured permission resolver', async () => {
    const f = fixture();
    expect(await requireValue(f.auth.getPermissions)()).toBeNull();
    expect(f.sdk.getUser).not.toHaveBeenCalled();
  });

  test('passes validated user snapshots and the original client to a configured resolver', async () => {
    const f = fixture();
    const returned = { role: 'member', grants: ['billing.read'] };
    const resolver = mock(({ client, user }: { client: typeof f.client; user: SupabaseAuthUser }) => {
      expect(client).toBe(f.client);
      expect(user.user_metadata['role']).toBe('editable');
      user.user_metadata.name = 'Modified by resolver';
      return returned;
    });
    const auth = createSupabaseAuthProvider(f.client, { getPermissions: resolver });
    const permissions = await requireValue(auth.getPermissions)();
    returned.grants.push('admin.write');
    expect(permissions).toEqual({ role: 'member', grants: ['billing.read'] });
    expect((await f.auth.getIdentity())?.name).toBe('Admin');
  });

  test('rejects malformed permission results and sanitizes resolver exceptions', async () => {
    for (const returned of [undefined, new Date(), { value: NaN }, { call: () => {} }]) {
      const f = fixture();
      const auth = createSupabaseAuthProvider(f.client, { getPermissions: () => returned });
      await expect(requireValue(auth.getPermissions)()).rejects.toMatchObject({ code: 'INVALID_PERMISSIONS' });
    }
    const f = fixture();
    const auth = createSupabaseAuthProvider(f.client, { getPermissions: () => { throw new Error('secret'); } });
    await expect(requireValue(auth.getPermissions)()).rejects.toMatchObject({
      code: 'PERMISSION_LOOKUP_FAILED', message: 'Permission lookup failed.',
    });
  });

  test('never invokes permission resolvers for absent or unverified users', async () => {
    const f = fixture();
    const resolver = mock(() => ['admin']);
    const auth = createSupabaseAuthProvider(f.client, { getPermissions: resolver });
    f.store(null);
    expect(await requireValue(auth.getPermissions)()).toBeNull();
    f.store(session());
    f.sdk.getUser.mockResolvedValueOnce({ data: { user: null }, error: new AuthRetryableFetchError('secret', 503) });
    await expect(requireValue(auth.getPermissions)()).rejects.toMatchObject({ code: 'AUTH_REQUEST_FAILED' });
    expect(resolver).not.toHaveBeenCalled();
  });

  test('discards permission results when the session changes during resolution', async () => {
    const f = fixture();
    const auth = createSupabaseAuthProvider(f.client, { getPermissions: async () => {
      f.store(session('other-user', 'new-token'));
      return { role: 'admin' };
    } });
    expect(await requireValue(auth.getPermissions)()).toBeNull();
    expect(f.sdk.signOut).not.toHaveBeenCalled();
  });

  test('validates registration fields and forwards only the supported profile values', async () => {
    const f = fixture();
    const register = requireValue(f.auth.register);
    expect((await register({ email: 'a', password: 'secret', role: 'admin' })).error?.name).toBe('INVALID_AUTH_INPUT');
    expect((await register({ email: 'a', password: 'secret', name: 42 })).success).toBe(false);
    expect(f.sdk.signUp).not.toHaveBeenCalled();
    expect((await register({ email: 'a', username: 'a', password: 'secret', name: 'Member' })).success).toBe(true);
    expect(f.sdk.signUp).toHaveBeenCalledWith({
      email: 'a', password: 'secret', options: { data: { name: 'Member', username: 'a' } },
    });
    expect((await register({ email: 'a', password: 'secret' })).success).toBe(true);
    expect(f.sdk.signUp).toHaveBeenLastCalledWith({ email: 'a', password: 'secret', options: { data: {} } });
  });

  test('requires validated signup and recovery receipts instead of accepting a missing error', async () => {
    const f = fixture();
    f.sdk.signUp.mockResolvedValueOnce({ error: null });
    expect((await requireValue(f.auth.register)({ email: 'a', password: 'secret' })).error?.name)
      .toBe('WRITE_OUTCOME_UNKNOWN');
    expect((await requireValue(f.auth.forgotPassword)({ email: 1 })).error?.name).toBe('INVALID_AUTH_INPUT');
    expect(f.sdk.resetPasswordForEmail).not.toHaveBeenCalled();
    f.sdk.resetPasswordForEmail.mockResolvedValueOnce({ data: [], error: null });
    expect((await requireValue(f.auth.forgotPassword)({ email: 'a' })).error?.name).toBe('WRITE_OUTCOME_UNKNOWN');
    expect((await requireValue(f.auth.forgotPassword)({ email: 'a', username: 'a' })).success).toBe(true);
  });

  test('validates password confirmation and the returned update user before success', async () => {
    const f = fixture();
    const update = requireValue(f.auth.updatePassword);
    expect((await update({ password: 'secret', confirmPassword: 'different' })).error?.name).toBe('INVALID_AUTH_INPUT');
    expect(f.sdk.updateUser).not.toHaveBeenCalled();
    expect((await update({ password: 'secret', confirmPassword: 'secret' })).success).toBe(true);
    expect(f.sdk.updateUser).toHaveBeenCalledWith({ password: 'secret' });
    f.sdk.updateUser.mockResolvedValueOnce({ data: { user: user('other-user') }, error: null });
    expect((await update({ password: 'secret' })).error?.name).toBe('WRITE_OUTCOME_UNKNOWN');
  });

  test('does not announce logout success before verifying its receipt and cleared storage', async () => {
    for (const reply of [undefined, {}, { error: false }, { error: new AuthRetryableFetchError('secret', 503) }, { error: null }]) {
      const f = fixture();
      f.sdk.signOut.mockResolvedValueOnce(reply);
      expect((await f.auth.logout()).error?.name).toBe('AUTH_CLEANUP_FAILED');
      expect(audits).toEqual([]);
    }
    const f = fixture();
    expect(await f.auth.logout()).toEqual({ success: true, redirectTo: '/login' });
    expect(f.sdk.signOut).toHaveBeenCalledWith({ scope: 'global' });
    expect(audits.at(-1)?.action).toBe('logout');
    expect(await f.auth.getIdentity()).toBeNull();
  });

  test('still attempts logout when identity verification is unavailable', async () => {
    const f = fixture();
    f.sdk.getUser.mockRejectedValueOnce(new Error('secret'));
    expect((await f.auth.logout()).success).toBe(true);
    expect(f.sdk.signOut).toHaveBeenCalledWith({ scope: 'global' });
    expect(audits.at(-1)?.userId).toBeUndefined();
  });

  test('serializes login and logout so delayed login cannot restore the logged-out session', async () => {
    const f = fixture();
    const completion = deferred();
    f.sdk.signInWithPassword.mockImplementationOnce(() => completion.promise);
    const login = f.auth.login({ email: 'a', password: 'secret' });
    const logout = f.auth.logout();
    await flush();
    expect(f.sdk.signOut).not.toHaveBeenCalled();
    completion.resolve({ data: { user: user(), session: session() }, error: null });
    expect((await login).success).toBe(true);
    expect((await logout).success).toBe(true);
    expect((await f.auth.check()).authenticated).toBe(false);
  });

  test('does not clear a newer login when an earlier identity lookup fails', async () => {
    const f = fixture();
    const completion = deferred();
    f.sdk.getUser.mockImplementationOnce(() => completion.promise);
    const checking = f.auth.check();
    await flush();
    const login = f.auth.login({ email: 'a', password: 'secret' });
    completion.resolve({ data: { user: null }, error: new AuthApiError('secret', 401, 'bad_jwt') });
    expect((await login).success).toBe(true);
    expect((await checking).error?.name).toBe('AUTH_SESSION_CHANGED');
    expect(f.sdk.signOut).not.toHaveBeenCalled();
  });

  test('verifies structured unauthorized errors against the current session before requesting logout', async () => {
    const f = fixture();
    const handle = requireValue(f.auth.onError);
    expect(await handle(new AuthApiError('secret', 401, undefined))).toEqual({});
    expect(f.sdk.getUser).toHaveBeenCalledWith('access-token');
    f.store(null);
    expect(await handle(new AuthApiError('secret', 401, undefined))).toEqual({ redirectTo: '/login', logout: true });
  });

  test('works with real SDK login storage, verified identity, reset/update requests and logout', async () => {
    const token = `${btoa('{}')}.${btoa(JSON.stringify({
      sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600,
    }))}.test`;
    const request = mock(async (url: RequestInfo | URL, _options?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path.endsWith('/token')) return Response.json({
        access_token: token, refresh_token: 'refresh-token', expires_in: 3600,
        token_type: 'bearer', user: user(),
      });
      if (path.endsWith('/user')) return Response.json(user());
      if (path.endsWith('/recover')) return Response.json({});
      if (path.endsWith('/logout')) return new Response(null, { status: 204 });
      throw new Error('Unexpected auth endpoint');
    });
    const client = createClient('https://supabase.example', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: Object.assign(request, { preconnect: () => {} }) },
    });
    const auth = createSupabaseAuthProvider(client);
    expect((await auth.login({ email: 'admin@example.com', username: 'admin@example.com', password: 'secret' })).success).toBe(true);
    expect((await auth.check()).authenticated).toBe(true);
    expect((await auth.getIdentity())?.['token']).toBe(token);
    expect((await requireValue(auth.updatePassword)({ password: 'new-secret', confirmPassword: 'new-secret' })).success).toBe(true);
    expect((await requireValue(auth.forgotPassword)({ email: 'admin@example.com' })).success).toBe(true);
    const userCall = requireValue(request.mock.calls.find(([url]) => String(url).endsWith('/user')));
    expect(new Headers(userCall[1]?.headers).get('Authorization')).toBe(`Bearer ${token}`);
    expect((await auth.logout()).success).toBe(true);
    expect((await client.auth.getSession()).data.session).toBeNull();
    const loginCall = requireValue(request.mock.calls.find(([url]) => String(url).includes('/token')));
    expect(loginCall[1]?.body).toBe(JSON.stringify({
      email: 'admin@example.com', password: 'secret', gotrue_meta_security: {},
    }));
  });
});
