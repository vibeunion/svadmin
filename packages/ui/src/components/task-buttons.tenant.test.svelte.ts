import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { keys, resetContext } from '@svadmin/core';
import type { TaskProvider, TaskRecord } from '@svadmin/core';
import { QueryClient } from '@tanstack/svelte-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TaskButtonHost from './task-buttons.tenant.test-host.svelte';

function createTaskProvider() {
  const cancel = vi.fn(async () => undefined);
  const retry = vi.fn(async () => undefined);
  const provider = {
    submit: async () => ({ wait: async () => ({ id: 'task' }) }),
    get: async (taskId: string) => ({ id: taskId }),
    list: async () => ({ data: [] }),
    cancel,
    retry,
  } as TaskProvider<TaskRecord>;
  return { provider, cancel, retry };
}

function matchesQuery(
  call: unknown,
  queryKey: readonly unknown[],
): boolean {
  const filters = call as { predicate?: (query: { queryKey: readonly unknown[] }) => boolean };
  return filters.predicate?.({ queryKey }) ?? false;
}

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('tenant-scoped task buttons', () => {
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
