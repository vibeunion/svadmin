import { describe, expect, mock, test } from 'bun:test';
import {
  AuthMutationError, decodeAuthAction, prepareAuthMutation, type AuthMutationMethod,
} from './auth-mutation-contract';
import type { AuthProvider } from './types';

function authProvider(): AuthProvider {
  return {
    login: mock(async () => ({ success: true })),
    logout: mock(async () => ({ success: true })),
    register: mock(async () => ({ success: true })),
    forgotPassword: mock(async () => ({ success: true })),
    updatePassword: mock(async () => ({ success: true })),
    updateIdentity: mock(async () => ({ success: true })),
    updateProfile: mock(async () => ({ success: true })),
    check: async () => ({ authenticated: false }),
    getIdentity: async () => null,
  };
}

describe('authentication mutation boundaries', () => {
  test('snapshots credential data and the method while preserving its receiver', async () => {
    const provider = authProvider();
    const login = mock(async function(this: AuthProvider, input: Record<string, unknown>) {
      expect(this).toBe(provider);
      expect(input).toEqual({ credentials: { identifier: 'reader', password: 'before' } });
      return { success: true };
    });
    provider.login = login;
    const params = { credentials: { identifier: 'reader', password: 'before' } };
    const invoke = prepareAuthMutation(provider, 'login', params);
    params.credentials.password = 'after';
    provider.login = mock(async () => ({ success: false }));
    expect(await invoke()).toEqual({ success: true });
    expect(login).toHaveBeenCalledTimes(1);
    expect(provider.login).not.toHaveBeenCalled();
  });

  const methods: AuthMutationMethod[] = [
    'login', 'register', 'forgotPassword', 'updatePassword', 'updateIdentity', 'updateProfile',
  ];
  test.each(methods)('rejects absent input for %s without invoking the provider', method => {
    const provider = authProvider();
    expect(() => prepareAuthMutation(provider, method, undefined)).toThrow('Invalid authentication input.');
    expect(provider[method]).not.toHaveBeenCalled();
  });

  test('allows omitted logout parameters and dispatches every action', async () => {
    const provider = authProvider();
    expect(await prepareAuthMutation(provider, 'logout', undefined)()).toEqual({ success: true });
    expect(provider.logout).toHaveBeenCalledWith(undefined);
    for (const method of methods) {
      prepareAuthMutation(provider, method, {});
      expect(provider[method]).not.toHaveBeenCalled();
      expect(await prepareAuthMutation(provider, method, {})()).toEqual({ success: true });
    }
  });

  test('preserves an avatar File while snapshotting the rest of the profile', async () => {
    const provider = authProvider();
    const avatar = new File(['image'], 'avatar.png', { type: 'image/png' });
    const input = { name: 'Reader', avatar, metadata: { title: 'Engineer' } };
    const invoke = prepareAuthMutation(provider, 'updateProfile', input);
    input.metadata.title = 'Changed';
    await invoke();
    expect(provider.updateProfile).toHaveBeenCalledWith({
      name: 'Reader', avatar, metadata: { title: 'Engineer' },
    });
  });

  test.each([
    { name: 2 }, { avatar: 2 }, { avatar: undefined }, { name: undefined },
    { avatar: new File(['image'], 'a.png'), metadata: new Set(['secret']) },
  ])('rejects malformed profile fields %#', value => {
    expect(() => prepareAuthMutation(authProvider(), 'updateProfile', value)).toThrow('Invalid authentication input.');
  });

  test('rejects input accessors and functions without invoking them', () => {
    let reads = 0;
    const provider = authProvider();
    const input = { get password() { ++reads; return 'private-token'; } };
    expect(() => prepareAuthMutation(provider, 'login', input)).toThrow(AuthMutationError);
    expect(() => prepareAuthMutation(provider, 'login', { callback: () => {} })).toThrow(AuthMutationError);
    expect(reads).toBe(0);
    expect(provider.login).not.toHaveBeenCalled();
  });

  test('normalizes missing methods and throwing method accessors', () => {
    const provider = authProvider();
    delete provider.register;
    expect(() => prepareAuthMutation(provider, 'register', {})).toThrow('Authentication method is unavailable.');
    Reflect.set(provider, 'login', null);
    expect(() => prepareAuthMutation(provider, 'login', {})).toThrow('Authentication method is unavailable.');
    Object.defineProperty(provider, 'logout', { get() { throw new Error('private-token'); } });
    expect(() => prepareAuthMutation(provider, 'logout', undefined)).toThrow('Authentication method is unavailable.');
  });

  test('returns immutable action results and redacts provider rejection text', () => {
    const source = { success: true, redirectTo: '/posts' };
    const result = decodeAuthAction(source);
    source.redirectTo = '//example.test';
    expect(result).toEqual({ success: true, redirectTo: '/posts' });
    expect(Object.isFrozen(result)).toBe(true);
    const rejected = decodeAuthAction({ success: false, error: { name: 'secret', message: 'private-token' } });
    expect(rejected).toEqual({
      success: false, error: { name: 'AUTH_REJECTED', message: 'Authentication request was rejected.' },
    });
    expect(Object.isFrozen(rejected.error)).toBe(true);
  });

  test.each([
    null, undefined, {}, [], true, { success: 'true' }, { success: true, error: { message: 'conflict' } },
    { success: true, redirectTo: undefined }, { success: true, redirectTo: 'javascript:alert(1)' },
    { success: true, redirectTo: '//example.test' }, { success: true, token: 'private-token' },
    { success: false, error: new Error('private-token') },
  ].map(value => ({ value })))('rejects invalid action receipts %#', ({ value }) => {
    expect(() => decodeAuthAction(value)).toThrow('Invalid authentication result; its outcome could not be confirmed.');
  });
});
