import { describe, expect, test } from 'bun:test';
import {
  createRefineAccessControlAdapter,
  createRefineAuthAdapter,
  createRefineLiveAdapter,
  createRefineNotificationAdapter,
} from './index';

describe('createRefineAuthAdapter', () => {
  test('normalizes successful and rejected actions', async () => {
    const adapter = createRefineAuthAdapter({
      async login(params: Record<string, unknown>) {
        if (params['password'] === 'bad') return { success: false, error: { name: 'InvalidCredentials', message: 'Denied' } };
        return { success: true, redirectTo: '/dashboard' };
      },
      async logout() { return { success: true }; },
      async check() { return { authenticated: true }; },
      async getIdentity() { return { id: 'u1', name: 'Ada' }; },
      async getPermissions() { return { posts: ['read'] }; },
    });

    await expect(adapter.login({ password: 'good' })).resolves.toEqual({ success: true, redirectTo: '/dashboard' });
    await expect(adapter.login({ password: 'bad' })).resolves.toMatchObject({
      success: false,
      error: { name: 'AUTH_REJECTED' },
    });
    await expect(adapter.check()).resolves.toEqual({ authenticated: true });
    await expect(adapter.getIdentity()).resolves.toEqual({ id: 'u1', name: 'Ada' });
    await expect(adapter.getPermissions?.()).resolves.toEqual({ posts: ['read'] });
  });

  test('rejects sources without the required methods', () => {
    expect(() => createRefineAuthAdapter({ login: async () => ({ success: true }) }))
      .toThrow('expected login, logout, check, and getIdentity');
  });
});

describe('createRefineAccessControlAdapter', () => {
  test('maps single and batch checks', async () => {
    const adapter = createRefineAccessControlAdapter({
      async can({ action }: { action: string }) { return { can: action !== 'delete', reason: 'policy' }; },
      async canMany(params: readonly { action: string }[]) { return params.map(({ action }) => ({ can: action !== 'delete' })); },
    });

    await expect(adapter.can({ resource: 'posts', action: 'edit' })).resolves.toEqual({ can: true, reason: 'policy' });
    await expect(adapter.can({ resource: 'posts', action: 'delete' })).resolves.toEqual({ can: false, reason: 'policy' });
    await expect(adapter.canMany?.([
      { resource: 'posts', action: 'edit' },
      { resource: 'posts', action: 'delete' },
    ])).resolves.toEqual([{ can: true }, { can: false }]);
  });
});

describe('createRefineNotificationAdapter', () => {
  test('forwards open and close', () => {
    const calls: unknown[] = [];
    const adapter = createRefineNotificationAdapter({
      open(params: unknown) { calls.push(params); },
      close(key: string) { calls.push(key); },
    });

    adapter.open({ type: 'success', message: 'Saved', key: 'save' });
    adapter.close('save');
    expect(calls).toEqual([
      { type: 'success', message: 'Saved', key: 'save' },
      'save',
    ]);
  });
});

describe('createRefineLiveAdapter', () => {
  test('maps Refine event names and publish envelopes', () => {
    let subscribed: ((event: { type: string; channel: string; payload: unknown }) => void) | undefined;
    let published: unknown;
    const dispose = () => {};
    const adapter = createRefineLiveAdapter({
      subscribe(params: { callback: (event: { type: string; channel: string; payload: unknown }) => void }) {
        subscribed = params.callback;
        return dispose;
      },
      publish(event: unknown) { published = event; },
    });

    const received: unknown[] = [];
    const unsubscribe = adapter.subscribe({ resource: 'posts', callback: (event) => received.push(event) });
    subscribed?.({ type: 'created', channel: 'posts', payload: { ids: [1] } });
    subscribed?.({ type: 'unknown', channel: 'posts', payload: {} });
    expect(received).toEqual([{ type: 'INSERT', resource: 'posts', payload: { ids: [1] } }]);
    expect(unsubscribe).toBe(dispose);

    adapter.publish?.({ type: 'UPDATE', resource: 'posts', payload: { ids: [2] } });
    expect(published).toMatchObject({ channel: 'posts', type: 'updated', payload: { ids: [2] } });
  });
});
describe('createRefineRouterAdapter', () => {
  test('resolves Refine router generators and normalizes route state', async () => {
    const { createRefineRouterAdapter } = await import('./index');
    const calls: unknown[] = [];
    const adapter = createRefineRouterAdapter({
      go: () => (config: unknown) => { calls.push(config); },
      back: () => () => { calls.push('back'); },
      parse: () => () => ({
        resource: { identifier: 'posts' },
        action: 'edit',
        id: 7,
        params: { tab: 'history', page: 2 },
        pathname: '/posts/edit/7',
      }),
    });

    adapter.go({ to: '/posts/edit/7', query: { tab: 'history' }, type: 'replace' });
    adapter.back();
    expect(calls).toEqual([
      { to: '/posts/edit/7', query: { tab: 'history' }, type: 'replace' },
      'back',
    ]);
    expect(adapter.parse()).toEqual({
      resource: 'posts',
      action: 'edit',
      id: '7',
      params: { tab: 'history', page: '2' },
      pathname: '/posts/edit/7',
    });
  });

  test('returns safe defaults when Refine omits bindings', async () => {
    const { createRefineRouterAdapter } = await import('./index');
    const adapter = createRefineRouterAdapter({});
    expect(adapter.parse()).toEqual({ params: {}, pathname: '/' });
    expect(adapter.go({ to: '/posts' })).toBe(false);
  });
});

describe('createRefineI18nAdapter', () => {
  test('maps translate, getLocale and changeLocale', async () => {
    const { createRefineI18nAdapter } = await import('./index');
    let locale = 'en';
    const adapter = createRefineI18nAdapter({
      translate: (key: string, options: unknown, fallback?: string) => `${fallback ?? key}:${JSON.stringify(options)}`,
      getLocale: () => locale,
      changeLocale: (next: string) => { locale = next; },
    });

    expect(adapter.translate('hello', { name: 'Ada' })).toBe('hello:{"name":"Ada"}');
    expect(adapter.getLocale()).toBe('en');
    adapter.setLocale('zh-CN');
    expect(locale).toBe('zh-CN');
  });

  test('rejects incomplete Refine providers', async () => {
    const { createRefineI18nAdapter } = await import('./index');
    expect(() => createRefineI18nAdapter({ translate: () => '' }))
      .toThrow('expected translate, changeLocale and getLocale');
  });
});
