import { cleanup, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { flushSync, mount, unmount, type ComponentProps } from 'svelte';
import { defineResource } from './resource-contract';
import { resetContext } from './context.svelte';
import type { DataProvider } from './types';
import Host from './query-source.test-host.svelte';

const clients: QueryClient[] = [];
const contract = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
});
function setup(getList?: DataProvider['getList']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  const provider: DataProvider = {
    getApiUrl: () => '/api',
    getList: getList ?? vi.fn(async () => ({ data: [{ id: 1, title: 'Record' }], total: 1 })),
    getOne: async () => ({ data: { id: 1, title: 'Record' } }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  const props: ComponentProps<typeof Host> = {
    provider, queryClient: client, kind: 'list', onReady: () => {},
    resources: [{ name: 'posts', label: 'Posts', fields: [], contract }],
  };
  const view = render(Host, props);
  return { client, provider, view, props };
}
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  resetContext();
  vi.restoreAllMocks();
});

describe('query session disposal', () => {
  it('does not evaluate query configuration after its owner is destroyed', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = setup();
    await waitFor(() => expect(app.provider.getList).toHaveBeenCalledOnce());
    app.view.unmount();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(warning.mock.calls.flat().join(' ')).not.toContain('derived_inert');
  });

  it('cancels only the latest unobserved query after changing query parameters', async () => {
    const app = setup();
    await waitFor(() => expect(app.provider.getList).toHaveBeenCalledOnce());
    await app.view.rerender({ pagination: { current: 2, pageSize: 2 } });
    await waitFor(() => expect(app.provider.getList).toHaveBeenCalledTimes(2));
    const queries = app.client.getQueryCache().getAll();
    expect(queries).toHaveLength(2);
    const first = queries[0];
    const latest = queries[1];
    if (!first || !latest) throw new Error('Expected both query generations');
    const firstCancel = vi.spyOn(first, 'cancel');
    const latestCancel = vi.spyOn(latest, 'cancel');
    app.view.unmount();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(firstCancel).not.toHaveBeenCalled();
    expect(latestCancel).toHaveBeenCalled();
  });

  it('does not cancel a query retained by another live observer', async () => {
    const app = setup();
    await waitFor(() => expect(app.provider.getList).toHaveBeenCalledOnce());
    const second = render(Host, app.props);
    const query = app.client.getQueryCache().getAll()[0];
    if (!query) throw new Error('Expected shared query');
    await waitFor(() => expect(query.getObserversCount()).toBe(2));
    const cancel = vi.spyOn(query, 'cancel');
    app.view.unmount();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(query.getObserversCount()).toBe(1);
    expect(cancel).not.toHaveBeenCalled();
    second.unmount();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(cancel).toHaveBeenCalled();
  });

  it('ignores a late request after disposal without reading destroyed state', async () => {
    let resolveRequest: ((value: { data: { id: number; title: string }[]; total: number }) => void) | undefined;
    const response = new Promise<{ data: { id: number; title: string }[]; total: number }>(resolve => {
      resolveRequest = resolve;
    });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const getList = vi.fn<DataProvider['getList']>(() => response);
    const app = setup(getList);
    await waitFor(() => expect(getList).toHaveBeenCalledOnce());
    app.view.unmount();
    await Promise.resolve();
    if (!resolveRequest) throw new Error('Expected pending request');
    resolveRequest({ data: [{ id: 99, title: 'Late record' }], total: 1 });
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(warning.mock.calls.flat().join(' ')).not.toContain('derived_inert');
    expect(app.client.getQueryCache().getAll()[0]?.state.data).toBeUndefined();
  });

  it('does not evaluate an unflushed parameter change while disposing', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = setup();
    await waitFor(() => expect(app.provider.getList).toHaveBeenCalledOnce());
    let pagination = $state({ current: 1, pageSize: 2 });
    const target = document.createElement('div');
    document.body.append(target);
    const component = mount(Host, {
      target, props: { ...app.props, get pagination() { return pagination; } },
    });
    flushSync();
    app.view.unmount();
    const query = app.client.getQueryCache().getAll()[0];
    if (!query) throw new Error('Expected observed query');
    const cancel = vi.spyOn(query, 'cancel');
    // 模拟路由参数更新和页面销毁发生于同一轮，不等待响应式 effect 刷新。
    pagination = { current: 2, pageSize: 2 };
    await unmount(component);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(cancel).toHaveBeenCalled();
    expect(app.client.getQueryCache().getAll()).toHaveLength(1);
    expect(warning.mock.calls.flat().join(' ')).not.toContain('derived_inert');
    target.remove();
  });
});
