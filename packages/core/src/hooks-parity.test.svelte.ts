import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { DataProvider, ResourceDefinition } from './types';
import type { AuditLogProvider } from './audit';
import type { RouterProvider } from './router-provider';
import Host from './hooks-parity.test-host.svelte';
import type { HooksParityState } from './hooks-parity.test.types';

const resources: ResourceDefinition[] = [{ name: 'posts', label: 'Posts', fields: [] }];
const router: RouterProvider = {
  go: () => {}, back: () => {},
  parse: () => ({ pathname: '/posts', params: {} }),
};
const data: DataProvider = {
  getList: async () => ({ data: [], total: 0 }),
  getOne: async () => ({ data: {} }),
  create: async () => ({ data: {} }),
  update: async () => ({ data: {} }),
  deleteOne: async () => ({ data: {} }),
  getApiUrl: () => 'https://example.test',
};

function auditProvider(): AuditLogProvider & { create: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> } {
  return {
    create: vi.fn(async (params) => ({ id: 'audit-1', ...params })),
    get: vi.fn(async () => [{ id: 'audit-1', timestamp: new Date().toISOString(), action: 'update', resource: 'posts' }]),
  } as never;
}

afterEach(() => {
  document.title = '';
  window.history.replaceState(null, '', '/');
});

describe('parity hooks', () => {
  test('writes audit records and reads audit lists', async () => {
    const audit = auditProvider();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let state: HooksParityState | undefined;
    const view = render(Host, { audit, client, data, resources, router, title: 'Posts', onReady: (value: HooksParityState) => { state = value; } });

    await waitFor(() => expect(state?.list.data).toHaveLength(1));
    await fireEvent.click(view.getByTestId('log'));
    await waitFor(() => expect(audit.create).toHaveBeenCalledTimes(1));
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'custom', resource: 'posts', timestamp: expect.any(String) }));
  });

  test('syncs drawer visibility with the URL and sets the document title', async () => {
    const audit = auditProvider();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let state: HooksParityState | undefined;
    const view = render(Host, { audit, client, data, resources, router, title: 'Posts', onReady: (value: HooksParityState) => { state = value; } });

    await waitFor(() => expect(state?.list.isLoading).toBe(false));
    await waitFor(() => expect(document.title).toBe('Posts'));
    expect(view.getByTestId('modal-visible').textContent).toBe('true');

    await fireEvent.click(view.getByTestId('drawer-open'));
    expect(view.getByTestId('drawer-visible').textContent).toBe('true');
    expect(window.location.search).toContain('drawer=1');

    await fireEvent.click(view.getByTestId('drawer-close'));
    expect(view.getByTestId('drawer-visible').textContent).toBe('false');
    expect(window.location.search).not.toContain('drawer=1');
  });
});
