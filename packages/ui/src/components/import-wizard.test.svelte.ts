import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { setLocale } from '@svadmin/core/i18n';
import { QueryClient } from '@tanstack/svelte-query';
import { Type } from '@sinclair/typebox';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineResource, resetContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
import ImportWizardHost from './import-wizard.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String(), quantity: Type.Number() });
const create = Type.Object({ title: Type.String(), quantity: Type.Number() });
const posts = defineResource('posts', { record, create });
const other = defineResource('other', { record, create });
const resources: ResourceDefinition[] = [
  {
    name: 'posts',
    label: 'Posts',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
    ],
    contract: posts,
  },
  {
    name: 'other',
    label: 'Other',
    fields: [{ key: 'title', label: 'Title', type: 'text', required: true }],
    contract: other,
  },
];
const clients: QueryClient[] = [];

function provider(overrides: Partial<DataProvider> = {}): DataProvider {
  let id = 1;
  return {
    getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: [], total: 0 })),
    getOne: vi.fn(async ({ id: requestedId }) => ({
      data: { id: requestedId, title: 'Loaded', quantity: 1 },
    })),
    create: vi.fn(async ({ variables }) => ({
      data: { id: id++, ...(variables as Record<string, unknown>) },
    })),
    update: vi.fn(async () => ({ data: {} })),
    deleteOne: vi.fn(async () => ({ data: {} })),
    ...overrides,
  };
}

function mount(source = provider(), options: { resourceName?: string; onSuccess?: (result: { succeeded: number; failed: number }) => void } = {}) {
  setLocale('en');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  const view = render(ImportWizardHost, {
    provider: source,
    resources,
    queryClient: client,
    ...options,
  });
  return { client, source, view };
}

function csvFile(contents: string, name = 'posts.csv'): File {
  return new File([contents], name, { type: 'text/csv' });
}

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  vi.restoreAllMocks();
});

describe('ImportWizard component workflow', () => {
  it('keeps invalid JSON on upload step and shows a recoverable error', async () => {
    const app = mount();
    const input = document.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');

    await fireEvent.change(input, {
      target: { files: [new File(['{"broken": true}'], 'posts.json', { type: 'application/json' })] },
    });

    await waitFor(() => expect(app.view.getByRole('alert').textContent).toContain('non-empty array'));
    expect(app.view.getByText(/Map Columns/i)).toBeTruthy();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('maps CSV fields and delegates writes to the core importer', async () => {
    const onSuccess = vi.fn();
    const app = mount(provider(), { onSuccess });
    const input = document.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');

    await fireEvent.change(input, {
      target: { files: [csvFile('title,quantity\nFirst,2\nSecond,3')] },
    });
    await waitFor(() => expect(app.view.getByText(/Detected/i)).toBeTruthy());

    await fireEvent.click(app.view.getByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ succeeded: 2, failed: 0 }));

    expect(app.source.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      resource: 'posts',
      variables: { title: 'First', quantity: 2 },
    }));
    expect(onSuccess).toHaveBeenCalledWith({ succeeded: 2, failed: 0 });
  });

  it('does not report success when the core importer rejects the file before writing', async () => {
    const onSuccess = vi.fn();
    const app = mount(provider(), { onSuccess });
    const input = document.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');

    await fireEvent.change(input, {
      target: { files: [csvFile('title,quantity\nFirst,')] },
    });
    await waitFor(() => expect(app.view.getByText(/Detected/i)).toBeTruthy());
    await fireEvent.click(app.view.getByRole('button', { name: /Start Import/i }));

    await waitFor(() => expect(app.view.getByRole('alert')).toBeTruthy());
    expect(app.view.getByRole('alert').textContent).toContain('Invalid import input');
    expect(app.source.create).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(app.view.getByText(/Import Another/i)).toBeTruthy();
  });

  it('clears the selected file when the resource scope changes', async () => {
    const app = mount(provider(), { resourceName: 'posts' });
    const input = document.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    await fireEvent.change(input, {
      target: { files: [csvFile('title,quantity\nFirst,2')] },
    });
    await waitFor(() => expect(app.view.getByText(/Detected/i)).toBeTruthy());

    await app.view.rerender({ resourceName: 'other' });
    await waitFor(() => expect(app.view.getByText(/Upload File/i)).toBeTruthy());
    expect(app.view.getByText(/Drag and drop CSV or JSON/i)).toBeTruthy();
    expect(app.source.create).not.toHaveBeenCalled();
  });
});
