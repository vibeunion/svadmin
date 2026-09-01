import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { resetContext, type AuthProvider } from '@svadmin/core';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./Sidebar.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-child.svelte')).default,
}));

vi.mock('./Header.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./CommandPalette.svelte', async () => ({
  default: (await import('./layout-command-palette.test-child.svelte')).default,
}));
vi.mock('./KeyboardShortcuts.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));
vi.mock('./DevTools.svelte', async () => ({
  default: (await import('./layout-auth-scope.test-empty-child.svelte')).default,
}));

import LayoutAuthScopeHost from './layout-auth-scope.test-host.svelte';
import LayoutSkipLinkHost from './layout-skip-link.test-host.svelte';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function createLayoutAuthProvider(identity: Promise<{ id: string; name: string }>) {
  const getIdentity = vi.fn(() => identity);
  const provider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    getIdentity,
  };
  return { provider, getIdentity };
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

afterEach(() => {
  window.location.hash = '';
  resetContext();
  vi.restoreAllMocks();
});

describe('Layout auth scope', () => {
  it('only exposes Ask AI when an assistant snippet is injected', async () => {
    const withoutAssistant = render(LayoutAuthScopeHost, {
      authProvider: undefined,
      tenant: { tenantId: 'tenant-layout-without-ai' },
    });

    await waitFor(() => {
      expect(withoutAssistant.getByTestId('layout-command-ai-state').textContent).toBe('disabled');
    });
    expect(withoutAssistant.queryByTestId('layout-ai-assistant')).toBeNull();
    withoutAssistant.unmount();

    const askAIEvents: Array<{ query: string; scope: string }> = [];
    const handleAskAI = (event: Event) => {
      askAIEvents.push((event as CustomEvent<{ query: string; scope: string }>).detail);
    };
    window.addEventListener('svadmin:ask-ai', handleAskAI);

    try {
      const withAssistant = render(LayoutAuthScopeHost, {
        authProvider: undefined,
        tenant: { tenantId: 'tenant-layout-with-ai' },
        withAIAssistant: true,
      });

      await waitFor(() => {
        expect(withAssistant.getByTestId('layout-command-ai-state').textContent).toBe('enabled');
      });
      const assistant = withAssistant.getByTestId('layout-ai-assistant');
      await fireEvent.click(withAssistant.getByTestId('layout-command-ask-ai'));

      expect(askAIEvents).toEqual([{
        query: 'scoped question',
        scope: assistant.dataset.scope,
      }]);
      expect(assistant.dataset.ownerScope).toBe(
        assistant.closest<HTMLElement>('[data-svadmin-layout-scope]')?.dataset.svadminLayoutScope,
      );
    } finally {
      window.removeEventListener('svadmin:ask-ai', handleAskAI);
    }
  });

  it('marks the content main as an svadmin-owned style scope', async () => {
    const view = render(LayoutAuthScopeHost, {
      authProvider: undefined,
      tenant: { tenantId: 'tenant-layout-style-scope' },
    });

    await waitFor(() => expect(view.getByTestId('layout-auth-content')).not.toBeNull());

    expect(view.container.querySelector('main[data-svadmin-main]')).not.toBeNull();
  });

  it('focuses each layout main without changing the hash route', async () => {
    window.location.hash = '#/records';
    const view = render(LayoutSkipLinkHost);
    await waitFor(() => expect(view.getAllByTestId('layout-auth-content')).toHaveLength(2));

    const mainIds = new Set<string>();
    for (const layoutHost of view.getAllByTestId('layout-skip-host')) {
      const skipLink = layoutHost.querySelector<HTMLButtonElement>('button[data-svadmin-skip-link]');
      const main = layoutHost.querySelector<HTMLElement>('main[data-svadmin-main]');
      if (!skipLink || !main) throw new Error('Expected each Layout to render its skip control and main content');
      expect(skipLink.dataset.svadminSkipLink).toBe(main.id);
      mainIds.add(main.id);

      const hashBeforeFocus = window.location.hash;
      await fireEvent.click(skipLink);
      expect(document.activeElement).toBe(main);
      expect(window.location.hash).toBe(hashBeforeFocus);
    }

    expect(mainIds.size).toBe(2);
  });

  it('clears the previous identity while the next auth provider is pending', async () => {
    const pendingIdentity = createDeferred<{ id: string; name: string }>();
    const firstAuth = createLayoutAuthProvider(Promise.resolve({ id: 'first', name: 'first layout user' }));
    const nextAuth = createLayoutAuthProvider(pendingIdentity.promise);
    const view = render(LayoutAuthScopeHost, {
      authProvider: firstAuth.provider,
      tenant: { tenantId: 'tenant-layout-first' },
    });

    await waitFor(() => expect(view.getAllByText('first layout user')).not.toHaveLength(0));
    await view.rerender({
      authProvider: nextAuth.provider,
      tenant: { tenantId: 'tenant-layout-next' },
    });
    await tick();

    expect(view.queryAllByText('first layout user')).toHaveLength(0);
    expect(nextAuth.getIdentity).toHaveBeenCalledTimes(1);
    pendingIdentity.resolve({ id: 'next', name: 'next layout user' });
    await waitFor(() => expect(view.getAllByText('next layout user')).not.toHaveLength(0));
  });

  it('clears identity and rejects a late result after auth becomes undefined', async () => {
    const staleIdentity = createDeferred<{ id: string; name: string }>();
    const staleAuth = createLayoutAuthProvider(staleIdentity.promise);
    const view = render(LayoutAuthScopeHost, {
      authProvider: staleAuth.provider,
      tenant: { tenantId: 'tenant-layout' },
    });

    await waitFor(() => expect(staleAuth.getIdentity).toHaveBeenCalledTimes(1));
    await view.rerender({
      authProvider: undefined,
      tenant: { tenantId: 'tenant-layout' },
    });
    await waitFor(() => expect(view.getByTestId('layout-auth-content')).not.toBeNull());

    staleIdentity.resolve({ id: 'stale', name: 'stale layout user' });
    await staleIdentity.promise;
    await tick();

    expect(view.queryAllByText('stale layout user')).toHaveLength(0);
    expect(view.getByTestId('layout-auth-content')).not.toBeNull();
  });
});
