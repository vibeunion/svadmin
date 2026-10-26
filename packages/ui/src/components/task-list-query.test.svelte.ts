import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, waitFor, within } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { resetContext, type TaskProvider, type TaskRecord } from '@svadmin/core';
import type { ComponentProps } from 'svelte';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import Host from './task-list-query.test-host.svelte';
import { exactRoleName } from '../../test/accessible-name';

const clients: QueryClient[] = [];
const record: TaskRecord = { id: 'one', title: 'Verified task', status: 'processing' };
function source() {
  return {
    submit: vi.fn(async () => ({ id: 'one', wait: async () => record })),
    get: vi.fn<TaskProvider['get']>(async () => record),
    list: vi.fn<NonNullable<TaskProvider['list']>>(async () => ({ data: [record], total: 1 })),
    listDlq: vi.fn<NonNullable<TaskProvider['listDlq']>>(async () => ({ data: [record], total: 1 })),
    cancel: vi.fn<TaskProvider['get']>(async id => ({ id, status: 'cancelled' })),
    retry: vi.fn<TaskProvider['get']>(async id => ({ id, status: 'pending' })),
  } satisfies TaskProvider;
}
function mount(settings: NonNullable<ComponentProps<typeof Host>['settings']>, provider: TaskProvider | undefined, tenant?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  return { view: render(Host, { client, provider, tenant, settings }), client };
}
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  resetContext();
});

describe('TaskList with the real task query', () => {
  it.each(['direct', 'opt-out', 'disabled', 'no-provider'] as const)(
    'does not fetch for %s until enabled with a provider', async condition => {
      const provider = source();
      const settings = condition === 'direct'
        ? { tasks: [{ ...record, title: 'Direct task' }], queryOptions: { enabled: true } }
        : condition === 'opt-out'
          ? { useProviderData: false, queryOptions: { enabled: true } }
          : { useProviderData: true, queryOptions: { enabled: condition !== 'disabled' } };
      const { view, client } = mount(settings, condition === 'no-provider' ? undefined : provider);
      await waitFor(() => expect(client.getQueryCache().getAll().length).toBeGreaterThan(0));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
      expect(provider.list).not.toHaveBeenCalled();
      expect(provider.listDlq).not.toHaveBeenCalled();
      expect(client.isFetching()).toBe(0);
      if (condition === 'no-provider') {
        expect(view.getByText('Configuration Required')).toBeTruthy();
        expect(view.getByText('The current task service does not provide a task list.')).toBeTruthy();
      } else {
        expect(view.queryByRole('alert')).toBeNull();
      }
      expect(view.queryByRole('button', { name: exactRoleName('Retry') })).toBeNull();
      if (condition === 'direct') expect(view.getByText('Direct task')).toBeTruthy();
      await view.rerender({
        provider,
        settings: { useProviderData: true, queryOptions: { enabled: true } },
      });
      await view.findByText('Verified task');
      expect(provider.list).toHaveBeenCalledOnce();
      expect(provider.listDlq).not.toHaveBeenCalled();
    },
  );

  it('does not expose a read retry while a failed query is disabled', async () => {
    const provider = source();
    provider.list.mockRejectedValueOnce(new Error('PRIVATE_LIST'));
    const { view, client } = mount({ queryOptions: { enabled: true } }, provider);
    await view.findByRole('alert');
    expect(view.container.textContent).not.toContain('PRIVATE_LIST');
    expect(view.getByRole('button', { name: exactRoleName('Retry') })).toBeTruthy();
    await view.rerender({ settings: { queryOptions: { enabled: false } } });
    expect(view.queryByRole('button', { name: exactRoleName('Retry') })).toBeNull();
    expect(provider.list).toHaveBeenCalledOnce();
    expect(client.isFetching()).toBe(0);
    await view.rerender({ settings: { queryOptions: { enabled: true } } });
    await view.findByText('Verified task');
    expect(provider.list).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])('recovers only the selected queue (dlq=%s) without task mutations', async dlq => {
    const provider = source();
    const read = dlq ? provider.listDlq : provider.list;
    let finish!: (value: { data: TaskRecord[]; total: number }) => void;
    const pending = new Promise<{ data: TaskRecord[]; total: number }>(resolve => { finish = resolve; });
    read.mockRejectedValueOnce(new Error('PRIVATE_LIST')).mockImplementationOnce(() => pending);
    const { view } = mount({ dlq }, provider);
    await view.findByRole('alert');
    await fireEvent.click(view.getByRole('button', { name: exactRoleName('Retry') }));
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(view.queryByRole('button', { name: exactRoleName('Retry') })).toBeNull();
    await act(async () => { finish({ data: [record], total: 1 }); await pending; });
    await view.findByText('Verified task');
    expect(view.queryByRole('alert')).toBeNull();
    expect(dlq ? provider.list : provider.listDlq).not.toHaveBeenCalled();
    expect(provider.submit).not.toHaveBeenCalled();
    expect(provider.cancel).not.toHaveBeenCalled();
    expect(provider.retry).not.toHaveBeenCalled();
  });

  it.each([false, true])('blocks missing queue capabilities and resumes when available (dlq=%s)', async dlq => {
    const provider = source();
    const limited: TaskProvider = {
      submit: provider.submit,
      get: provider.get,
      ...(dlq ? { list: provider.list } : { listDlq: provider.listDlq }),
    };
    const { view, client } = mount({ dlq, queryOptions: { enabled: true } }, limited);
    const message = dlq
      ? 'The current task service does not provide a dead-letter list.'
      : 'The current task service does not provide a task list.';
    expect(await view.findByText(message)).toBeTruthy();
    expect(view.queryByText('0 task(s)')).toBeNull();
    expect(view.queryByRole('table')).toBeNull();
    expect(view.queryByRole('button', { name: exactRoleName('Retry') })).toBeNull();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    expect(client.isFetching()).toBe(0);
    expect(provider.list).not.toHaveBeenCalled();
    expect(provider.listDlq).not.toHaveBeenCalled();
    await view.wrapper.setLocale('zh-CN');
    expect(view.getByText(dlq ? '当前任务服务未提供死信列表。' : '当前任务服务未提供任务列表。')).toBeTruthy();
    expect(provider.list).not.toHaveBeenCalled();
    expect(provider.listDlq).not.toHaveBeenCalled();
    await view.rerender({ provider });
    await view.findByText('Verified task');
    expect(dlq ? provider.listDlq : provider.list).toHaveBeenCalledOnce();
    expect(dlq ? provider.list : provider.listDlq).not.toHaveBeenCalled();
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('checks capabilities for the selected queue without falling back to another queue', async () => {
    const provider = source();
    const limited: TaskProvider = { submit: provider.submit, get: provider.get, list: provider.list };
    const { view } = mount({ dlq: false }, limited);
    await view.findByText('Verified task');
    await view.rerender({ settings: { dlq: true } });
    await view.findByText('The current task service does not provide a dead-letter list.');
    expect(view.queryByText('Verified task')).toBeNull();
    expect(view.queryByText('1 task(s)')).toBeNull();
    expect(provider.list).toHaveBeenCalledOnce();
    expect(provider.listDlq).not.toHaveBeenCalled();
    await view.rerender({ settings: { dlq: false } });
    await view.findByText('Verified task');
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('keeps direct tasks readable without list capability', async () => {
    const provider = source();
    const limited: TaskProvider = { submit: provider.submit, get: provider.get };
    const { view } = mount({ tasks: [record], queryOptions: { enabled: true } }, limited);
    expect(await view.findByText('Verified task')).toBeTruthy();
    expect(view.getByText('1 task(s)')).toBeTruthy();
    expect(view.queryByRole('alert')).toBeNull();
    expect(provider.list).not.toHaveBeenCalled();
    expect(provider.listDlq).not.toHaveBeenCalled();
  });

  it('hides old results and ignores a late read after replacing the provider with missing capabilities', async () => {
    const provider = source();
    let finish!: (value: { data: TaskRecord[]; total: number }) => void;
    const pending = new Promise<{ data: TaskRecord[]; total: number }>(resolve => { finish = resolve; });
    const { view, client } = mount({}, provider);
    await view.findByText('Verified task');
    provider.list.mockImplementationOnce(() => pending);
    const refetch = client.refetchQueries();
    await waitFor(() => expect(provider.list).toHaveBeenCalledTimes(2));
    await view.rerender({ provider: { submit: provider.submit, get: provider.get } });
    await view.findByText('The current task service does not provide a task list.');
    expect(view.queryByText('Verified task')).toBeNull();
    expect(view.queryByText('1 task(s)')).toBeNull();
    expect(view.queryByRole('button', { name: 'Cancel' })).toBeNull();
    await act(async () => {
      finish({ data: [{ ...record, title: 'Late task' }], total: 1 });
      await pending;
      await refetch;
    });
    expect(view.queryByText('Late task')).toBeNull();
    expect(view.queryByRole('button', { name: exactRoleName('Retry') })).toBeNull();
  });

  it('only exposes details when selection is supported and preserves form semantics', async () => {
    const onSelect = vi.fn();
    const form = document.createElement('form');
    document.body.append(form);
    const submit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', submit);
    const { view } = mount({ tasks: [record], showActions: true }, source());
    expect(view.queryByRole('button', { name: 'Details' })).toBeNull();
    form.append(view.container);
    await view.rerender({ settings: { tasks: [record], showActions: true, onSelect } });
    const details = view.getByRole('button', { name: 'Details' });
    expect(details.getAttribute('type')).toBe('button');
    await fireEvent.click(details);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(record);
    expect(submit).not.toHaveBeenCalled();
    form.remove();
  });

  it.each(['Cancel', 'Retry'] as const)('does not select a row when activating %s', async label => {
    const onSelect = vi.fn();
    const provider = source();
    const { view } = mount({
      tasks: [{ ...record, status: label === 'Cancel' ? 'processing' : 'failed' }],
      showActions: true,
      onSelect,
    }, provider);
    await fireEvent.click(view.getByRole('button', { name: label }));
    expect(label === 'Cancel' ? provider.cancel : provider.retry).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('provides a native detail button without the action column', async () => {
    const onSelect = vi.fn();
    const noActions = mount({ tasks: [record], showActions: false, onSelect }, source());
    const title = noActions.view.getByRole('button', { name: 'Verified task' });
    expect(title.getAttribute('type')).toBe('button');
    title.focus();
    expect(document.activeElement).toBe(title);
    await fireEvent.click(title);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(record);
  });

  it('selects once from plain row content', async () => {
    const onSelect = vi.fn();
    const { view } = mount({ tasks: [record], onSelect }, source());
    await fireEvent.click(view.getByText('Verified task'));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(record);
    await view.rerender({ settings: { tasks: [record] } });
    expect(view.queryByRole('button', { name: 'Details' })).toBeNull();
    await fireEvent.click(view.getByText('Verified task'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('keeps action state with a task when the provider reorders rows', async () => {
    const first = { ...record, id: 'first', title: 'First task', status: 'processing' };
    const second = { ...record, id: 'second', title: 'Second task', status: 'processing' };
    let finish!: (value: TaskRecord) => void;
    const pending = new Promise<TaskRecord>(resolve => { finish = resolve; });
    const provider = source();
    provider.cancel.mockImplementationOnce(() => pending);
    provider.list.mockResolvedValueOnce({ data: [first, second], total: 2 })
      .mockResolvedValue({ data: [second, first], total: 2 });
    const { view, client } = mount({}, provider);
    await view.findByText('First task');
    const firstRow = view.getByRole('row', { name: /First task/ });
    const secondRow = view.getByRole('row', { name: /Second task/ });
    await fireEvent.click(within(firstRow).getByRole('button', { name: 'Cancel' }));
    expect(within(firstRow).getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true);
    await act(async () => { await client.refetchQueries(); });
    const reorderedFirst = view.getByRole('row', { name: /First task/ });
    const reorderedSecond = view.getByRole('row', { name: /Second task/ });
    expect(reorderedFirst).toBe(firstRow);
    expect(reorderedSecond).toBe(secondRow);
    expect(within(reorderedFirst).getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true);
    expect(within(reorderedSecond).getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', false);
    finish({ ...first, status: 'cancelled' });
    await act(async () => { await pending; });
    await waitFor(() => expect(within(reorderedFirst).getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', false));
  });

  it('keeps duplicate task IDs as separate keyed rows through reorder and removal', async () => {
    const duplicate = { ...record, title: 'Duplicate task' };
    const { view } = mount({ tasks: [record, duplicate], useProviderData: false }, source());
    expect(view.getAllByRole('row', { name: /Verified task|Duplicate task/ })).toHaveLength(2);
    await view.rerender({ settings: { tasks: [duplicate, record], useProviderData: false } });
    expect(view.getAllByRole('row', { name: /Verified task|Duplicate task/ }).map(row => row.textContent))
      .toEqual([expect.stringContaining('Duplicate task'), expect.stringContaining('Verified task')]);
    await view.rerender({ settings: { tasks: [duplicate], useProviderData: false } });
    expect(view.getAllByRole('row', { name: /Verified task|Duplicate task/ })).toHaveLength(1);
    expect(view.queryByText('Verified task')).toBeNull();
  });

  it('does not reuse the removed task row or pending action for a replacement', async () => {
    const provider = source();
    let finish!: (value: TaskRecord) => void;
    const pending = new Promise<TaskRecord>(resolve => { finish = resolve; });
    provider.cancel.mockImplementationOnce(() => pending);
    const { view } = mount({ tasks: [record] }, provider);
    const oldRow = view.getByRole('row', { name: /Verified task/ });
    await fireEvent.click(within(oldRow).getByRole('button', { name: 'Cancel' }));
    const replacement: TaskRecord = { ...record, id: 'replacement', title: 'Replacement task' };
    await view.rerender({ settings: { tasks: [replacement] } });
    const newRow = view.getByRole('row', { name: /Replacement task/ });
    expect(newRow).not.toBe(oldRow);
    expect(within(newRow).getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', false);
    await act(async () => { finish({ ...record, status: 'cancelled' }); await pending; });
    expect(view.queryByText('Verified task')).toBeNull();
    expect(within(newRow).getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', false);
  });

  it('passes pagination, filters and sorters to the provider list unchanged', async () => {
    const provider = source();
    const params = {
      pagination: { page: 2, pageSize: 20 },
      filters: [{ field: 'status', operator: 'eq', value: 'processing' }],
      sorters: [{ field: 'updatedAt', order: 'desc' }],
      meta: { scope: 'team-a' },
    };
    const { view } = mount({ params }, provider);
    await view.findByText('Verified task');
    expect(provider.list).toHaveBeenCalledExactlyOnceWith(params);
  });

  it('runs a new query when params change and shows the new result', async () => {
    const provider = source();
    provider.list.mockImplementation(async params => {
      const page = (params?.pagination as { page?: number } | undefined)?.page;
      return page === 2
        ? { data: [{ ...record, id: 'two', title: 'Second page task' }], total: 2 }
        : { data: [record], total: 2 };
    });
    const first = { pagination: { page: 1, pageSize: 10 } };
    const second = { pagination: { page: 2, pageSize: 10 } };
    const { view } = mount({ params: first }, provider);
    await view.findByText('Verified task');
    await view.rerender({ provider, settings: { params: second } });
    await view.findByText('Second page task');
    expect(view.queryByText('Verified task')).toBeNull();
    expect(provider.list).toHaveBeenCalledTimes(2);
    expect(provider.list).toHaveBeenNthCalledWith(1, first);
    expect(provider.list).toHaveBeenNthCalledWith(2, second);
  });

  it('does not let a late old-params response replace the current params result', async () => {
    const provider = source();
    let startOld!: () => void;
    const oldStarted = new Promise<void>(resolve => { startOld = resolve; });
    let finishOld!: (value: { data: TaskRecord[]; total: number }) => void;
    const oldPending = new Promise<{ data: TaskRecord[]; total: number }>(resolve => { finishOld = resolve; });
    const first = { pagination: { page: 1, pageSize: 10 } };
    const second = { pagination: { page: 2, pageSize: 10 } };
    provider.list.mockImplementation(async params => {
      if ((params?.pagination as { page?: number } | undefined)?.page === 1) {
        startOld();
        return oldPending;
      }
      return { data: [{ ...record, id: 'two', title: 'Current params task' }], total: 2 };
    });
    const { view } = mount({ params: first }, provider);
    await oldStarted;
    await view.rerender({ provider, settings: { params: second } });
    await view.findByText('Current params task');
    await act(async () => {
      finishOld({ data: [{ ...record, id: 'old', title: 'Late old params task' }], total: 2 });
      await oldPending;
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(view.getByText('Current params task')).toBeTruthy();
    expect(view.queryByText('Late old params task')).toBeNull();
    expect(view.queryByText('Verified task')).toBeNull();
    expect(provider.list).toHaveBeenCalledTimes(2);
    expect(provider.list).toHaveBeenNthCalledWith(1, first);
    expect(provider.list).toHaveBeenNthCalledWith(2, second);
  });

  it('passes the active tenant meta and queries again after the tenant changes', async () => {
    const provider = source();
    provider.list.mockImplementation(async params => {
      const tenantId = (params?.meta as { tenantId?: string } | undefined)?.tenantId;
      return tenantId === 'tenant-2'
        ? { data: [{ ...record, id: 'two', title: 'Tenant two task' }], total: 1 }
        : { data: [record], total: 1 };
    });
    const { view } = mount({}, provider, 'tenant-1');
    await view.findByText('Verified task');
    expect(provider.list).toHaveBeenCalledExactlyOnceWith({ meta: { tenantId: 'tenant-1' } });
    await view.rerender({ provider, tenant: 'tenant-2' });
    await view.findByText('Tenant two task');
    expect(view.queryByText('Verified task')).toBeNull();
    expect(provider.list).toHaveBeenCalledTimes(2);
    expect(provider.list).toHaveBeenNthCalledWith(1, { meta: { tenantId: 'tenant-1' } });
    expect(provider.list).toHaveBeenNthCalledWith(2, { meta: { tenantId: 'tenant-2' } });
  });

  it('does not let a late old-tenant response replace the current tenant result', async () => {
    const provider = source();
    let startOld!: () => void;
    const oldStarted = new Promise<void>(resolve => { startOld = resolve; });
    let finishOld!: (value: { data: TaskRecord[]; total: number }) => void;
    const oldPending = new Promise<{ data: TaskRecord[]; total: number }>(resolve => { finishOld = resolve; });
    provider.list.mockImplementation(async params => {
      const tenantId = (params?.meta as { tenantId?: string } | undefined)?.tenantId;
      if (tenantId === 'tenant-1') {
        startOld();
        return oldPending;
      }
      return { data: [{ ...record, id: 'two', title: 'Current tenant task' }], total: 1 };
    });
    const { view } = mount({}, provider, 'tenant-1');
    await oldStarted;
    await view.rerender({ provider, tenant: 'tenant-2' });
    await view.findByText('Current tenant task');
    await act(async () => {
      finishOld({ data: [{ ...record, id: 'old', title: 'Late old tenant task' }], total: 1 });
      await oldPending;
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(view.getByText('Current tenant task')).toBeTruthy();
    expect(view.queryByText('Late old tenant task')).toBeNull();
    expect(view.queryByText('Verified task')).toBeNull();
    expect(provider.list).toHaveBeenCalledTimes(2);
    expect(provider.list).toHaveBeenNthCalledWith(1, { meta: { tenantId: 'tenant-1' } });
    expect(provider.list).toHaveBeenNthCalledWith(2, { meta: { tenantId: 'tenant-2' } });
  });

});
