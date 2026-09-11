import { describe, expect, test } from 'bun:test';
import { decodePermissionHints, hasPermissionHint } from './permission-hints-contract';

describe('permission hint boundary', () => {
  test('accepts detached immutable arrays, boolean maps and null', () => {
    const source = ['posts:read'];
    const hints = decodePermissionHints(source);
    source.push('posts:delete');
    expect(hints).toEqual(['posts:read']);
    expect(Object.isFrozen(hints)).toBe(true);
    expect(hasPermissionHint(hints, 'posts:delete')).toBe(false);
    expect(decodePermissionHints(null)).toBeNull();
    const map = decodePermissionHints({ admin: true, write: false });
    expect(Object.isFrozen(map)).toBe(true);
    expect(hasPermissionHint(map, 'admin')).toBe(true);
    expect(hasPermissionHint(map, 'write')).toBe(false);
  });

  test('does not treat inherited names or truthy values as grants', () => {
    const hints = decodePermissionHints({});
    for (const permission of ['constructor', 'toString', '__proto__']) {
      expect(hasPermissionHint(hints, permission)).toBe(false);
    }
    const explicit: unknown = JSON.parse('{"__proto__":true,"constructor":false}');
    expect(hasPermissionHint(decodePermissionHints(explicit), '__proto__')).toBe(true);
    for (const value of [undefined, true, 'admin', [''], ['  '], [1], { admin: 'true' }, { admin: 1 }, { '': true }, { ' ': true }, { roles: ['admin'] }, new Set(['admin'])]) {
      expect(() => decodePermissionHints(value)).toThrow('Invalid permission hints.');
    }
  });

  test('rejects accessors and cycles without disclosing provider values', () => {
    let reads = 0;
    const source = { get admin() { reads++; throw new Error('private-token'); } };
    const cycle: Record<string, unknown> = {};
    cycle['admin'] = cycle;
    for (const value of [source, cycle]) {
      expect(() => decodePermissionHints(value)).toThrow('Invalid permission hints.');
    }
    expect(reads).toBe(0);
  });
});
