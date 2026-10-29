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