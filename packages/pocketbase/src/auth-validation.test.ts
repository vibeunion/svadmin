import { describe, expect, mock, test } from 'bun:test';
import PocketBase, { BaseAuthStore, ClientResponseError } from 'pocketbase';
import { requireValue } from '../../../scripts/test-assertions';
import { createPocketBaseAuthProvider, type PocketBaseAuthClient } from './auth-provider';

function fixture() {
  let response: unknown = { record: { id: 'user-1', email: 'user@example.com' }, token: 'test-token' };
  let created: unknown = { id: 'new-1' };
  let receipt: unknown = true;
  const clear = mock((): void => {
    store.isValid = false;
    store.record = null;
    store.token = '';
  });
  const store: { isValid: unknown; record: unknown; token: unknown; clear: typeof clear } = {
    isValid: true, record: { id: 'user-1', email: 'user@example.com' }, token: 'test-token', clear,
  };
  const collection = {
    authWithPassword: mock(async (_email: string, _password: string): Promise<unknown> => response),
    create: mock(async (_data: Record<string, unknown>): Promise<unknown> => created),
    requestPasswordReset: mock(async (_email: string): Promise<unknown> => receipt),
    confirmPasswordReset: mock(async (_token: string, _password: string, _confirmation: string): Promise<unknown> => receipt),
  };
  const pb = { authStore: store, collection: mock((_name: string) => collection) } satisfies PocketBaseAuthClient;
  return {
    pb, store, clear, collection, auth: createPocketBaseAuthProvider({ pb }),
    response: (value: unknown) => { response = value; },
    created: (value: unknown) => { created = value; },
    receipt: (value: unknown) => { receipt = value; },
  };
}

describe('PocketBase authentication boundaries', () => {
  test('rejects malformed credentials before dispatch without clearing the existing session', async () => {
    const { auth, pb, clear } = fixture();
    const inputs = [
      {}, { email: 1, password: 'secret' }, { email: 'a', password: null },
      { email: 'a', password: '' }, { email: 'a', password: 'secret', collection: {} },
      { email: 'a', password: 'secret', collection: '../users' },
      { email: 'a', password: 'secret', unexpected: true },
      { email: 'a', password: 'secret', collection: undefined },
    ];
    for (const input of inputs) {
      expect(await auth.login(input)).toMatchObject({ success: false, error: { message: 'Invalid PocketBase input' } });
    }
    expect(pb.collection).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });

  test('rejects accessors without reading submitted credentials', async () => {
    const { auth, pb } = fixture();
    let reads = 0;
    const result = await auth.login({ email: 'a', get password() { reads++; return 'secret'; } });
    expect(result.success).toBe(false);
    expect(reads).toBe(0);
    expect(pb.collection).not.toHaveBeenCalled();
  });

  test('rejects malformed login envelopes and clears partially saved auth state', async () => {
    for (const value of [null, {}, { record: [], token: 'secret' },
      { record: { id: 1 }, token: 'secret' }, { record: { id: '1' }, token: '' },
      { record: { id: '1', email: {} }, token: 'secret' }]) {
      const f = fixture();
      f.response(value);
      expect(await f.auth.login({ email: 'a', password: 'secret' }))
        .toMatchObject({ success: false, error: { message: 'Invalid PocketBase response' } });
      expect(f.clear).toHaveBeenCalledTimes(1);
      expect(await f.auth.getIdentity()).toBeNull();
    }
  });

  test('validates session flags, tokens and identity field types before authentication', async () => {
    for (const invalid of [
      { isValid: 'true' }, { token: '' }, { token: {} }, { record: [] },
      { record: { id: 42 } }, { record: { id: '1', name: {} } },
      { record: { id: '1', email: 42 } }, { record: { id: '1', avatar: false } },
    ]) {
      const f = fixture();
      Object.assign(f.store, invalid);
      expect((await f.auth.check()).authenticated).toBe(false);
      expect(await f.auth.getIdentity()).toBeNull();
      expect(f.clear).toHaveBeenCalledTimes(1);
    }
  });

  test('does not expose retained identity data from an expired session', async () => {
    const f = fixture();
    f.store.isValid = false;
    expect(await f.auth.getIdentity()).toBeNull();
    expect((await f.auth.check()).authenticated).toBe(false);
  });

  test('projects only validated identity fields and does not require an email field', async () => {
    const f = fixture();
    f.store.record = { id: '1', name: 'Admin', role: 'root', token: 'secret' };
    expect(await f.auth.getIdentity()).toEqual({ id: '1', name: 'Admin' });
    f.store.record = { id: '1' };
    expect(await f.auth.getIdentity()).toEqual({ id: '1', name: '1' });
  });

  test('rejects malformed registration and reset input before any SDK write', async () => {
    const f = fixture();
    expect((await requireValue(f.auth.register)({ email: 'a', password: 'p', confirmPassword: 'different' })).success).toBe(false);
    expect((await requireValue(f.auth.register)({ email: 'a', password: 'p', name: 2 })).success).toBe(false);
    expect((await requireValue(f.auth.forgotPassword)({ email: null })).success).toBe(false);
    expect((await requireValue(f.auth.updatePassword)({ token: {}, password: 'p' })).success).toBe(false);
    expect((await requireValue(f.auth.updatePassword)({ token: 't', password: 'p', confirmPassword: 'different' })).success).toBe(false);
    expect(f.pb.collection).not.toHaveBeenCalled();
  });

  test('omits absent optional registration fields rather than forwarding undefined', async () => {
    const f = fixture();
    expect((await requireValue(f.auth.register)({ email: 'a', password: 'p' })).success).toBe(true);
    expect(f.collection.create).toHaveBeenCalledWith({ email: 'a', password: 'p', passwordConfirm: 'p' });
  });

  test('validates actual form identifiers and confirmation fields before SDK projection', async () => {
    const f = fixture();
    expect((await f.auth.login({ email: 'a', username: 'a', password: 'p' })).success).toBe(true);
    expect(f.collection.authWithPassword).toHaveBeenCalledWith('a', 'p');
    expect((await requireValue(f.auth.register)({ email: 'a', username: 'a', password: 'p', confirmPassword: 'p' })).success).toBe(true);
    expect(f.collection.create).toHaveBeenCalledWith({ email: 'a', password: 'p', passwordConfirm: 'p' });
    expect((await requireValue(f.auth.forgotPassword)({ email: 'a', username: 'a' })).success).toBe(true);
    expect((await requireValue(f.auth.updatePassword)({ token: 'token', password: 'p', confirmPassword: 'p' })).success).toBe(true);
    expect(f.collection.confirmPasswordReset).toHaveBeenCalledWith('token', 'p', 'p');
    f.pb.collection.mockClear();
    expect((await f.auth.login({ email: 'a', username: 'different', password: 'p' })).success).toBe(false);
    expect((await requireValue(f.auth.register)({ email: 'a', username: 'different', password: 'p' })).success).toBe(false);
    expect((await requireValue(f.auth.forgotPassword)({ email: 'a', username: 'different' })).success).toBe(false);
    expect(f.pb.collection).not.toHaveBeenCalled();
  });

  test('does not invent successful registration or reset receipts', async () => {
    for (const invalid of [undefined, false, null, {}, [], { id: 1 }]) {
      const f = fixture();
      f.created(invalid);
      f.receipt(invalid);
      for (const result of [
        await requireValue(f.auth.register)({ email: 'a', password: 'p' }),
        await requireValue(f.auth.forgotPassword)({ email: 'a' }),
        await requireValue(f.auth.updatePassword)({ token: 't', password: 'p' }),
      ]) {
        expect(result.success).toBe(false);
        expect(result.error?.name).toBe('WRITE_OUTCOME_UNKNOWN');
      }
    }
  });

  test('never forwards thrown transport messages or credential data', async () => {
    const f = fixture();
    f.collection.authWithPassword.mockImplementation(async () => { throw { message: 'secret credential' }; });
    expect(await f.auth.login({ email: 'a', password: 'secret credential' }))
      .toEqual({ success: false, error: { message: 'Login failed.' } });
  });

  test('uses actual SDK status fields and ignores status-looking messages and accessors', async () => {
    const f = fixture();
    const handle = requireValue(f.auth.onError);
    expect(await handle(new Error('report 401 happened'))).toEqual({});
    let reads = 0;
    expect(await handle({ get status() { reads++; return 401; } })).toEqual({});
    expect(reads).toBe(0);
    expect(f.clear).not.toHaveBeenCalled();
    expect(await handle(new ClientResponseError({ status: 401 }))).toEqual({ redirectTo: '/login', logout: true });
    expect(f.clear).toHaveBeenCalledTimes(1);
  });

  test('ignores uninspectable error objects without leaking proxy exceptions', async () => {
    const f = fixture();
    const error = new Proxy({}, {
      getOwnPropertyDescriptor() { throw new Error('secret'); },
    });
    expect(await requireValue(f.auth.onError)(error)).toEqual({});
    expect(f.clear).not.toHaveBeenCalled();
  });

  test('reads the SDK validity flag once per session check', async () => {
    const f = fixture();
    let reads = 0;
    Object.defineProperty(f.store, 'isValid', { get() { reads++; return true; } });
    expect((await f.auth.check()).authenticated).toBe(true);
    expect(reads).toBe(1);
  });

  test('works with the real SDK record auth store and HTTP serialization', async () => {
    const pb = new PocketBase('https://pocketbase.example', new BaseAuthStore());
    const token = `${btoa('{}')}.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`;
    const request = mock(async (_url: RequestInfo | URL, _config?: RequestInit) => Response.json({
      token, record: { id: 'user-1', collectionId: 'users', collectionName: 'users', email: 'user@example.com' },
    }));
    pb.beforeSend = (url, options) => ({ url, options: { ...options, fetch: request } });
    const auth = createPocketBaseAuthProvider({ pb });
    expect((await auth.login({ email: 'user@example.com', password: 'test-password' })).success).toBe(true);
    expect((await auth.check()).authenticated).toBe(true);
    expect(await auth.getIdentity()).toEqual({ id: 'user-1', name: 'user', email: 'user@example.com' });
    const [url, config] = requireValue(request.mock.calls[0]);
    expect(String(url)).toContain('/api/collections/users/auth-with-password');
    expect(config?.body).toBe(JSON.stringify({ identity: 'user@example.com', password: 'test-password' }));
    expect((await auth.logout()).success).toBe(true);
    expect(pb.authStore.record).toBeNull();
    expect(pb.authStore.token).toBe('');
  });
});
