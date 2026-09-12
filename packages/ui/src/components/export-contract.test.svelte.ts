import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { defineResource, resetContext, HttpError, type ContractSchemas, type DataProvider, type GetListParams, type GetListResult, type ResourceDefinition, type UseExportOptions, type useExport } from '@svadmin/core';
import * as unsafe from '../../../core/src/unsafe';
import { downloadData } from '../../../core/src/export-format';
import Host from './export-contract.test-host.svelte';

vi.mock('../../../core/src/export-format', async original => ({
  ...await original<typeof import('../../../core/src/export-format')>(),
  downloadData: vi.fn(),
}));

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
afterEach(() => { cleanup(); resetContext(); });

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
});
