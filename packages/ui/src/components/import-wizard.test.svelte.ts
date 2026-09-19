import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { setLocale } from '@svadmin/core/i18n';
import userEvent from '@testing-library/user-event';
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

async function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
  await fireEvent.change(input, { target: { files: [file] } });
}

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  vi.restoreAllMocks();
});

describe('ImportWizard component workflow', () => {
  it('preserves nested JSON values, false, null and columns first appearing in later rows', async () => {
    const app = mount();
    const data = Type.Object({
      title: Type.String(), quantity: Type.Number(), enabled: Type.Boolean(),
      tags: Type.Array(Type.String()), details: Type.Union([Type.Null(), Type.Object({ code: Type.String() })]),
      note: Type.Optional(Type.String()),
    });
    await app.view.rerender({ resources: [{
      ...resources[0],
      name: 'posts', label: 'Posts',
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'quantity', label: 'Quantity', type: 'number' },
        { key: 'enabled', label: 'Enabled', type: 'boolean' },
        { key: 'tags', label: 'Tags', type: 'json' },
        { key: 'details', label: 'Details', type: 'json' },
        { key: 'note', label: 'Note', type: 'text' },
      ],
      contract: defineResource('posts', { record: Type.Object({ id: Type.Number(), ...data.properties }), create: data }),
    }] });
    const rows = [
      { title: 'First', quantity: 0, enabled: false, tags: ['x'], details: null },
      { title: 'Second', quantity: 2, enabled: true, tags: [], details: { code: 'a' }, note: 'Later column' },
    ];
    await selectFile(new File([JSON.stringify(rows)], 'POSTS.JSON'));
    await waitFor(() => expect(app.view.getByRole('combobox', { name: 'Map note' })).toBeTruthy());
    await fireEvent.click(app.view.getByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(2));
    expect(app.source.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ variables: rows[0] }));
    expect(app.source.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ variables: rows[1] }));
  });

  it.each(['permission', 'canCreate'] as const)('prevents file selection when %s rejects import', async denial => {
    const app = mount();
    if (denial === 'permission') {
      await app.view.rerender({ permission: { can: async () => ({ can: false }) } });
    } else {
      await app.view.rerender({ resources: resources.map(resource => ({ ...resource, canCreate: false })) });
    }
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    await waitFor(() => expect(input?.disabled).toBe(true));
    await selectFile(csvFile('title,quantity\nFirst,1'));
    expect(app.view.queryByRole('button', { name: /Start Import/i })).toBeNull();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it.each(['', 'title,quantity', 'title,title\nFirst,2', ',quantity\nFirst,2'])(
    'rejects empty or ambiguous CSV %j without proceeding to mapping', async payload => {
      const app = mount();
      await selectFile(csvFile(payload));
      await waitFor(() => expect(app.view.getByRole('alert')).toBeTruthy());
      expect(app.view.queryByRole('button', { name: /Start Import/i })).toBeNull();
      expect(app.source.create).not.toHaveBeenCalled();
    },
  );

  it('does not overwrite a new file with an older slow read', async () => {
    const app = mount();
    let resolveRead: (text: string) => void = () => {};
    const slow = csvFile('', 'slow.csv');
    vi.spyOn(slow, 'text').mockImplementation(() => new Promise(resolve => { resolveRead = resolve; }));
    await selectFile(slow);
    await selectFile(csvFile('title,quantity\nNew,2', 'new.csv'));
    await waitFor(() => expect(app.view.getByText('new.csv')).toBeTruthy());
    resolveRead('title,quantity\nOld,1');
    await Promise.resolve();
    await fireEvent.click(app.view.getByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(1));
    expect(app.source.create).toHaveBeenCalledWith(expect.objectContaining({
      variables: { title: 'New', quantity: 2 },
    }));
  });

  it('keeps partial failures downloadable with truthful counts', async () => {
    const source = provider();
    vi.mocked(source.create).mockRejectedValueOnce(new Error('private provider detail'));
    const onSuccess = vi.fn();
    const app = mount(source, { onSuccess });
    await selectFile(csvFile('title,quantity\nFirst,2\nSecond,3'));
    await waitFor(() => expect(app.view.getByRole('button', { name: /Start Import/i })).toBeTruthy());
    await fireEvent.click(app.view.getByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ succeeded: 1, failed: 1 }));
    expect(app.view.getByRole('button', { name: /Download Failed CSV/i })).toBeTruthy();
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:errors');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await fireEvent.click(app.view.getByRole('button', { name: /Download Failed CSV/i }));
    expect(download).toHaveBeenCalledTimes(1);
    const blob = createUrl.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    if (!(blob instanceof Blob)) throw new Error('Expected failed CSV blob');
    const csv = await blob.text();
    expect(csv).toContain('First');
    expect(csv).toContain('_error_reason');
    expect(csv).not.toContain('private provider detail');
    expect(revokeUrl).toHaveBeenCalledWith('blob:errors');
  });

  it.each(['tenant', 'provider', 'close'] as const)(
    'retires an in-flight import after %s changes', async change => {
      let resolveWrite: (value: { data: { id: number; title: string; quantity: number } }) => void = () => {};
      const source = provider({ create: vi.fn(() => new Promise(resolve => { resolveWrite = resolve; })) });
      const onSuccess = vi.fn();
      const app = mount(source, { onSuccess });
      await selectFile(csvFile('title,quantity\nPrivate,1\nLater,2'));
      await waitFor(() => expect(app.view.getByRole('button', { name: /Start Import/i })).toBeTruthy());
      await fireEvent.click(app.view.getByRole('button', { name: /Start Import/i }));
      await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
      if (change === 'tenant') await app.view.rerender({ tenant: 'second' });
      if (change === 'provider') await app.view.rerender({ provider: provider() });
      if (change === 'close') await app.view.rerender({ open: false });
      resolveWrite({ data: { id: 1, title: 'Private', quantity: 1 } });
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(onSuccess).not.toHaveBeenCalled();
      expect(source.create).toHaveBeenCalledTimes(1);
      expect(app.view.queryByText('Private')).toBeNull();
      expect(app.view.queryByRole('alert')).toBeNull();
      if (change === 'close') await app.view.rerender({ open: true });
      expect(app.view.getByText(/Drag and drop CSV or JSON/i)).toBeTruthy();
    },
  );

  it('blocks duplicate target mappings before any provider write', async () => {
    const app = mount();
    await selectFile(csvFile('title,quantity\nFirst,2'));
    const quantity = await app.view.findByRole('combobox', { name: 'Map quantity' });
    await userEvent.selectOptions(quantity, 'title');
    expect((quantity as HTMLSelectElement).value).toBe('title');
    await fireEvent.click(app.view.getByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(app.view.getByRole('alert').textContent).toContain('only once'));
    expect(app.source.create).not.toHaveBeenCalled();
  });

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
