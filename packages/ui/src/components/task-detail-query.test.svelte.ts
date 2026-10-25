import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { resetContext, type TaskProvider, type TaskRecord } from '@svadmin/core';
import type { ComponentProps } from 'svelte';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import Host from './task-detail-query.test-host.svelte';

const clients: QueryClient[] = [];
const record: TaskRecord = { id: 'one', title: 'Verified task', status: 'processing' };
function source() {
  return {
    submit: vi.fn(async () => ({ id: 'one', wait: async () => record })),
    get: vi.fn<TaskProvider['get']>(async () => record),
    cancel: vi.fn<TaskProvider['get']>(async id => ({ id, status: 'cancelled' })),
    retry: vi.fn<TaskProvider['get']>(async id => ({ id, status: 'pending' })),
  } satisfies TaskProvider;
}
function mount(settings: NonNullable<ComponentProps<typeof Host>['settings']>, provider = source()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  const view = render(Host, { client, provider, settings });
  return { view, provider, client };
}
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  resetContext();
});

describe('TaskDetails with the real task query', () => {
  it.each(['disabled', 'missing-id', 'direct'] as const)(
    'does not call the provider for %s reads, then reads after enabling', async condition => {
      const settings = condition === 'disabled'
        ? { taskId: 'one', queryOptions: { enabled: false } }
        : condition === 'missing-id'
          ? { useProviderData: true, queryOptions: { enabled: true } }
          : { taskId: 'one', task: record, useProviderData: false, queryOptions: { enabled: true } };
      const { view, provider, client } = mount(settings);
      await waitFor(() => expect(client.getQueryCache().getAll().length).toBeGreaterThan(0));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
      expect(provider.get).not.toHaveBeenCalled();
      expect(client.isFetching()).toBe(0);
      expect(view.queryByRole('button', { name: 'Retry' })).toBeNull();
      await view.rerender({ settings: { taskId: 'one', useProviderData: true, queryOptions: { enabled: true } } });
      await view.findByText('Verified task');
      await waitFor(() => expect(provider.get).toHaveBeenCalledExactlyOnceWith('one'));
      expect(provider.submit).not.toHaveBeenCalled();
    },
  );

  it('recovers from repeated read failures and blocks duplicate retries while fetching', async () => {
    const provider = source();
    let rejectRetry: (error: Error) => void = () => { throw new Error('Retry not started'); };
    const retryRead = new Promise<TaskRecord>((_resolve, reject) => { rejectRetry = reject; });
    provider.get.mockRejectedValueOnce(new Error('PRIVATE_FIRST'))
      .mockImplementationOnce(() => retryRead);
    const { view, client } = mount({ taskId: 'one' }, provider);
    expect((await view.findByRole('alert')).textContent).toContain('Fetch task failed');
    expect(view.container.textContent).not.toContain('PRIVATE_FIRST');
    expect(view.queryByText('Verified task')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(provider.get).toHaveBeenCalledTimes(2));
    expect(client.isFetching()).toBe(1);
    expect(view.queryByRole('button', { name: 'Retry' })).toBeNull();
    await act(async () => {
      rejectRetry(new Error('PRIVATE_RETRY'));
      await retryRead.catch(() => {});
    });
    await view.findByRole('alert');
    expect(view.container.textContent).not.toContain('PRIVATE_RETRY');
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await view.findByText('Verified task');
    expect(view.queryByRole('alert')).toBeNull();
    expect(provider.get).toHaveBeenCalledTimes(3);
    expect(provider.cancel).not.toHaveBeenCalled();
    expect(provider.retry).not.toHaveBeenCalled();
    expect(provider.submit).not.toHaveBeenCalled();
  });

  it('keeps a late response from a replaced provider out of the current detail', async () => {
    const provider = source();
    let finish: (value: TaskRecord) => void = () => { throw new Error('Read not started'); };
    const pending = new Promise<TaskRecord>(resolve => { finish = resolve; });
    provider.get.mockImplementationOnce(() => pending);
    const { view, client } = mount({ taskId: 'one' }, provider);
    await waitFor(() => expect(provider.get).toHaveBeenCalledOnce());
    const next = source();
    next.get.mockResolvedValue({ ...record, title: 'Current provider task' });
    await view.rerender({ provider: next });
    await view.findByText('Current provider task');
    await act(async () => {
      finish({ ...record, title: 'Obsolete provider task' });
      await pending;
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(view.queryByText('Obsolete provider task')).toBeNull();
    expect(view.getByText('Current provider task')).toBeTruthy();
    expect(next.get).toHaveBeenCalledExactlyOnceWith('one');
  });
});
