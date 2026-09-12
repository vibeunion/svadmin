/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for RouterProvider implementations
// Router provider tests need a DOM environment or a mock.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createHashRouterProvider, createHistoryRouterProvider } from './router-provider';

describe('createHashRouterProvider (unit — no DOM)', () => {

  test('returns provider with go, back, parse methods', () => {
    const provider = createHashRouterProvider();
    expect(typeof provider.go).toBe('function');
    expect(typeof provider.back).toBe('function');
    expect(typeof provider.parse).toBe('function');
  });
});

describe('createHistoryRouterProvider (unit — no DOM)', () => {
  test('returns provider with go, back, parse methods', () => {
    const provider = createHistoryRouterProvider();
    expect(typeof provider.go).toBe('function');
    expect(typeof provider.back).toBe('function');
    expect(typeof provider.parse).toBe('function');
  });

  test('accepts basePath argument', () => {
    const provider = createHistoryRouterProvider('/admin');
    expect(typeof provider.parse).toBe('function');
  });
});

// DOM-dependent tests — mocked window if not exists
describe('createHashRouterProvider (with mock DOM)', () => {
  let hadWindow = false;
  let originalLocation: any;

  beforeEach(() => {
    hadWindow = typeof globalThis.window !== 'undefined';
    let _hash = '';
    const mockLocation = {
      get hash() { return _hash ? (_hash.startsWith('#') ? _hash : '#' + _hash) : ''; },
      set hash(val: string) { _hash = val; },
      href: 'http://localhost/',
      pathname: '/',
    };
    if (!hadWindow) {
      (globalThis as any).window = { location: mockLocation };
    } else {
      originalLocation = (globalThis as any).window.location;
      (globalThis as any).window.location = mockLocation;
    }
  });

  afterEach(() => {
    if (!hadWindow) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window.location = originalLocation;
    }
  });

  test('parse returns empty segments for root', () => {
    window.location.hash = '';
    const provider = createHashRouterProvider();
    const parsed = provider.parse();
    expect(parsed.pathname).toBe('/');
  });

  test('parse extracts resource from hash', () => {
    window.location.hash = '#/posts';
    const provider = createHashRouterProvider();
    const parsed = provider.parse();
    expect(parsed.pathname).toBe('/posts');
    expect(parsed.resource).toBe('posts');
  });

  test('parse extracts resource, action, and id', () => {
    window.location.hash = '#/posts/edit/42';
    const provider = createHashRouterProvider();
    const parsed = provider.parse();
    expect(parsed.resource).toBe('posts');
    expect(parsed.action).toBe('edit');
    expect(parsed.id).toBe('42');
  });

  test('parse extracts query params from hash', () => {
    window.location.hash = '#/posts?page=2&sort=name';
    const provider = createHashRouterProvider();
    const parsed = provider.parse();
    expect(parsed.params['page']).toBe('2');
    expect(parsed.params['sort']).toBe('name');
  });

  test('go sets window.location.hash', () => {
    const provider = createHashRouterProvider();
    provider.go({ to: '/users' });
    expect(window.location.hash).toBe('#/users');
  });
});
