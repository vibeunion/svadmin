import { describe, expect, it } from 'vitest';
import { isQueryKey, keys, parseQueryKey, queryKeys, queryKeyMatches } from './query-keys';

describe('query-keys v2', () => {
  it('builds data keys', () => {
    const k = keys({ provider: 'default', tenant: 'tenant-a', resource: 'posts', method: 'post' });

    expect(k.data.list('posts', { page: 2 })[0].kind).toBe('data');
    expect(k.data.list('posts', { page: 2 })[0].params).toEqual({ page: 2 });
    expect(k.data.infiniteList('posts')[0].action).toBe('infiniteList');
    expect(k.data.one('posts', 1, { locale: 'zh-CN' })[0]).toMatchObject({ id: 1, params: { locale: 'zh-CN' } });
    expect(k.data.many('posts', { perPage: 10 })[0].params).toMatchObject({ perPage: 10 });
    expect(k.data.select('posts')[0].action).toBe('select');
    expect(k.data.selectDefaults('posts')[0].action).toBe('selectDefaults');
  });

  it('builds task keys', () => {
    const k = keys({ provider: 'dp' });

    expect(k.task.list({ queue: 'default' })[0]).toMatchObject({ kind: 'task', params: { queue: 'default' } });
    expect(k.task.list()[0].action).toBe('list');
    expect(k.task.one('42')[0].action).toBe('one');
    expect(k.task.one('42')[0].id).toBe('42');
  });

  it('builds access and custom keys', () => {
    const k = keys({ provider: 'auth' });

    expect(k.access.can()[0].kind).toBe('access');
    expect(k.custom.call('users', 'u1', 'get', { include: 'meta' })[0].kind).toBe('custom');
    expect(k.custom.call('users', 'u1', 'get', { include: 'meta' })[0].resource).toBe('users');
    expect(k.custom.call('users', 'u1', 'get', { include: 'meta' })[0].method).toBe('get');
  });

  it('rejects legacy tuple shapes', () => {
    expect(parseQueryKey(['default', 'posts', 'list'])).toBeUndefined();
    expect(isQueryKey(['default', 'posts'])).toBe(false);
  });

  it('requires non-empty provider and defaults undefined to default', () => {
    expect(keys().data.list('posts')[0].provider).toBe('default');
    expect(() => keys({ provider: '' }).data.list('posts')).toThrowError(/non-empty/);
    expect(queryKeys.data.list('posts')[0]).toBeTruthy();
  });

  it('matches with wildcard and exact fields', () => {
    const key = keys({ provider: 'p1', tenant: 'tenant-a' }).data.one('posts', '12');

    expect(queryKeyMatches(key, {})).toBe(true);
    expect(queryKeyMatches(key, { provider: 'p1' })).toBe(true);
    expect(queryKeyMatches(key, { provider: 'default' })).toBe(false);
    expect(queryKeyMatches(key, { tenant: undefined })).toBe(false);
    expect(queryKeyMatches(key, { tenant: 'tenant-a' })).toBe(true);
    expect(queryKeyMatches(key, { resource: 'posts' })).toBe(true);
    expect(queryKeyMatches(key, { resource: undefined })).toBe(false);
    expect(queryKeyMatches(key, { action: 'one' })).toBe(true);
    expect(queryKeyMatches(key, { action: undefined })).toBe(false);
    expect(queryKeyMatches(key, { id: '12' })).toBe(true);
    expect(queryKeyMatches(key, { method: undefined })).toBe(true);
    expect(queryKeyMatches(key, { method: 'post' })).toBe(false);
  });

  it('parses only v2 descriptor tuple', () => {
    const descriptor = keys().task.list()[0];
    const parsed = parseQueryKey([descriptor]);
    const expected = parseQueryKey([descriptor]) as NonNullable<ReturnType<typeof parseQueryKey>>;

    expect(parsed).toBe(expected);
    expect(parsed?.namespace).toBe('svadmin');
    expect(parsed?.version).toBe(2);
    expect(parseQueryKey(descriptor)).toBeUndefined();
    expect(queryKeys.task.one('42')[0].kind).toBe('task');
    expect(isQueryKey([descriptor])).toBe(true);
  });

  it('rejects malformed descriptor fields before diagnostics or matching', () => {
    const valid = keys().data.list('posts')[0];

    expect(parseQueryKey([{ ...valid, tenant: { secret: true } }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, resource: { secret: true } }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, id: { secret: true } }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, method: { secret: true } }])).toBeUndefined();
    expect(parseQueryKey([{ ...valid, action: 'unknown' }])).toBeUndefined();
    expect(parseQueryKey([{ ...keys().custom.call('health', 'request')[0], action: { secret: true } }])).toBeUndefined();
  });

  it('supports matcher exact kind constraints', () => {
    const key = keys({ provider: 'p1' }).custom.call('users', 'u1', 'post');

    expect(queryKeyMatches(key, { kind: 'custom' })).toBe(true);
    expect(queryKeyMatches(key, { kind: 'data' })).toBe(false);
    expect(queryKeyMatches(key, { kind: 'custom', provider: 'p1', resource: 'users' })).toBe(true);
    expect(queryKeyMatches(key, { kind: 'custom', provider: 'p1', resource: 'posts' })).toBe(false);
  });
});
