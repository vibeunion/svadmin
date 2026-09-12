import { describe, expect, test } from 'bun:test';
import { AuthQueryError, decodeAuthCheck, decodeIdentity, decodeAuthErrorResult } from './auth-query-contract';

describe('authentication query contracts', () => {
  test('snapshots identity fields and nested extension data', () => {
    const source = { id: 'one', name: 'Reader', metadata: { roles: ['reader'] } };
    const identity = decodeIdentity(source);
    source.name = 'Changed';
    source.metadata.roles.push('admin');
    expect(identity).toEqual({ id: 'one', name: 'Reader', metadata: { roles: ['reader'] } });
    expect(Object.isFrozen(identity)).toBe(true);
    expect(decodeIdentity(null)).toBeNull();
    expect(decodeIdentity({})).toEqual({});
  });

  test.each([
    undefined, false, [], 'user', { id: 1 }, { name: undefined },
    { email: null }, { avatar: new URL('https://example.test') },
    { metadata: new Set(['admin']) }, { metadata: Infinity },
  ].map(value => ({ value })))('rejects invalid identity data %#', ({ value }) => {
    expect(() => decodeIdentity(value)).toThrow('Invalid authentication identity.');
  });

  test('rejects accessors, cyclic extensions and exotic objects without executing them', () => {
    let calls = 0;
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    const accessor = { get name() { ++calls; return 'private-token'; } };
    const inherited: unknown = Object.create({ id: 'inherited' });
    for (const input of [accessor, cyclic, new Error('private-token'), inherited]) {
      expect(() => decodeIdentity(input)).toThrow(AuthQueryError);
    }
    expect(calls).toBe(0);
  });

  test('accepts a strict authenticated result and local redirect', () => {
    const source = { authenticated: true, redirectTo: '/posts?sort=name#row' };
    const result = decodeAuthCheck(source);
    source.authenticated = false;
    expect(result).toEqual({ authenticated: true, redirectTo: '/posts?sort=name#row' });
    expect(Object.isFrozen(result)).toBe(true);
  });

  test('redacts provider diagnostics even when they are valid strings', () => {
    const result = decodeAuthCheck({
      authenticated: false, logout: true, redirectTo: '/login',
      error: { message: 'private-token', name: 'private-name' },
    });
    expect(result.error).toEqual({ message: 'Authentication check failed.', name: 'AUTH_CHECK_REJECTED' });
    expect(Object.isFrozen(result.error)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('private');
  });

  test.each([
    null, undefined, {}, [], { authenticated: 1 }, { authenticated: 'true' },
    { authenticated: true, logout: true },
    { authenticated: true, error: { message: 'conflicting state' } },
    { authenticated: false, logout: 'true' }, { authenticated: false, logout: undefined },
    { authenticated: false, error: new Error('private-token') },
    { authenticated: false, extra: true },
    ...['https://example.test', '//example.test', '/\\example.test', 'javascript:alert(1)', '', '/ bad', '/\nlogin']
      .map(redirectTo => ({ authenticated: false, redirectTo })),
  ].map(value => ({ value })))('rejects invalid or contradictory check results %#', ({ value }) => {
    expect(() => decodeAuthCheck(value)).toThrow('Invalid authentication check result.');
  });

  test('accepts only checked logout and local redirect instructions from error handlers', () => {
    expect(decodeAuthErrorResult({})).toEqual({});
    expect(decodeAuthErrorResult({ logout: true, redirectTo: '/login' }))
      .toEqual({ logout: true, redirectTo: '/login' });
    for (const value of [
      null, undefined, { logout: 'true' }, { logout: undefined }, { redirectTo: '//example.test' },
      { redirectTo: 'javascript:alert(1)' }, { token: 'private-token' },
    ]) {
      expect(() => decodeAuthErrorResult(value)).toThrow('Invalid authentication error handling result.');
    }
  });
});
