import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { defineResource, resetContext, HttpError, type ContractSchemas, type DataProvider, type GetListParams, type GetListResult, type ResourceDefinition, type UseExportOptions, type useExport, type TaskProvider, type TaskRecord } from '@svadmin/core';
import * as unsafe from '../../../core/src/unsafe';
import { downloadData, downloadExportArtifact } from '../../../core/src/export-format';
import Host from './export-contract.test-host.svelte';

vi.mock('../../../core/src/export-format', async original => {
  const actual = await original<typeof import('../../../core/src/export-format')>();
  return { ...actual, downloadData: vi.fn(), downloadExportArtifact: vi.fn(actual.downloadExportArtifact) };
});

const posts = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const other = defineResource('other', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const postDefinition: ResourceDefinition = { name: 'posts', label: 'Posts', fields: [], contract: posts };
const resources: ResourceDefinition[] = [postDefinition, { name: 'other', label: 'Other', fields: [], contract: other }];
type Settings = Omit<UseExportOptions<ContractSchemas>, 'resource'>;
const row = { id: 1, title: 'First' };

function provider(getList: DataProvider['getList'] = async () => ({ data: [row], total: 1 })): DataProvider {
  return {
    getList, getApiUrl: () => '/api',
    getOne: async () => ({ data: {} }), create: async () => ({ data: {} }),
    update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
  };
}

function taskProvider(
  tasks: Record<string, TaskRecord> = {},
): TaskProvider & { submit: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> } {
  return {
    submit: vi.fn(async (_name: string, options?: { body?: Record<string, unknown>; idempotencyKey?: string }) => {
      const id = options?.idempotencyKey === 'resume-key' ? 'resume-1' : 'export-1';
      return { id, wait: async () => tasks[id] ?? { id, status: 'queued' } };
    }),
    get: vi.fn(async (id: string) => tasks[id] ?? { id, status: 'processing' }),
  };
}

function deferred() {
  let resolve: (value: GetListResult) => void = () => { throw new Error('Request not initialized'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<GetListResult>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function mount(source = provider(), settings: Settings = {}) {
  let state: ReturnType<typeof useExport> | undefined;
  const view = render(Host, { provider: source, resources, settings, onReady: value => { state = value; } });
  return {
    view,
    read() {
      if (!state) throw new Error('Expected a mounted export hook');
      return state;
    },
  };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => { cleanup(); resetContext(); vi.restoreAllMocks(); });

describe('contract-bound exports', () => {
  it('removes the unchecked export entry point', () => {
    expect('useExport' in unsafe).toBe(false);
  });

  it('validates all pages and returns checked records without giving the mapper mutable access to them', async () => {
    const source = provider();
    source.getList = vi.fn(async function(this: DataProvider, params: GetListParams) {
      expect(this).toBe(source);
      return { data: [{ id: params.pagination?.current ?? 1, title: 'Original' }], total: 2 };
    });
    const app = mount(source, {
      pageSize: 1, format: 'json',
      mapData: item => { Reflect.set(item, 'title', false); return { id: item.id, heading: 'Mapped' }; },
    });
    await expect(app.read().triggerExport()).resolves.toEqual([{ id: 1, title: 'Original' }, { id: 2, title: 'Original' }]);
    expect(downloadData).toHaveBeenCalledWith([{ id: 1, heading: 'Mapped' }, { id: 2, heading: 'Mapped' }], 'posts', 'json');
    expect(app.read().isLoading).toBe(false);
    expect(app.read().error).toBeNull();
  });

  it('does not download or return a partial export when a later page is invalid', async () => {
    const getList = vi.fn<DataProvider['getList']>()
      .mockResolvedValueOnce({ data: [row], total: 2 })
      .mockResolvedValue({ data: [{ id: 2, title: false }], total: 2 });
    const app = mount(provider(getList), { pageSize: 1 });
    await expect(app.read().triggerExport()).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE' });
    expect(app.read().error?.code).toBe('INVALID_PROVIDER_RESPONSE');
    expect(downloadData).not.toHaveBeenCalled();
  });

  it.each([0, -1, 0.5, NaN, Infinity])('rejects pageSize %s before dispatch', async pageSize => {
    const getList = vi.fn<DataProvider['getList']>();
    const app = mount(provider(getList), { pageSize });
    await expect(app.read().triggerExport()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(getList).not.toHaveBeenCalled();
  });

  it('checks actual filter fields and refuses malformed limit or format options', async () => {
    const getList = vi.fn<DataProvider['getList']>();
    const settings: Settings = { filters: [{ field: 'missing', operator: 'eq', value: 'secret' }] };
    const app = mount(provider(getList), settings);
    await expect(app.read().triggerExport()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    await app.view.rerender({ settings: { maxItemCount: -1 } });
    await expect(app.read().triggerExport()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    const invalid: Settings = {};
    Reflect.set(invalid, 'format', 'unsupported');
    await app.view.rerender({ settings: invalid });
    await expect(app.read().triggerExport()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(getList).not.toHaveBeenCalled();
  });

  it('limits returned records and does not fetch or download when the limit is zero', async () => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({ data: [row, { id: 2, title: 'Second' }], total: 20 }));
    const app = mount(provider(getList), { pageSize: 2, maxItemCount: 1, download: false });
    await expect(app.read().triggerExport()).resolves.toEqual([row]);
    expect(getList).toHaveBeenCalledTimes(1);
    await app.view.rerender({ settings: { maxItemCount: 0 } });
    await expect(app.read().triggerExport()).resolves.toEqual([]);
    expect(getList).toHaveBeenCalledTimes(1);
    expect(downloadData).not.toHaveBeenCalled();
  });

  it('coalesces repeated triggers and retains a reactive loading state', async () => {
    const pending = deferred();
    const getList = vi.fn<DataProvider['getList']>(() => pending.promise);
    const app = mount(provider(getList));
    const first = app.read().triggerExport();
    const second = app.read().triggerExport();
    expect(second).toBe(first);
    expect(app.read().isLoading).toBe(true);
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    pending.resolve({ data: [row], total: 1 });
    await first;
    expect(app.read().isLoading).toBe(false);
    expect(downloadData).toHaveBeenCalledTimes(1);
  });

  it('captures options for every page, including callbacks, before the first await', async () => {
    const pending = deferred();
    const mapData = vi.fn((item: { id: string | number }) => ({ key: item.id }));
    const changedMapper = vi.fn(() => ({ changed: true }));
    const settings: Settings = {
      pageSize: 1, format: 'json', mapData,
      filters: [{ field: 'title', operator: 'eq', value: 'Original' }],
      sorters: [{ field: 'title', order: 'asc' }],
    };
    const getList = vi.fn<DataProvider['getList']>()
      .mockImplementationOnce(() => pending.promise)
      .mockResolvedValue({ data: [{ id: 2, title: 'Second' }], total: 2 });
    const app = mount(provider(getList), settings);
    const exported = app.read().triggerExport();
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    getList.mock.calls[0]?.[0].filters?.splice(0);
    settings.filters?.splice(0);
    settings.sorters?.splice(0);
    await app.view.rerender({ settings: { pageSize: 99, format: 'csv', mapData: changedMapper } });
    pending.resolve({ data: [row], total: 2 });
    await exported;
    expect(getList.mock.calls[1]?.[0]).toMatchObject({
      pagination: { current: 2, pageSize: 1 },
      filters: [{ field: 'title', operator: 'eq', value: 'Original' }],
      sorters: [{ field: 'title', order: 'asc' }],
    });
    expect(mapData).toHaveBeenCalledTimes(2);
    expect(changedMapper).not.toHaveBeenCalled();
    expect(downloadData).toHaveBeenCalledWith([{ key: 1 }, { key: 2 }], 'posts', 'json');
  });

  it.each(['resource', 'tenant', 'provider', 'contract', 'metadata'] as const)(
    'cancels late downloads and callbacks after a %s change', async change => {
      const pending = deferred();
      const getList = vi.fn<DataProvider['getList']>(() => pending.promise);
      const onError = vi.fn();
      const app = mount(provider(getList), { onError });
      const exported = app.read().triggerExport().catch((error: unknown) => error);
      await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
      switch (change) {
        case 'resource': await app.view.rerender({ resource: 'other' }); break;
        case 'tenant': await app.view.rerender({ tenant: 'second' }); break;
        case 'provider': await app.view.rerender({ provider: provider() }); break;
        case 'contract': await app.view.rerender({ resources: [{
          ...postDefinition,
          contract: defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.Literal('Revised') }) }),
        }] }); break;
        case 'metadata': await app.view.rerender({ resources: [{ ...postDefinition, provider: { meta: { region: 'new' } } }] }); break;
      }
      expect(app.read().isLoading).toBe(false);
      pending.resolve({ data: [row], total: 1 });
      await expect(exported).resolves.toMatchObject({ code: 'EXPORT_CANCELLED' });
      expect(downloadData).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(app.read().error).toBeNull();
    },
  );

  it('does not let an old failure reset a new export or notify the new scope', async () => {
    const first = deferred();
    const second = deferred();
    const getList = vi.fn<DataProvider['getList']>()
      .mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const onError = vi.fn();
    const app = mount(provider(getList), { onError });
    const old = app.read().triggerExport().catch((error: unknown) => error);
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    await app.view.rerender({ tenant: 'second' });
    const next = app.read().triggerExport();
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(2));
    first.reject(new Error('private provider failure'));
    await expect(old).resolves.toMatchObject({ code: 'EXPORT_CANCELLED' });
    expect(app.read().isLoading).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    second.resolve({ data: [row], total: 1 });
    await expect(next).resolves.toEqual([row]);
    expect(downloadData).toHaveBeenCalledTimes(1);
  });

  it('cancels on unmount and refuses calls retained after destruction', async () => {
    const pending = deferred();
    const getList = vi.fn<DataProvider['getList']>(() => pending.promise);
    const app = mount(provider(getList));
    const state = app.read();
    const exported = state.triggerExport().catch((error: unknown) => error);
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    app.view.unmount();
    pending.resolve({ data: [row], total: 1 });
    await expect(exported).resolves.toMatchObject({ code: 'EXPORT_CANCELLED' });
    await expect(state.triggerExport()).rejects.toMatchObject({ code: 'EXPORT_CANCELLED' });
    expect(downloadData).not.toHaveBeenCalled();
  });

  it('sanitizes failures without executing arbitrary error stringification and rejects even with onError', async () => {
    const toString = vi.fn(() => { throw new Error('private'); });
    const onError = vi.fn();
    const app = mount(provider(async () => { throw { toString }; }), { onError });
    await expect(app.read().triggerExport()).rejects.toMatchObject({ code: 'EXPORT_FAILED', message: 'Export failed' });
    expect(toString).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code: 'EXPORT_FAILED' });
    expect(downloadData).not.toHaveBeenCalled();
  });

  it('does not execute diagnostic getters on provider errors', async () => {
    const getter = vi.fn(() => { throw new Error('private'); });
    const failure = Object.defineProperty(new HttpError('private', 500), 'code', { get: getter });
    const app = mount(provider(async () => { throw failure; }));
    await expect(app.read().triggerExport()).rejects.toMatchObject({ code: 'EXPORT_FAILED', message: 'Export failed' });
    expect(getter).not.toHaveBeenCalled();
  });

  it('handles asynchronous error callback rejection without replacing the export failure', async () => {
    const onError = vi.fn(async () => { throw new Error('private callback failure'); });
    const app = mount(provider(async () => { throw new Error('private provider failure'); }), { onError });
    await expect(app.read().triggerExport()).rejects.toMatchObject({ code: 'EXPORT_FAILED', message: 'Export failed' });
    expect(onError).toHaveBeenCalledOnce();
    expect(app.read().error?.message).toBe('Export failed');
  });

  it('uses the error handler captured for the invocation, not its replacement', async () => {
    const pending = deferred();
    const first = vi.fn();
    const replacement = vi.fn();
    const app = mount(provider(() => pending.promise), { onError: first });
    const exported = app.read().triggerExport().catch((error: unknown) => error);
    await app.view.rerender({ settings: { onError: replacement } });
    pending.reject(new Error('private'));
    await expect(exported).resolves.toMatchObject({ code: 'EXPORT_FAILED' });
    expect(first).toHaveBeenCalledOnce();
    expect(replacement).not.toHaveBeenCalled();
  });

  it('allows retry inside the error handler without the old invocation clearing the new busy state', async () => {
    const pending = deferred();
    const getList = vi.fn<DataProvider['getList']>()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockImplementationOnce(() => pending.promise);
    let retry: ReturnType<ReturnType<typeof useExport>['triggerExport']> | undefined;
    const app = mount(provider(getList), { onError: () => { retry = app.read().triggerExport(); } });
    await expect(app.read().triggerExport()).rejects.toMatchObject({ code: 'EXPORT_FAILED' });
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(2));
    expect(app.read().isLoading).toBe(true);
    expect(app.read().error).toBeNull();
    pending.resolve({ data: [row], total: 1 });
    await expect(retry).resolves.toEqual([row]);
    expect(app.read().isLoading).toBe(false);
  });

  it('rejects non-plain mapper output without executing its getters', async () => {
    const getter = vi.fn(() => 'private');
    const settings: Settings = { mapData: () => Object.defineProperty({}, 'token', { enumerable: true, get: getter }) };
    const app = mount(provider(), settings);
    await expect(app.read().triggerExport()).rejects.toMatchObject({ code: 'EXPORT_FAILED' });
    expect(getter).not.toHaveBeenCalled();
    expect(downloadData).not.toHaveBeenCalled();
  });

  it('fails closed when metadata has no genuine contract or selects an absent provider', async () => {
    const getList = vi.fn<DataProvider['getList']>();
    expect(() => render(Host, {
      provider: provider(getList), resources: [{ name: 'posts', label: 'Posts', fields: [] }],
    })).toThrowError(expect.objectContaining({ code: 'RESOURCE_CONTRACT_REQUIRED' }));
    cleanup();
    const view = render(Host, {
      provider: provider(getList), resources: [{ ...postDefinition, provider: { dataProviderName: 'absent' } }],
    });
    const button = view.getByRole('button');
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
    await fireEvent.click(button);
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(getList).not.toHaveBeenCalled();
  });

  it('keeps the actual button disabled during export, exposes errors, and permits retry', async () => {
    const pending = deferred();
    const getList = vi.fn<DataProvider['getList']>()
      .mockImplementationOnce(() => pending.promise)
      .mockResolvedValue({ data: [row], total: 1 });
    const view = render(Host, { provider: provider(getList), resources });
    const button = view.getByRole('button');
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
    await fireEvent.click(button);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(button);
    expect(getList).toHaveBeenCalledTimes(1);
    pending.resolve({ data: [{ id: 'invalid', title: 'private' }], total: 1 });
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(view.container.textContent).not.toContain('private');
    expect(button.hasAttribute('disabled')).toBe(false);
    await fireEvent.click(button);
    await waitFor(() => expect(downloadData).toHaveBeenCalledTimes(1));
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('does not dispatch when the actual button is unauthorized', async () => {
    const getList = vi.fn<DataProvider['getList']>();
    const view = render(Host, { provider: provider(getList), resources, denied: true });
    await fireEvent.click(view.getByRole('button'));
    expect(getList).not.toHaveBeenCalled();
    expect(downloadData).not.toHaveBeenCalled();
  });

  it('submits a scoped export task without reading list pages and coalesces repeated triggers', async () => {
    const getList = vi.fn<DataProvider['getList']>();
    const tasks = taskProvider();
    const submitted = vi.fn();
    const app = mount(provider(getList), {
      taskName: 'export-posts',
      taskProvider: tasks,
      taskIdempotencyKey: 'export-key',
      format: 'xlsx',
      filters: [{ field: 'title', operator: 'contains', value: 'first' }],
      sorters: [{ field: 'id', order: 'desc' }],
      maxItemCount: 25,
      onTaskSubmitted: submitted,
    });
    const first = app.read().triggerExport();
    const second = app.read().triggerExport();
    await expect(first).resolves.toEqual([]);
    await expect(second).resolves.toEqual([]);
    expect(tasks.submit).toHaveBeenCalledOnce();
    expect(tasks.submit).toHaveBeenCalledWith('export-posts', expect.objectContaining({
      idempotencyKey: 'export-key',
      body: {
        protocolVersion: 1,
        resource: 'posts',
        format: 'xlsx',
        filters: [{ field: 'title', operator: 'contains', value: 'first' }],
        sorters: [{ field: 'id', order: 'desc' }],
        maxItemCount: 25,
      },
    }));
    expect(getList).not.toHaveBeenCalled();
    expect(submitted).toHaveBeenCalledWith('export-1');
    expect(app.read().isLoading).toBe(false);
    expect(app.read().isTaskPending).toBe(true);
    await app.read().triggerExport();
    expect(tasks.submit).toHaveBeenCalledOnce();
  });

  it('forwards the actual button query, format and limit to the export task', async () => {
    const getList = vi.fn<DataProvider['getList']>();
    const tasks = taskProvider();
    const view = render(Host, {
      provider: provider(getList), resources,
      settings: {
        taskName: 'export-posts', taskProvider: tasks, taskIdempotencyKey: 'button-query',
        format: 'xlsx', maxItemCount: 25,
        filters: [{ field: 'title', operator: 'contains', value: 'selected-query' }],
        sorters: [{ field: 'id', order: 'desc' }],
      },
    });
    await waitFor(() => expect((view.getByRole('button') as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(view.getByRole('button'));
    await waitFor(() => expect(tasks.submit).toHaveBeenCalledOnce());
    expect(tasks.submit).toHaveBeenCalledWith('export-posts', expect.objectContaining({
      idempotencyKey: 'button-query',
      body: {
        protocolVersion: 1, resource: 'posts', format: 'xlsx', maxItemCount: 25,
        filters: [{ field: 'title', operator: 'contains', value: 'selected-query' }],
        sorters: [{ field: 'id', order: 'desc' }],
      },
    }));
    expect(getList).not.toHaveBeenCalled();
  });

  it('requires a mapped export to remain local and rejects it before task submission', async () => {
    const tasks = taskProvider();
    const app = mount(provider(), {
      taskName: 'export-posts',
      taskProvider: tasks,
      taskIdempotencyKey: 'mapped-key',
      mapData: () => ({ title: 'mapped' }),
    });
    await expect(app.read().triggerExport()).rejects.toMatchObject({ code: 'INVALID_RESOURCE_INPUT' });
    expect(tasks.submit).not.toHaveBeenCalled();
  });

  it('recovers a completed task and only downloads after an explicit call', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const tasks = taskProvider({
      'resume-1': {
        id: 'resume-1',
        status: 'completed',
        result: { downloadUrl: '/artifacts/posts.csv', format: 'csv', fileName: 'posts.csv' },
      },
    });
    const app = mount(provider(), {
      taskName: 'export-posts',
      taskProvider: tasks,
      taskIdempotencyKey: 'resume-key',
      initialTaskId: 'resume-1',
    });
    await waitFor(() => expect(app.read().artifact).toMatchObject({ fileName: 'posts.csv' }));
    expect(downloadExportArtifact).not.toHaveBeenCalled();
    expect(app.read().downloadTask()).toBe(true);
    expect(downloadExportArtifact).toHaveBeenCalledWith(
      { downloadUrl: '/artifacts/posts.csv', format: 'csv', fileName: 'posts.csv' },
      'posts',
    );
    expect(click).toHaveBeenCalledOnce();
    expect(app.read().isTaskPending).toBe(false);
  });

  it('fails closed for an invalid task result and does not activate a download', async () => {
    const tasks = taskProvider({
      'resume-1': {
        id: 'resume-1',
        status: 'completed',
        result: { downloadUrl: 'https://evil.example/export.csv', format: 'csv' },
      },
    });
    const onError = vi.fn();
    const app = mount(provider(), {
      taskName: 'export-posts',
      taskProvider: tasks,
      taskIdempotencyKey: 'resume-key',
      initialTaskId: 'resume-1',
      onError,
    });
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      code: 'INVALID_PROVIDER_RESPONSE',
    })));
    expect(app.read().artifact).toBeUndefined();
    expect(app.read().downloadTask()).toBe(false);
    expect(downloadExportArtifact).not.toHaveBeenCalled();
  });

  it.each(['tenant', 'provider', 'permission', 'key', 'filters', 'sorters', 'limit'] as const)(
    'discards a restored artifact and saved refresh after a %s change', async change => {
      const tasks = taskProvider({
        'resume-1': { id: 'resume-1', status: 'completed', result: { downloadUrl: '/file.csv', format: 'csv' } },
      });
      const settings: Settings = {
        taskName: 'export-posts', taskProvider: tasks, taskIdempotencyKey: 'resume-key', initialTaskId: 'resume-1',
      };
      const app = mount(provider(), settings);
      await waitFor(() => expect(app.read().artifact).toBeDefined());
      const refresh = app.read().refetchTask;
      if (change === 'tenant') await app.view.rerender({ tenant: 'second' });
      if (change === 'provider') await app.view.rerender({ settings: { ...settings, taskProvider: taskProvider() } });
      if (change === 'permission') await app.view.rerender({ settings: { ...settings, enabled: false } });
      if (change === 'key') await app.view.rerender({ settings: { ...settings, taskIdempotencyKey: 'new-key' } });
      if (change === 'filters') await app.view.rerender({ settings: {
        ...settings, filters: [{ field: 'title', operator: 'eq', value: 'changed' }],
      } });
      if (change === 'sorters') await app.view.rerender({ settings: {
        ...settings, sorters: [{ field: 'id', order: 'desc' }],
      } });
      if (change === 'limit') await app.view.rerender({ settings: { ...settings, maxItemCount: 10 } });
      expect(app.read().artifact).toBeUndefined();
      expect(app.read().downloadTask()).toBe(false);
      expect(app.read().taskId).toBeUndefined();
      await expect(refresh()).rejects.toMatchObject({ code: 'EXPORT_CANCELLED' });
      expect(downloadExportArtifact).not.toHaveBeenCalled();
    },
  );

  it('ignores a submission that resolves after the tenant changes', async () => {
    let resolve!: (value: Awaited<ReturnType<TaskProvider['submit']>>) => void;
    const tasks = taskProvider();
    tasks.submit.mockImplementation(() => new Promise(done => { resolve = done; }));
    const submitted = vi.fn();
    const app = mount(provider(), {
      taskName: 'export-posts', taskProvider: tasks, taskIdempotencyKey: 'key', onTaskSubmitted: submitted,
    });
    const result = app.read().triggerExport().catch((error: unknown) => error);
    await waitFor(() => expect(tasks.submit).toHaveBeenCalledOnce());
    await app.view.rerender({ tenant: 'second' });
    resolve({ id: 'old', wait: async () => ({ id: 'old' }) });
    await expect(result).resolves.toMatchObject({ code: 'EXPORT_CANCELLED' });
    expect(app.read().taskId).toBeUndefined();
    expect(submitted).not.toHaveBeenCalled();
  });

  it.each((['filters', 'sorters', 'format', 'meta'] as const).flatMap(change =>
    (['success', 'failure'] as const).map(outcome => ({ change, outcome }))))(
    'isolates pending export $outcome after $change changes',
    async ({ change, outcome }) => {
      let resolve!: (value: Awaited<ReturnType<TaskProvider['submit']>>) => void;
      let reject!: (cause: unknown) => void;
      const tasks = taskProvider();
      tasks.submit.mockImplementation(() => new Promise((done, fail) => { resolve = done; reject = fail; }));
      const submitted = vi.fn();
      const settings: Settings = {
        taskName: 'export-posts', taskProvider: tasks, taskIdempotencyKey: `pending-${change}`,
        filters: [{ field: 'title', operator: 'eq', value: 'before' }],
        sorters: [{ field: 'id', order: 'asc' }], format: 'csv', meta: { view: 'before' },
        onTaskSubmitted: submitted,
      };
      const app = mount(provider(), settings);
      const result = app.read().triggerExport().catch((error: unknown) => error);
      await waitFor(() => expect(tasks.submit).toHaveBeenCalledOnce());
      if (change === 'filters') await app.view.rerender({ settings: {
        ...settings, filters: [{ field: 'title', operator: 'eq', value: 'after' }],
      } });
      if (change === 'sorters') await app.view.rerender({ settings: {
        ...settings, sorters: [{ field: 'id', order: 'desc' }],
      } });
      if (change === 'format') await app.view.rerender({ settings: { ...settings, format: 'xlsx' } });
      if (change === 'meta') await app.view.rerender({ settings: { ...settings, meta: { view: 'after' } } });
      if (outcome === 'success') resolve({ id: `old-${change}`, wait: async () => ({ id: `old-${change}` }) });
      else reject(new Error('private obsolete failure'));
      await expect(result).resolves.toMatchObject({ code: 'EXPORT_CANCELLED' });
      expect(app.read().taskId).toBeUndefined();
      expect(app.read().error).toBeNull();
      expect(app.read().isLoading).toBe(false);
      expect(tasks.submit).toHaveBeenCalledOnce();
      expect(submitted).not.toHaveBeenCalled();
    },
  );

  it.each([
    { downloadUrl: '/file.csv', format: 'json' },
    { downloadUrl: '/file.csv', format: 'csv', fileName: '../secret.csv' },
    { downloadUrl: 'javascript:alert(1)', format: 'csv' },
    { downloadUrl: '/file.csv', format: 'csv', extra: 'unknown' },
  ])('rejects malformed or mismatched results: %j', async result => {
    const tasks = taskProvider({ 'resume-1': { id: 'resume-1', status: 'completed', result } });
    const app = mount(provider(), { taskName: 'export-posts', taskProvider: tasks, initialTaskId: 'resume-1' });
    await waitFor(() => expect(app.read().error?.code).toBe('INVALID_PROVIDER_RESPONSE'));
    expect(app.read().downloadTask()).toBe(false);
  });

  it('recovers through the actual authorized button and explicitly downloads without submitting', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const tasks = taskProvider({
      'resume-1': { id: 'resume-1', status: 'completed', result: { downloadUrl: '/file.csv', format: 'csv' } },
    });
    const view = render(Host, { provider: provider(), resources, settings: {
      taskName: 'export-posts', taskProvider: tasks, initialTaskId: 'resume-1',
    } });
    const button = await view.findByRole('button', { name: 'Download' });
    expect(click).not.toHaveBeenCalled();
    await fireEvent.click(button);
    expect(click).toHaveBeenCalledOnce();
    expect(tasks.submit).not.toHaveBeenCalled();
  });

  it.each(['failed', 'cancelled'])('settles a %s task without downloading', async status => {
    const tasks = taskProvider({ 'resume-1': { id: 'resume-1', status, error: 'private' } });
    const app = mount(provider(), { taskName: 'export-posts', taskProvider: tasks, initialTaskId: 'resume-1' });
    await waitFor(() => expect(app.read().isTaskPending).toBe(false));
    expect(app.read().downloadTask()).toBe(false);
    if (status === 'failed') expect(app.read().error?.message).toBe('Export failed');
  });

  it.each(['https://evil.example/file.csv', 'javascript:alert(1)', '//evil.example/file.csv'])(
    'rejects unsafe URLs again at download time: %s', downloadUrl => {
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      expect(() => downloadExportArtifact({ downloadUrl, format: 'csv' }, 'posts')).toThrow();
      expect(click).not.toHaveBeenCalled();
    },
  );
});
