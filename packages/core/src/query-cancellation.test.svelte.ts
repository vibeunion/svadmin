import { cleanup, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Host from './query-cancellation.test-host.svelte';
import type { DataProvider } from './types';

const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});

function setup(fallbackMany = false) {
  const signals: Array<AbortSignal | undefined> = [];
  const pending = vi.fn(({ signal }: { signal?: AbortSignal }) => {
    signals.push(signal);
    return new Promise<never>((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
      if (signal?.aborted) reject(signal.reason);
    });
  });
  const dataProvider = {
    getList: pending, getOne: pending, getApiUrl: () => '/api',
    ...(fallbackMany ? {} : { getMany: pending }),
    custom: pending,
    create: vi.fn(), update: vi.fn(), deleteOne: vi.fn(),
  } as unknown as DataProvider;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  return { dataProvider, client, pending, signals };
}

describe('query cancellation reaches DataProvider', () => {
  it.each([
    ['list', false, 1], ['one', false, 1], ['many', false, 1], ['many', true, 2],
    ['infinite', false, 1], ['select', false, 2], ['select', true, 3],
    ['form', false, 1], ['custom', false, 1],
  ] as const)('cancels %s reads (getMany fallback=%s) after unmount', async (kind, fallback, count) => {
    const state = setup(fallback);
    const view = render(Host, { props: { dataProvider: state.dataProvider, client: state.client, kind } });
    await waitFor(() => {
      expect(state.pending).toHaveBeenCalledTimes(count);
      for (const signal of state.signals) {
        expect(signal).toBeInstanceOf(AbortSignal);
        expect(signal?.aborted).toBe(false);
      }
    });
    if (kind === 'many' && fallback) expect(state.signals[0]).toBe(state.signals[1]);
    view.unmount();
    await waitFor(() => expect(state.signals.every(signal => signal?.aborted)).toBe(true));
  });

  it('keeps a shared request alive until the final observer leaves', async () => {
    const state = setup();
    const props = { dataProvider: state.dataProvider, client: state.client, kind: 'list', first: true, second: true };
    const view = render(Host, { props });
    await waitFor(() => expect(state.pending).toHaveBeenCalledTimes(1));
    const signal = state.signals[0];
    expect(signal).toBeInstanceOf(AbortSignal);
    await view.rerender({ ...props, first: false });
    expect(signal?.aborted).toBe(false);
    expect(state.pending).toHaveBeenCalledTimes(1);
    await view.rerender({ ...props, first: false, second: false });
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });

  it('honors explicit query cancellation without changing the query key', async () => {
    const state = setup();
    render(Host, { props: { dataProvider: state.dataProvider, client: state.client, kind: 'list' } });
    await waitFor(() => expect(state.pending).toHaveBeenCalledTimes(1));
    const queries = state.client.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(JSON.stringify(queries[0].queryKey)).not.toContain('signal');
    await state.client.cancelQueries();
    expect(state.signals[0]?.aborted).toBe(true);
  });
});
