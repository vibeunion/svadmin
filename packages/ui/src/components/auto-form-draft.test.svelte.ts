import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Type } from 'typebox';
import {
  defineResource,
  resetContext,
  setDataProvider,
  setResources,
  setRouterProvider,
  type DataProvider,
  type ResourceDefinition,
  type RouterProvider,
} from '@svadmin/core';
import AutoForm from './AutoForm.svelte';

const clients: QueryClient[] = [];
const resources: ResourceDefinition[] = [{
  name: 'draft-records',
  label: 'Draft records',
  contract: defineResource('draft-records', {
    record: Type.Object({
      id: Type.Number(),
      title: Type.String(),
      notes: Type.String(),
      secret: Type.String(),
      hidden: Type.String(),
    }),
    update: Type.Object({
      title: Type.String(),
      notes: Type.String(),
      secret: Type.String(),
      hidden: Type.String(),
    }),
  }),
  fields: [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'secret', label: 'Secret', type: 'password' },
    { key: 'hidden', label: 'Hidden', type: 'text', showInForm: false },
  ],
}];

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Request not initialized'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function provider(overrides: Partial<DataProvider> = {}): DataProvider {
  const row = { id: 1, title: 'Server title', notes: 'Server notes', secret: 'server-secret', hidden: 'server-hidden' };
  return {
    getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: [row], total: 1 })),
    getOne: vi.fn(async ({ id }) => ({
      data: { ...row, id: Number(id), title: `Server title ${id}` },
    })),
    create: vi.fn(async ({ variables }) => ({ data: { id: 10, ...variables } })),
    update: vi.fn(async ({ id, variables }) => ({ data: { id, ...variables } })),
    deleteOne: vi.fn(async ({ id }) => ({ data: { id } })),
    ...overrides,
  };
}

function mount(source: DataProvider, props: Record<string, unknown> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  clients.push(client);
  setDataProvider(source);
  setResources(resources);
  setRouterProvider({ go: vi.fn(), back: vi.fn(), parse: () => ({ pathname: '/draft-records/1', params: {} }) } satisfies RouterProvider);
  return render(AutoForm, {
    resourceName: 'draft-records',
    mode: 'edit',
    id: 1,
    showHeader: false,
    redirect: false,
    ...props,
  }, { wrapper: QueryClientProvider, wrapperProps: { client } });
}

async function ready(title = 'Server title 1') {
  await waitFor(() => expect((screen.getByPlaceholderText('Enter Title') as HTMLInputElement).value).toBe(title));
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

describe('AutoForm host-owned drafts', () => {
  it('only emits host-whitelisted editable fields as detached JSON values', async () => {
    const source = provider();
    const drafts: Array<Record<string, unknown> | undefined> = [];
    mount(source, {
      draftFields: ['id', 'title', 'missing'],
      onDraftChange: (draft: Record<string, unknown> | undefined) => drafts.push(draft),
    });
    await ready();
    await waitFor(() => expect(drafts.at(-1)).toMatchObject({ title: 'Server title 1' }));
    const first = drafts.at(-1);
    expect(Object.keys(first ?? {})).toEqual(['title']);
    expect(first).not.toHaveProperty('id');
    expect(first).not.toHaveProperty('notes');
    expect(first).not.toHaveProperty('secret');
    expect(first).not.toHaveProperty('missing');

    await fireEvent.input(screen.getByPlaceholderText('Enter Title'), { target: { value: 'Edited title' } });
    await waitFor(() => expect(drafts.at(-1)).toMatchObject({ title: 'Edited title' }));
    // 输出必须是可分离快照，修改输出不能反写表单状态。
    (drafts.at(-1) as Record<string, unknown>)['title'] = 'Mutated snapshot';
    expect((screen.getByPlaceholderText('Enter Title') as HTMLInputElement).value).toBe('Edited title');
    await fireEvent.input(screen.getByPlaceholderText('Enter Notes'), { target: { value: 'Ignored note' } });
    expect((screen.getByPlaceholderText('Enter Title') as HTMLInputElement).value).toBe('Edited title');
    await fireEvent.input(screen.getByPlaceholderText('Enter Title'), { target: { value: 'Again' } });
    await waitFor(() => expect(drafts.at(-1)).toMatchObject({ title: 'Again' }));
    expect(source.update).not.toHaveBeenCalled();
  });

  it('restores a fully validated candidate without calling the provider update', async () => {
    const source = provider();
    const drafts: Array<Record<string, unknown> | undefined> = [];
    const view = mount(source, {
      draftFields: ['title', 'notes'],
      onDraftChange: (draft: Record<string, unknown> | undefined) => drafts.push(draft),
    });
    await ready();
    expect(view.component.restoreDraft({ title: 'Restored title', notes: 'Restored notes' })).toBe(true);

    await waitFor(() => expect((screen.getByPlaceholderText('Enter Title') as HTMLInputElement).value).toBe('Restored title'));
    expect((screen.getByPlaceholderText('Enter Notes') as HTMLTextAreaElement).value).toBe('Restored notes');
    expect(source.update).not.toHaveBeenCalled();
    await waitFor(() => expect(drafts.at(-1)).toMatchObject({
      title: 'Restored title',
      notes: 'Restored notes',
    }));
  });

  it('rejects a restore candidate while the form is not ready or read-only', async () => {
    const pending = deferred<{ data: Record<string, unknown> }>();
    const source = provider({ getOne: vi.fn(() => pending.promise) });
    const view = mount(source, {
      draftFields: ['title'],
    });
    expect(view.component.restoreDraft({ title: 'Too early' })).toBe(false);
    pending.resolve({
      data: { id: 1, title: 'Server title 1', notes: 'Server notes', secret: 'server-secret', hidden: 'server-hidden' },
    });
    await ready();
    expect((screen.getByPlaceholderText('Enter Title') as HTMLInputElement).value).toBe('Server title 1');
    expect(source.update).not.toHaveBeenCalled();

    cleanup();
    const readOnly = provider();
    const readOnlyView = mount(readOnly, {
      mode: 'show',
      draftFields: ['title'],
    });
    await waitFor(() => expect(readOnly.getOne).toHaveBeenCalled());
    expect(readOnlyView.component.restoreDraft({ title: 'Read-only write' })).toBe(false);
    expect(readOnly.update).not.toHaveBeenCalled();
  });

  it('fails the whole candidate atomically when any key is not authorized', async () => {
    const source = provider();
    const view = mount(source, { draftFields: ['title', 'notes'] });
    await ready();

    expect(view.component.restoreDraft({ title: 'Partial title', secret: 'not allowed' })).toBe(false);
    expect((screen.getByPlaceholderText('Enter Title') as HTMLInputElement).value).toBe('Server title 1');
    expect((screen.getByPlaceholderText('Enter Notes') as HTMLTextAreaElement).value).toBe('Server notes');

    expect(view.component.restoreDraft({ id: 99, title: 'Primary key write' })).toBe(false);
    expect(view.component.restoreDraft({ title: 'Hidden write', hidden: 'nope' })).toBe(false);
    expect(view.component.restoreDraft({ title: 'Not whitelisted', secret: 'nope' })).toBe(false);
    expect((screen.getByPlaceholderText('Enter Title') as HTMLInputElement).value).toBe('Server title 1');
    expect(source.update).not.toHaveBeenCalled();
  });

  it('restores an incomplete required draft but keeps business validation for submit', async () => {
    const source = provider();
    const view = mount(source, { draftFields: ['title'] });
    await ready();

    expect(view.component.restoreDraft({ title: '' })).toBe(true);
    await waitFor(() => expect((screen.getByPlaceholderText('Enter Title') as HTMLInputElement).value).toBe(''));
    await fireEvent.click(screen.getByRole('button', { name: /Save|保存/ }));
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(source.update).not.toHaveBeenCalled();
  });

  it('rejects restore while a submit is in flight', async () => {
    const pendingUpdate = deferred<{ data: Record<string, unknown> }>();
    const source = provider({ update: vi.fn(() => pendingUpdate.promise) });
    const view = mount(source, { draftFields: ['title', 'notes'] });
    await ready();
    await fireEvent.input(screen.getByPlaceholderText('Enter Title'), { target: { value: 'Submitting title' } });
    await fireEvent.click(screen.getByRole('button', { name: /Save|保存/ }));
    await waitFor(() => expect(source.update).toHaveBeenCalledTimes(1));

    expect(view.component.restoreDraft({ title: 'During submit' })).toBe(false);
    expect((screen.getByPlaceholderText('Enter Title') as HTMLInputElement).value).toBe('Submitting title');

    pendingUpdate.resolve({ data: { id: 1, title: 'Submitting title', notes: 'Server notes', secret: 'server-secret', hidden: 'server-hidden' } });
  });

  it('rejects restores from an unmounted component instance', async () => {
    const source = provider();
    const view = mount(source, { draftFields: ['title'] });
    await ready();
    cleanup();

    expect(view.component.restoreDraft({ title: 'After unmount' })).toBe(false);
    expect(source.update).not.toHaveBeenCalled();
  });

  it('rejects getter-backed and over-depth candidates without changing the form', async () => {
    const source = provider();
    const view = mount(source, { draftFields: ['title'] });
    await ready();

    const getterCandidate: Record<string, unknown> = { title: 'Getter title' };
    Object.defineProperty(getterCandidate, 'notes', {
      enumerable: true,
      get() { throw new Error('getter must not run'); },
    });
    expect(view.component.restoreDraft(getterCandidate)).toBe(false);
    expect((screen.getByPlaceholderText('Enter Title') as HTMLInputElement).value).toBe('Server title 1');

    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let index = 0; index < 40; index += 1) {
      const child: Record<string, unknown> = {};
      cursor['child'] = child;
      cursor = child;
    }
    expect(view.component.restoreDraft({ title: deep })).toBe(false);
    expect((screen.getByPlaceholderText('Enter Title') as HTMLInputElement).value).toBe('Server title 1');
    expect(source.update).not.toHaveBeenCalled();
  });

  it('does not deliver old-scope draft callbacks after the form scope changes', async () => {
    const source = provider();
    const firstDrafts: Array<Record<string, unknown> | undefined> = [];
    const secondDrafts: Array<Record<string, unknown> | undefined> = [];
    const view = mount(source, {
      draftFields: ['title'],
      onDraftChange: (draft: Record<string, unknown> | undefined) => firstDrafts.push(draft),
    });
    await ready();
    await fireEvent.input(screen.getByPlaceholderText('Enter Title'), { target: { value: 'First scope edit' } });
    await waitFor(() => expect(firstDrafts.at(-1)).toMatchObject({ title: 'First scope edit' }));

    await view.rerender({
      id: 2,
      draftFields: ['title'],
      onDraftChange: (draft: Record<string, unknown> | undefined) => secondDrafts.push(draft),
    });
    await ready('Server title 2');
    const firstCount = firstDrafts.length;
    await fireEvent.input(screen.getByPlaceholderText('Enter Title'), { target: { value: 'Second scope edit' } });
    await waitFor(() => expect(secondDrafts.at(-1)).toMatchObject({ title: 'Second scope edit' }));
    expect(firstDrafts.length).toBe(firstCount);
    expect(firstDrafts.some(draft => draft?.['title'] === 'Second scope edit')).toBe(false);
  });
});
