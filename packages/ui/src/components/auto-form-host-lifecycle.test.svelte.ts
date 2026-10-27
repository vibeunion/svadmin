import { cleanup, fireEvent, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { Type } from 'typebox';
import { defineResource, resetContext, type DataProvider, type ResourceDefinition, type GetOneResult } from '@svadmin/core';
import { getToastQueue, resetToast } from '@svadmin/core/toast';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import Host from '../../test/fixtures/QuickEditDrawerLifecycleHarness.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String() });
const resources: ResourceDefinition[] = [{
  name: 'posts',
  label: 'Posts',
  canEdit: true,
  canShow: true,
  contract: defineResource('posts', {
    record,
    update: Type.Object({ title: Type.String({ minLength: 1 }) }),
  }),
  fields: [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'title', label: 'Title', type: 'text', required: true },
  ],
}];
const clients: QueryClient[] = [];

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Request not initialized'); };
  let reject: (reason?: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function mount(update: DataProvider['update']) {
  const client = new QueryClient({ defaultOptions: {
    queries: { retry: false, staleTime: Infinity }, mutations: { retry: false },
  } });
  clients.push(client);
  const source: DataProvider = {
    getApiUrl: () => '/api',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async ({ id }) => ({ data: { id: Number(id), title: `Record ${id}` } }),
    create: async () => ({ data: { id: 3, title: 'Created' } }),
    update,
    deleteOne: async ({ id }) => ({ data: { id } }),
  };
  const onClose = vi.fn();
  const view = render(Host, {
    provider: source, resources, queryClient: client, recordId: 1, onClose,
  });
  return { view, source, onClose };
}

async function drawerTitle(view: ReturnType<typeof mount>['view'], title: string) {
  const dialog = await view.findByRole('dialog', { name: 'Edit Posts' });
  const input = await within(dialog).findByRole('textbox', { name: /^Title/ });
  await waitFor(() => expect(input).toHaveProperty('value', title));
  return { dialog, input };
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  vi.restoreAllMocks();
});

describe('QuickEditDrawer host lifecycle', () => {
  it('does not let a closed drawer late save receipt touch the replacement instance', async () => {
    const gate = deferred<GetOneResult>();
    const update = vi.fn<DataProvider['update']>(() => gate.promise);
    const app = mount(update);

    const first = await drawerTitle(app.view, 'Record 1');
    await fireEvent.input(first.input, { target: { value: 'Draft 1' } });
    await fireEvent.click(within(first.dialog).getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'posts', id: 1, variables: { title: 'Draft 1' },
    }));

    await app.view.rerender({ recordId: undefined });
    await waitFor(() => expect(app.view.queryByRole('dialog')).toBeNull());

    await app.view.rerender({ recordId: 2 });
    await waitFor(() => expect(app.view.getByTestId('drawer-host').getAttribute('data-record-id')).toBe('2'));
    const second = await drawerTitle(app.view, 'Record 2');
    await fireEvent.input(second.input, { target: { value: 'Draft 2' } });

    gate.resolve({ data: { id: 1, title: 'Server 1' } });
    await new Promise(resolve => setTimeout(resolve, 30));

    expect(app.view.queryByRole('dialog', { name: 'Edit Posts' })).toBe(second.dialog);
    expect(second.input).toHaveProperty('value', 'Draft 2');
    expect(within(second.dialog).queryByRole('alert')).toBeNull();
    expect(app.onClose).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('keeps the drawer open while a save is pending even when Close is requested', async () => {
    const gate = deferred<GetOneResult>();
    const update = vi.fn<DataProvider['update']>(() => gate.promise);
    const app = mount(update);

    const first = await drawerTitle(app.view, 'Record 1');
    await fireEvent.input(first.input, { target: { value: 'Draft 1' } });
    await fireEvent.click(within(first.dialog).getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));

    // 提交中阻止关闭是既有策略：Close 不能关闭抽屉，也不能触发 onClose。
    await fireEvent.click(within(first.dialog).getByRole('button', { name: 'Close' }));
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(app.view.queryByRole('dialog', { name: 'Edit Posts' })).toBe(first.dialog);
    expect(app.view.getByTestId('drawer-host').getAttribute('data-record-id')).toBe('1');
    expect(app.onClose).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);

    gate.resolve({ data: { id: 1, title: 'Server 1' } });
    await waitFor(() => expect(app.onClose).toHaveBeenCalledTimes(1));
  });

  it('closes after a failed save only after the user confirms the dirty draft', async () => {
    const gate = deferred<GetOneResult>();
    const update = vi.fn<DataProvider['update']>(() => gate.promise);
    const app = mount(update);

    const first = await drawerTitle(app.view, 'Record 1');
    await fireEvent.input(first.input, { target: { value: 'Draft 1' } });
    await fireEvent.click(within(first.dialog).getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));

    gate.reject({ statusCode: 500, message: 'save failed' });
    await waitFor(() => expect(within(first.dialog).getByRole('alert')).toBeTruthy());

    await fireEvent.click(within(first.dialog).getByRole('button', { name: 'Close' }));
    const confirm = await app.view.findByText('You have unsaved changes. Leave anyway?');
    expect(confirm).toBeTruthy();
    expect(app.view.queryByRole('dialog', { name: 'Edit Posts' })).toBe(first.dialog);
    expect(app.onClose).not.toHaveBeenCalled();

    await fireEvent.click(app.view.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(app.view.queryByRole('dialog', { name: 'Edit Posts' })).toBeNull());
    expect(app.onClose).toHaveBeenCalledTimes(1);
    expect(app.onClose).toHaveBeenLastCalledWith(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('isolates a late save failure after the host forcibly unmounts and opens a replacement', async () => {
    const gate = deferred<GetOneResult>();
    const update = vi.fn<DataProvider['update']>(() => gate.promise);
    const app = mount(update);

    const first = await drawerTitle(app.view, 'Record 1');
    await fireEvent.input(first.input, { target: { value: 'Draft 1' } });
    await fireEvent.click(within(first.dialog).getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));

    await app.view.rerender({ recordId: undefined });
    await waitFor(() => expect(app.view.queryByRole('dialog')).toBeNull());

    await app.view.rerender({ recordId: 2 });
    await waitFor(() => expect(app.view.getByTestId('drawer-host').getAttribute('data-record-id')).toBe('2'));
    const second = await drawerTitle(app.view, 'Record 2');
    await fireEvent.input(second.input, { target: { value: 'Draft 2' } });

    gate.reject({ statusCode: 500, message: 'old failure' });
    await new Promise(resolve => setTimeout(resolve, 30));

    expect(app.view.queryByRole('dialog', { name: 'Edit Posts' })).toBe(second.dialog);
    expect(second.input).toHaveProperty('value', 'Draft 2');
    expect(within(second.dialog).queryByRole('alert')).toBeNull();
    expect(app.onClose).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('shows one inline failure and does not also enqueue an error toast', async () => {
    resetToast();
    const update = vi.fn<DataProvider['update']>(async () => {
      throw new Error('PRIVATE_QUICK_EDIT_UPDATE_DIAGNOSTIC');
    });
    const app = mount(update);

    const drawer = await drawerTitle(app.view, 'Record 1');
    await fireEvent.input(drawer.input, { target: { value: 'Rejected draft' } });
    await fireEvent.click(within(drawer.dialog).getByRole('button', { name: /Save/ }));

    const alert = await within(drawer.dialog).findByRole('alert');
    expect(alert.textContent).toContain('Operation failed');
    expect(within(drawer.dialog).getAllByRole('alert')).toHaveLength(1);
    expect(getToastQueue()).toEqual([]);
    expect(drawer.dialog.textContent).not.toContain('PRIVATE_QUICK_EDIT_UPDATE_DIAGNOSTIC');
    expect(drawer.input).toHaveProperty('value', 'Rejected draft');
  });
});
