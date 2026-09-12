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

// DOM-dependent tests — install a self-contained window mock for every test
// (other test files may leave a partial `window` behind, so never rely on the
// ambient value) and restore whatever was there afterwards.
describe('createHashRouterProvider (with mock DOM)', () => {
  let previousWindow: unknown;
  let hash = '';

  beforeEach(() => {
    previousWindow = (globalThis as unknown as { window?: unknown }).window;
    hash = '';
    // Plain assignment throws on windows left behind by other files with
    // defineProperty (non-writable); defineProperty always succeeds here.
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          get href() { return `https://unit.test/${hash}`; },
          get hash() { return hash ? (hash.startsWith('#') ? hash : '#' + hash) : ''; },
          set hash(val) { hash = val; },
        },
        history: { replaceState() {}, back() {} },
        dispatchEvent() {},
      },
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    const globalScope = globalThis as unknown as { window?: unknown };
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalScope, 'window');
    } else {
      Object.defineProperty(globalScope, 'window', {
        value: previousWindow,
        writable: true,
        enumerable: true,
        configurable: true,
      });
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

