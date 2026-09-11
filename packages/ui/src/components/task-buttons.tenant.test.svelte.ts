import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { keys, resetContext } from '@svadmin/core';
import type { TaskProvider, TaskRecord } from '@svadmin/core';
import { QueryClient, type InvalidateQueryFilters } from '@tanstack/svelte-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TaskButtonHost from './task-buttons.tenant.test-host.svelte';

function createTaskProvider() {
  const cancel = vi.fn(async (id: string) => ({ id, status: 'cancelled' }));
  const retry = vi.fn(async (id: string) => ({ id, status: 'pending' }));
  const provider: TaskProvider<TaskRecord> = {
    submit: async () => ({ id: 'task', wait: async () => ({ id: 'task' }) }),
    get: async (taskId: string) => ({ id: taskId }),
    list: async () => ({ data: [] }),
    cancel,
    retry,
  };
  return { provider, cancel, retry };
}

function matchesQuery(
  call: InvalidateQueryFilters | undefined,
  queryKey: readonly unknown[],
): boolean {
  const client = new QueryClient();
  return call?.predicate?.(client.getQueryCache().build(client, { queryKey })) ?? false;
}

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('tenant-scoped task buttons', () => {
  for (const action of ['cancel', 'retry'] as const) {
    it(`rejects a mismatched ${action} receipt without success or cache invalidation`, async () => {
      const queryClient = new QueryClient();
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
      const { provider } = createTaskProvider();
      provider[action] = async () => ({ id: 'other-task', status: 'running' });
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const view = render(TaskButtonHost, {
        action, taskId: 'task', taskProvider: provider,
        tenant: { tenantId: 'tenant-a' }, queryClient, onSuccess, onError,
      });
      await fireEvent.click(view.getByRole('button'));
      await waitFor(() => expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_TASK_RESPONSE', writeMayHaveSucceeded: true }),
      ));
      expect(onSuccess).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
    });

    it(`retains the originating tenant and task while ${action} is pending`, async () => {
      const queryClient = new QueryClient();
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
      const { provider } = createTaskProvider();
      let finish = () => {};
      const pending = new Promise<void>(resolve => { finish = resolve; });
      provider[action] = async id => { await pending; return { id, status: 'running' }; };
      const onSuccess = vi.fn();
      const view = render(TaskButtonHost, {
        action, taskId: 'original', taskProvider: provider,
        tenant: { tenantId: 'tenant-a' }, queryClient, onSuccess,
      });
      await fireEvent.click(view.getByRole('button'));
      await view.rerender({ taskId: 'later', tenant: { tenantId: 'tenant-b' } });
      finish();
      await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
      expect(matchesQuery(invalidate.mock.calls[0]?.[0], keys({ tenant: 'tenant-a' }).task.list())).toBe(true);
      expect(matchesQuery(invalidate.mock.calls[0]?.[0], keys({ tenant: 'tenant-b' }).task.list())).toBe(false);
      expect(matchesQuery(invalidate.mock.calls[1]?.[0], keys({ tenant: 'tenant-a' }).task.one('original'))).toBe(true);
      expect(matchesQuery(invalidate.mock.calls[1]?.[0], keys({ tenant: 'tenant-b' }).task.one('later'))).toBe(false);
    });
  }

  it('invalidates only the owning tenant task lists and target task detail', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    const firstProvider = createTaskProvider();
    const secondProvider = createTaskProvider();
    const firstSuccess = vi.fn();
    const secondSuccess = vi.fn();

    const first = render(TaskButtonHost, {
      action: 'cancel',
      taskId: 'shared-task',
      taskProvider: firstProvider.provider,
      tenant: { tenantId: 'tenant-a' },
      queryClient,
      onSuccess: firstSuccess,
    });
    const second = render(TaskButtonHost, {
      action: 'retry',
      taskId: 'shared-task',
      taskProvider: secondProvider.provider,
      tenant: { tenantId: 'tenant-b' },
      queryClient,
      onSuccess: secondSuccess,
    });

    await fireEvent.click(first.getByRole('button', { name: 'Cancel scoped task' }));
    await waitFor(() => expect(firstSuccess).toHaveBeenCalledTimes(1));
    await fireEvent.click(second.getByRole('button', { name: 'Retry scoped task' }));
    await waitFor(() => expect(secondSuccess).toHaveBeenCalledTimes(1));

    expect(firstProvider.cancel).toHaveBeenCalledWith('shared-task');
    expect(firstProvider.retry).not.toHaveBeenCalled();
    expect(secondProvider.retry).toHaveBeenCalledWith('shared-task');
    expect(secondProvider.cancel).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledTimes(4);

    const tenantAList = keys({ tenant: 'tenant-a' }).task.list();
    const tenantBList = keys({ tenant: 'tenant-b' }).task.list();
    const tenantATask = keys({ tenant: 'tenant-a' }).task.one('shared-task');
    const tenantBTask = keys({ tenant: 'tenant-b' }).task.one('shared-task');
    const tenantAOtherTask = keys({ tenant: 'tenant-a' }).task.one('other-task');

    expect(matchesQuery(invalidateQueries.mock.calls[0]?.[0], tenantAList)).toBe(true);
    expect(matchesQuery(invalidateQueries.mock.calls[0]?.[0], tenantBList)).toBe(false);
    expect(matchesQuery(invalidateQueries.mock.calls[1]?.[0], tenantATask)).toBe(true);
    expect(matchesQuery(invalidateQueries.mock.calls[1]?.[0], tenantBTask)).toBe(false);
    expect(matchesQuery(invalidateQueries.mock.calls[1]?.[0], tenantAOtherTask)).toBe(false);

    expect(matchesQuery(invalidateQueries.mock.calls[2]?.[0], tenantBList)).toBe(true);
    expect(matchesQuery(invalidateQueries.mock.calls[2]?.[0], tenantAList)).toBe(false);
    expect(matchesQuery(invalidateQueries.mock.calls[3]?.[0], tenantBTask)).toBe(true);
    expect(matchesQuery(invalidateQueries.mock.calls[3]?.[0], tenantATask)).toBe(false);
    expect(matchesQuery(invalidateQueries.mock.calls[3]?.[0], tenantAOtherTask)).toBe(false);
  });
});
