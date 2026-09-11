// Unit tests for URL parsing (useParsed logic)
// We test the pure parsing logic directly since the hook itself uses Svelte runes.
import { describe, test, expect } from 'bun:test';

/**
 * Parse a hash-based URL into structured route info.
 * This mirrors the logic in useParsed.ts.
 */
function parseHash(hash: string) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [pathPart = '/', queryPart] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  
  const params: Record<string, string> = {};
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
  }

  return {
    resource: segments[0],
    action: segments[1],
    id: segments[2],
    params,
  };
}

describe('parseHash (useParsed logic)', () => {
  test('empty hash', () => {
    const result = parseHash('');
    expect(result.resource).toBeUndefined();
    expect(result.action).toBeUndefined();
    expect(result.id).toBeUndefined();
    expect(result.params).toEqual({});
  });

  test('root hash', () => {
    const result = parseHash('#/');
    expect(result.resource).toBeUndefined();
  });

  test('resource only', () => {
    const result = parseHash('#/posts');
    expect(result.resource).toBe('posts');
    expect(result.action).toBeUndefined();
    expect(result.id).toBeUndefined();
  });

  test('resource and action', () => {
    const result = parseHash('#/posts/create');
    expect(result.resource).toBe('posts');
    expect(result.action).toBe('create');
  });

  test('resource, action, and id', () => {
    const result = parseHash('#/posts/edit/42');
    expect(result.resource).toBe('posts');
    expect(result.action).toBe('edit');
    expect(result.id).toBe('42');
  });

  test('with query params', () => {
    const result = parseHash('#/posts?page=2&sort=name');
    expect(result.resource).toBe('posts');
    expect(result.params['page']).toBe('2');
    expect(result.params['sort']).toBe('name');
  });

  test('resource with action and query', () => {
    const result = parseHash('#/posts/edit/5?tab=details');
    expect(result.resource).toBe('posts');
    expect(result.action).toBe('edit');
    expect(result.id).toBe('5');
    expect(result.params['tab']).toBe('details');
  });

  test('encoded query params', () => {
    const result = parseHash('#/search?q=hello%20world&filter=tag%3Djs');
    expect(result.params['q']).toBe('hello world');
    expect(result.params['filter']).toBe('tag=js');
  });

  test('login route', () => {
    const result = parseHash('#/login');
    expect(result.resource).toBe('login');
    expect(result.action).toBeUndefined();
  });
});
