import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Type } from 'typebox';
import { tick } from 'svelte';
import { defineResource, resetContext, type DataProvider, type GetListResult,
  type NotificationProvider, type ResourceDefinition } from '@svadmin/core';
import { setLocale } from '../../test/legacy-locale';
import { getToastQueue } from '@svadmin/core/toast';
import DetailHost from './detail-contract.test-host.svelte';
import InfiniteHost from './infinite-contract.test-host.svelte';
import type { InfiniteState } from './infinite-contract.test.types';

const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
});
const resources: ResourceDefinition[] = [{
  name: 'posts', label: 'Posts', contract: posts,
  canCreate: false, canEdit: false, canDelete: false,
  fields: [{ key: 'title', label: 'Title', type: 'text' }],
}];
const modes = ['page', 'drawer', 'infinite'] as const;
const channels = ['builtin', 'provider'] as const;
const cases = modes.flatMap(mode => channels.map(channel => ({ mode, channel })));
const clients: QueryClient[] = [];

function provider() {
  return {
    getApiUrl: () => '/api',
    getOne: vi.fn<DataProvider['getOne']>().mockResolvedValue({ data: { id: 1, title: 'Recovered' } }),
    getList: vi.fn<DataProvider['getList']>().mockResolvedValue({ data: [{ id: 1, title: 'Recovered' }], total: 1 }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  } satisfies DataProvider;
}

function client() {
  const value = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } },
  });
  clients.push(value);
  return value;
}

function deferredPage() {
  let resolve: (value: GetListResult) => void = () => { throw new Error('Request not initialized'); };
  let reject: (error: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<GetListResult>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function trackIntersections() {
  const observations: { node: Element; enter: () => void; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const NativeObserver = globalThis.IntersectionObserver;
  vi.stubGlobal('IntersectionObserver', class extends NativeObserver {
    private readonly callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      super(callback);
      this.callback = callback;
    }
    override observe(node: Element) {
      observations.push({
        node, disconnect: this.disconnect,
        enter: () => {
          const rect = node.getBoundingClientRect();
          this.callback([{
            target: node, isIntersecting: true, intersectionRatio: 1, time: 0,
            boundingClientRect: rect, intersectionRect: rect, rootBounds: null,
          }], this);
        },
      });
    }
    override disconnect = vi.fn(() => super.disconnect());
  });
  return observations;
}

function mount(mode: typeof modes[number], source: DataProvider, notificationProvider: NotificationProvider | null) {
  const queryClient = client();
  const props = { provider: source, resources, queryClient, notificationProvider };
  const view = mode === 'infinite'
    ? render(InfiniteHost, props)
    : render(DetailHost, { ...props, mode });
  return { view, queryClient };
}

beforeEach(() => {
  resetContext();
  setLocale('en');
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true, value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});
afterEach(() => {
  cleanup();
  for (const value of clients.splice(0)) value.clear();
  resetContext();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('query feedback ownership', () => {
  it.each(cases)(
    'Given a failed $mode query with $channel notifications, when retrying, then inline feedback owns failure and recovery',
    async ({ mode, channel }) => {
      const source = provider();
      const request = mode === 'infinite' ? source.getList : source.getOne;
      request.mockRejectedValue(new Error('private-upstream-detail'));
      const notification = { open: vi.fn<NotificationProvider['open']>(), close: vi.fn<NotificationProvider['close']>() };
      const { view, queryClient } = mount(mode, source, channel === 'provider' ? notification : null);
      const expectSilent = () => {
        expect(getToastQueue()).toHaveLength(0);
        expect(notification.open).not.toHaveBeenCalled();
      };

      await waitFor(() => expect(view.getAllByRole('alert')).toHaveLength(1));
      expect(view.queryByText('Recovered')).toBeNull();
      expect(view.baseElement.textContent).not.toContain('private-upstream-detail');
      expectSilent();

      await fireEvent.click(view.getByRole('button', { name: /^retry$/i }));
      await waitFor(() => {
        expect(request).toHaveBeenCalledTimes(2);
        expect(queryClient.isFetching()).toBe(0);
        expect(view.getAllByRole('alert')).toHaveLength(1);
      });
      expectSilent();

      source.getOne.mockResolvedValue({ data: { id: 1, title: 'Recovered' } });
      source.getList.mockResolvedValue({ data: [{ id: 1, title: 'Recovered' }], total: 1 });
      await fireEvent.click(view.getByRole('button', { name: /^retry$/i }));
      await waitFor(() => expect(view.getByText('Recovered')).toBeTruthy());
      expect(view.queryByRole('alert')).toBeNull();
      expect(request).toHaveBeenCalledTimes(3);
      expect(request).toHaveBeenLastCalledWith(expect.objectContaining(mode === 'infinite'
        ? { resource: 'posts', pagination: { current: 1, pageSize: 1 } }
        : { resource: 'posts', id: 1 }));
      expect(mode === 'infinite' ? source.getOne : source.getList).not.toHaveBeenCalled();
      expectSilent();
    },
  );

  it.each(channels.flatMap(channel => ['transport', 'schema'].map(failure => ({ channel, failure }))))(
    'keeps loaded rows after an append $failure failure with $channel notifications and retries only that page',
    async ({ channel, failure }) => {
      const source = provider();
      const recovering = deferredPage();
      source.getList.mockResolvedValueOnce({ data: [{ id: 1, title: 'First' }], total: 2 });
      if (failure === 'transport') source.getList.mockRejectedValueOnce(new Error('private-next-page'));
      else source.getList.mockResolvedValueOnce({ data: [{ id: 'invalid', title: 'private-next-page' }], total: 2 });
      source.getList.mockRejectedValueOnce(new Error('private-retry'))
        .mockImplementationOnce(() => recovering.promise);
      const notification = { open: vi.fn<NotificationProvider['open']>(), close: vi.fn<NotificationProvider['close']>() };
      const queryClient = client();
      let state: InfiniteState | undefined;
      const view = render(InfiniteHost, {
        provider: source, resources, queryClient,
        notificationProvider: channel === 'provider' ? notification : null,
        showList: true, onReady: value => { state = value; },
      });
      const expectSilent = () => {
        expect(getToastQueue()).toHaveLength(0);
        expect(notification.open).not.toHaveBeenCalled();
        expect(view.container.textContent).not.toContain('private-');
      };

      await waitFor(() => expect(view.getByTestId('row').textContent).toBe('First'));
      const firstRow = view.getByTestId('row');
      if (!state) throw new Error('Expected a mounted infinite query');
      await state.query.fetchNextPage();
      await waitFor(() => expect(view.getAllByRole('alert')).toHaveLength(1));

      expect(view.getByText('First')).toBe(firstRow);
      expect(source.getList).toHaveBeenCalledTimes(2);
      expectSilent();

      await fireEvent.click(view.getByRole('button', { name: /^retry$/i }));
      await waitFor(() => {
        expect(source.getList).toHaveBeenCalledTimes(3);
        expect(queryClient.isFetching()).toBe(0);
        expect(view.getAllByRole('alert')).toHaveLength(1);
      });
      expect(view.getByText('First')).toBe(firstRow);
      expectSilent();

      const retry = view.getByRole('button', { name: /^retry$/i });
      const firstClick = fireEvent.click(retry);
      const secondClick = fireEvent.click(retry);
      await firstClick;
      await secondClick;
      await waitFor(() => expect(source.getList).toHaveBeenCalledTimes(4));
      expect(queryClient.isFetching()).toBe(1);
      expect(view.getByText('First')).toBe(firstRow);
      expect(view.queryByRole('button', { name: /^retry$/i })).toBeNull();
      expectSilent();

      recovering.resolve({ data: [{ id: 2, title: 'Recovered' }], total: 2 });
      await waitFor(() => expect(view.getByText('Recovered')).toBeTruthy());
      expect(view.getByText('First')).toBe(firstRow);
      expect(view.getAllByTestId('row').map(row => row.textContent)).toEqual(['First', 'Recovered']);
      expect(view.queryByRole('alert')).toBeNull();
      expect(view.getByText('No more items')).toBeTruthy();
      expect(source.getList.mock.calls.map(([params]) => params.pagination?.current)).toEqual([1, 2, 2, 2]);
      expectSilent();
    },
  );

  it('keeps a failed main refresh blocking and retries page one instead of appending', async () => {
    const source = provider();
    source.getList
      .mockResolvedValueOnce({ data: [{ id: 1, title: 'First' }], total: 2 })
      .mockRejectedValueOnce(new Error('private-refresh'))
      .mockResolvedValueOnce({ data: [{ id: 1, title: 'Current' }], total: 1 });
    let state: InfiniteState | undefined;
    const view = render(InfiniteHost, {
      provider: source, resources, queryClient: client(),
      showList: true, onReady: value => { state = value; },
    });
    await waitFor(() => expect(view.getByText('First')).toBeTruthy());
    if (!state) throw new Error('Expected a mounted infinite query');
    await state.query.refetch();
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(view.queryByTestId('row')).toBeNull();
    expect(view.container.textContent).not.toContain('private-refresh');
    expect(getToastQueue()).toHaveLength(0);
    await fireEvent.click(view.getByRole('button', { name: /^retry$/i }));
    await waitFor(() => expect(view.getByText('Current')).toBeTruthy());
    expect(view.queryByRole('alert')).toBeNull();
    expect(source.getList.mock.calls.map(([params]) => params.pagination?.current)).toEqual([1, 1, 1]);
    expect(getToastQueue()).toHaveLength(0);
  });

  it.each(['success', 'failure'] as const)('discards a late append retry %s after the tenant changes', async outcome => {
    const source = provider();
    const oldPage = deferredPage();
    source.getList
      .mockResolvedValueOnce({ data: [{ id: 1, title: 'Old first' }], total: 2 })
      .mockRejectedValueOnce(new Error('private-next-page'))
      .mockImplementationOnce(() => oldPage.promise)
      .mockResolvedValueOnce({ data: [{ id: 1, title: 'Current tenant' }], total: 1 });
    const queryClient = client();
    const notification = { open: vi.fn<NotificationProvider['open']>(), close: vi.fn<NotificationProvider['close']>() };
    let state: InfiniteState | undefined;
    const view = render(InfiniteHost, {
      provider: source, resources, queryClient, notificationProvider: notification,
      showList: true, onReady: value => { state = value; },
    });
    await waitFor(() => expect(view.getByText('Old first')).toBeTruthy());
    if (!state) throw new Error('Expected a mounted infinite query');
    await state.query.fetchNextPage();
    await fireEvent.click(await view.findByRole('button', { name: /^retry$/i }));
    await waitFor(() => expect(source.getList).toHaveBeenCalledTimes(3));
    await view.rerender({ tenant: 'second' });
    await waitFor(() => expect(view.getByText('Current tenant')).toBeTruthy());
    expect(view.queryByText('Old first')).toBeNull();
    if (outcome === 'success') oldPage.resolve({ data: [{ id: 2, title: 'private-late-page' }], total: 2 });
    else oldPage.reject(new Error('private-late-error'));
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(view.getAllByTestId('row').map(row => row.textContent)).toEqual(['Current tenant']);
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.container.textContent).not.toContain('private-');
    expect(source.getList.mock.calls.map(([params]) => params.pagination?.current)).toEqual([1, 2, 2, 1]);
    expect(getToastQueue()).toHaveLength(0);
    expect(notification.open).not.toHaveBeenCalled();
  });

  it('disconnects the failed append sentinel, ignores queued callbacks, and resumes paging after explicit retry', async () => {
    const observations = trackIntersections();
    const source = provider();
    const recovering = deferredPage();
    source.getList
      .mockResolvedValueOnce({ data: [{ id: 1, title: 'First' }], total: 3 })
      .mockRejectedValueOnce(new Error('private-next-page'))
      .mockImplementationOnce(() => recovering.promise)
      .mockResolvedValueOnce({ data: [{ id: 3, title: 'Last' }], total: 3 });
    const { view, queryClient } = mount('infinite', source, null);
    await waitFor(() => expect(observations).toHaveLength(1));
    const sentinel = observations[0];
    if (!sentinel) throw new Error('Expected an observed sentinel');
    sentinel.enter();
    sentinel.enter();
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(source.getList).toHaveBeenCalledTimes(2);
    expect(sentinel.disconnect).toHaveBeenCalledOnce();
    expect(sentinel.node.isConnected).toBe(false);
    expect(observations).toHaveLength(1);

    sentinel.enter();
    await tick();
    expect(source.getList).toHaveBeenCalledTimes(2);
    expect(view.getByText('First')).toBeTruthy();
    expect(view.getAllByRole('alert')).toHaveLength(1);
    expect(getToastQueue()).toHaveLength(0);

    await fireEvent.click(view.getByRole('button', { name: /^retry$/i }));
    await waitFor(() => expect(source.getList).toHaveBeenCalledTimes(3));
    sentinel.enter();
    await tick();
    expect(queryClient.isFetching()).toBe(1);
    expect(source.getList).toHaveBeenCalledTimes(3);
    expect(observations).toHaveLength(1);
    expect(view.getByText('First')).toBeTruthy();

    recovering.resolve({ data: [{ id: 2, title: 'Recovered' }], total: 3 });
    await waitFor(() => expect(observations).toHaveLength(2));
    expect(view.getByText('Recovered')).toBeTruthy();
    expect(view.queryByRole('alert')).toBeNull();
    const nextSentinel = observations[1];
    if (!nextSentinel) throw new Error('Expected a resumed sentinel');
    nextSentinel.enter();
    await waitFor(() => expect(view.getByText('Last')).toBeTruthy());
    expect(source.getList.mock.calls.map(([params]) => params.pagination?.current)).toEqual([1, 2, 2, 3]);
    expect(view.getAllByTestId('row').map(row => row.textContent)).toEqual(['First', 'Recovered', 'Last']);
    expect(view.getByText('No more items')).toBeTruthy();
    expect(getToastQueue()).toHaveLength(0);
  });

  it.each(modes)(
    'Given invalid %s records, when decoding fails, then the error stays inline without exposing the payload',
    async mode => {
      const source = provider();
      const invalid = { id: 'invalid-id', title: 'private-record-payload' };
      source.getOne.mockResolvedValue({ data: invalid });
      source.getList.mockResolvedValue({ data: [invalid], total: 1 });
      const { view } = mount(mode, source, null);
      await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
      expect(view.baseElement.textContent).not.toContain('private-record-payload');
      expect(view.getByRole('button', { name: /^retry$/i })).toBeTruthy();
      expect(getToastQueue()).toHaveLength(0);
    },
  );

  it.each(channels)(
    'Given a headless consumer using %s notifications, when its query fails, then its explicit notification is preserved',
    async channel => {
      const source = provider();
      source.getList.mockRejectedValue(new Error('private-upstream-detail'));
      const notification = { open: vi.fn<NotificationProvider['open']>(), close: vi.fn<NotificationProvider['close']>() };
      render(InfiniteHost, {
        provider: source, resources, queryClient: client(), onReady: () => {},
        notificationProvider: channel === 'provider' ? notification : null,
        errorNotification: 'Headless query failed',
      });
      if (channel === 'provider') {
        await waitFor(() => expect(notification.open).toHaveBeenCalledWith(expect.objectContaining({
          type: 'error', message: 'Headless query failed',
        })));
        expect(getToastQueue()).toHaveLength(0);
      } else {
        await waitFor(() => expect(getToastQueue()).toHaveLength(1));
        expect(getToastQueue()[0]).toMatchObject({ type: 'error', message: 'Headless query failed' });
      }
    },
  );
});
