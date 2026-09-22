import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { setLocale } from '@svadmin/core/i18n';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Type } from '@sinclair/typebox';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineResource, resetContext, snapshotImportArtifact, snapshotImportTaskResult, type DataProvider, type ResourceDefinition, type HttpError, type ImportArtifactProvider, type TaskProvider } from '@svadmin/core';
import ImportWizardHost from './import-wizard.test-host.svelte';
import { parseImportRows, snapshotImportFile } from '../../../core/src/import-contract';

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

function mount(source = provider(), options: {
  resourceName?: string;
  resources?: ResourceDefinition[];
  onSuccess?: (result: { succeeded: number; failed: number }) => void;
  maxRows?: number | undefined;
  maxBytes?: number | undefined;
  coreProbe?: boolean;
  taskProvider?: TaskProvider;
  taskArtifactProvider?: ImportArtifactProvider;
  taskName?: string;
  retryTaskName?: string;
  taskIdempotencyKey?: string;
  initialTaskId?: string;
  onTaskSubmitted?: (taskId: string) => void;
  onImportReady?: (driver: { handleChange(info: { file: File }): Promise<unknown>; readonly error: HttpError | null }) => void;
} = {}) {
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
  function taskProvider(overrides: Partial<TaskProvider> = {}): TaskProvider {
    return {
      submit: vi.fn(async () => ({ id: 'import-1', wait: async () => ({ id: 'import-1', status: 'completed' }) })),
      get: vi.fn(async id => ({ id, status: 'running', progress: 30 })),
      cancel: vi.fn(async id => ({ id, status: 'cancelled' })),
      ...overrides,
    };
  }

  it('submits mapped records once to the task provider without local writes or premature success', async () => {
    const tasks = taskProvider();
    const onTaskSubmitted = vi.fn();
    const onSuccess = vi.fn();
    const app = mount(provider(), {
      taskProvider: tasks, taskName: 'import-posts', taskIdempotencyKey: 'attempt-1', onTaskSubmitted, onSuccess,
    });
    await selectFile(csvFile('title,quantity\nFirst,2\nSecond,0'));
    const start = await app.view.findByRole('button', { name: /Start Import/i });
    await fireEvent.click(start);
    await fireEvent.click(start);
    await waitFor(() => expect(onTaskSubmitted).toHaveBeenCalledWith('import-1'));
    expect(tasks.submit).toHaveBeenCalledTimes(1);
    expect(tasks.submit).toHaveBeenCalledWith('import-posts', expect.objectContaining({
      idempotencyKey: 'attempt-1',
      body: {
        protocolVersion: 1, resource: 'posts', fileName: 'posts.csv',
        mapping: { title: 'title', quantity: 'quantity' },
        records: [{ title: 'First', quantity: 2 }, { title: 'Second', quantity: 0 }],
      },
    }));
    expect(app.source.create).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    await app.view.findByText('Running');
    expect(app.view.queryByText('Completed', { exact: true })).toBeNull();
    await app.view.rerender({ open: false });
    await app.view.rerender({ open: true });
    await app.view.findByText('Running');
    expect(tasks.submit).toHaveBeenCalledTimes(1);
  });

  it('uploads once and submits only a validated artifact reference for large task payloads', async () => {
    const tasks = taskProvider();
    const sourceFile = csvFile('title,quantity\nFirst,2\nSecond,0');
    const uploaded = vi.fn(async (input: Parameters<ImportArtifactProvider['upload']>[0]) => ({
      artifactId: 'object-1', fileName: input.fileName, size: input.size, contentType: 'text/csv',
    }));
    const app = mount(provider(), {
      taskProvider: tasks, taskArtifactProvider: { upload: uploaded },
      taskName: 'import-posts', taskIdempotencyKey: 'attempt-artifact',
    });
    await selectFile(sourceFile);
    await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(tasks.submit).toHaveBeenCalledTimes(1));
    expect(uploaded).toHaveBeenCalledTimes(1);
    const file = uploaded.mock.calls[0]?.[0];
    expect(file?.file).toBeInstanceOf(File);
    expect(tasks.submit).toHaveBeenCalledWith('import-posts', expect.objectContaining({
      idempotencyKey: 'attempt-artifact',
      body: {
        protocolVersion: 2, resource: 'posts', fileName: 'posts.csv',
        mapping: { title: 'title', quantity: 'quantity' },
        artifact: { artifactId: 'object-1', fileName: 'posts.csv', size: sourceFile.size, contentType: 'text/csv' },
      },
    }));
    expect(vi.mocked(tasks.submit).mock.calls[0]?.[1]?.body).not.toHaveProperty('records');
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('fails closed for malformed artifact receipts without submitting a task', async () => {
    const tasks = taskProvider();
    const app = mount(provider(), {
      taskProvider: tasks, taskArtifactProvider: { upload: async () => ({ artifactId: 'object-1', fileName: 'posts.csv', size: Infinity }) },
      taskName: 'import-posts', taskIdempotencyKey: 'attempt-artifact',
    });
    await selectFile(csvFile('title,quantity\nFirst,2'));
    await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(app.view.getByRole('alert')).toBeTruthy());
    expect(tasks.submit).not.toHaveBeenCalled();
    expect(snapshotImportArtifact({ artifactId: 'x', fileName: 'x.csv', size: 1 })).toEqual({
      artifactId: 'x', fileName: 'x.csv', size: 1,
    });
    expect(snapshotImportArtifact({ artifactId: 'x', fileName: 'x.csv', size: 1, get contentType() { throw new Error(); } })).toBeUndefined();
  });

  it.each(['tenant', 'close', 'unmount', 'artifactProvider'] as const)(
    'does not submit a late artifact after %s changes', async change => {
      let finish!: (value: unknown) => void;
      const upload = vi.fn((_input: Parameters<ImportArtifactProvider['upload']>[0]) =>
        new Promise<unknown>(resolve => { finish = resolve; }));
      const tasks = taskProvider();
      const app = mount(provider(), {
        taskProvider: tasks, taskArtifactProvider: { upload },
        taskName: 'import-posts', taskIdempotencyKey: 'artifact-attempt',
      });
      const file = csvFile('title,quantity\nFirst,2');
      await selectFile(file);
      await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
      await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
      if (change === 'tenant') await app.view.rerender({ tenant: 'second' });
      if (change === 'close') await app.view.rerender({ open: false });
      if (change === 'unmount') app.view.unmount();
      if (change === 'artifactProvider') await app.view.rerender({ taskArtifactProvider: { upload: async () => ({}) } });
      expect(upload.mock.calls[0]?.[0].signal.aborted).toBe(true);
      finish({ artifactId: 'late', fileName: file.name, size: file.size });
      await Promise.resolve();
      await Promise.resolve();
      expect(tasks.submit).not.toHaveBeenCalled();
    },
  );

  it('restores a server task after a fresh mount without reading or reimporting a file', async () => {
    const tasks = taskProvider({
      get: vi.fn(async id => ({ id, status: 'completed', result: { succeeded: 7, failed: 2 } })),
    });
    const app = mount(provider(), { taskName: 'import-posts', taskProvider: tasks, initialTaskId: 'restored-1' });
    await waitFor(() => expect(app.view.getByRole('status').textContent).toContain('Succeeded: 7'));
    expect(app.view.getByRole('status').textContent).toContain('Failed: 2');
    expect(tasks.get).toHaveBeenCalledWith('restored-1');
    expect(tasks.submit).not.toHaveBeenCalled();
    expect(app.source.create).not.toHaveBeenCalled();
    await app.view.rerender({ open: false });
    await app.view.rerender({ open: true });
    await waitFor(() => expect(app.view.getByRole('status').textContent).toContain('Succeeded: 7'));
  });

  const recoverableResult = {
    succeeded: 1, failed: 2,
    failedRows: [{ row: 2, error: 'Temporary' }, { row: 3, error: 'Needs correction' }],
    retry: { receiptId: 'receipt-1', rows: [2] },
  };

  it('submits only server-authorized failed row references and follows the child task', async () => {
    const tasks = taskProvider({
      get: vi.fn(async id => id === 'parent'
        ? { id, status: 'completed', result: recoverableResult }
        : { id, status: 'running' }),
    });
    const onTaskSubmitted = vi.fn();
    const app = mount(provider(), {
      taskName: 'import-posts', retryTaskName: 'retry-import', taskProvider: tasks,
      initialTaskId: 'parent', onTaskSubmitted,
    });
    const retry = await app.view.findByRole('button', { name: 'Retry recoverable failed rows' });
    await fireEvent.click(retry);
    await fireEvent.click(retry);
    await waitFor(() => expect(onTaskSubmitted).toHaveBeenCalledWith('import-1'));
    expect(tasks.submit).toHaveBeenCalledOnce();
    expect(tasks.submit).toHaveBeenCalledWith('retry-import', expect.objectContaining({
      idempotencyKey: JSON.stringify(['import-failed-rows', 'parent', 'receipt-1']),
      body: { protocolVersion: 1, operation: 'retry-failed-rows', resource: 'posts',
        parentTaskId: 'parent', receiptId: 'receipt-1', rows: [2] },
    }));
    await waitFor(() => expect(tasks.get).toHaveBeenCalledWith('import-1'));
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('keeps the same retry key and payload after an unconfirmed submission', async () => {
    const tasks = taskProvider({
      get: vi.fn(async id => ({ id, status: 'completed', result: recoverableResult })),
      submit: vi.fn(async () => { throw new Error('private transport detail'); }),
    });
    const app = mount(provider(), {
      taskName: 'import-posts', retryTaskName: 'retry-import', taskProvider: tasks, initialTaskId: 'parent',
    });
    await fireEvent.click(await app.view.findByRole('button', { name: 'Retry recoverable failed rows' }));
    await waitFor(() => expect(app.view.getByRole('alert').textContent).toContain('unconfirmed'));
    await fireEvent.click(app.view.getByRole('button', { name: 'Retry recoverable failed rows' }));
    await waitFor(() => expect(tasks.submit).toHaveBeenCalledTimes(2));
    expect(vi.mocked(tasks.submit).mock.calls[0]).toEqual(vi.mocked(tasks.submit).mock.calls[1]);
    expect(app.view.queryByText('private transport detail')).toBeNull();
  });

  it('rejects a retry handle that points back to the parent task', async () => {
    const tasks = taskProvider({
      get: vi.fn(async id => ({ id, status: 'completed', result: recoverableResult })),
      submit: vi.fn(async () => ({ id: 'parent', wait: async () => ({ id: 'parent' }) })),
    });
    const onTaskSubmitted = vi.fn();
    const app = mount(provider(), {
      taskName: 'import-posts', retryTaskName: 'retry-import', taskProvider: tasks, initialTaskId: 'parent', onTaskSubmitted,
    });
    await fireEvent.click(await app.view.findByRole('button', { name: 'Retry recoverable failed rows' }));
    await waitFor(() => expect(app.view.getByRole('alert').textContent).toContain('unconfirmed'));
    expect(onTaskSubmitted).not.toHaveBeenCalled();
  });

  it.each(['missing-command', 'missing-receipt', 'failed-task'] as const)('does not offer retry for %s', async scenario => {
    const tasks = taskProvider({
      get: vi.fn(async id => ({
        id, status: scenario === 'failed-task' ? 'failed' : 'completed',
        result: scenario === 'missing-receipt' ? { succeeded: 1, failed: 2 } : recoverableResult,
      })),
    });
    const app = mount(provider(), {
      taskName: 'import-posts', taskProvider: tasks, initialTaskId: 'parent',
      ...(scenario === 'missing-command' ? {} : { retryTaskName: 'retry-import' }),
    });
    await app.view.findByText(scenario === 'failed-task' ? 'Failed' : 'Completed', { exact: true });
    expect(app.view.queryByRole('button', { name: 'Retry recoverable failed rows' })).toBeNull();
    expect(tasks.submit).not.toHaveBeenCalled();
  });

  it.each(['tenant', 'close', 'permission'] as const)('ignores a late failed-row retry after %s changes', async change => {
    let finish: () => void = () => {};
    const pending = new Promise<void>(resolve => { finish = resolve; });
    const tasks = taskProvider({
      get: vi.fn(async id => ({ id, status: 'completed', result: recoverableResult })),
      submit: vi.fn(async () => {
        await pending;
        return { id: 'child-private', wait: async () => ({ id: 'child-private' }) };
      }),
    });
    const onTaskSubmitted = vi.fn();
    const app = mount(provider(), {
      taskName: 'import-posts', retryTaskName: 'retry-import', taskProvider: tasks, initialTaskId: 'parent', onTaskSubmitted,
    });
    await fireEvent.click(await app.view.findByRole('button', { name: 'Retry recoverable failed rows' }));
    await waitFor(() => expect(tasks.submit).toHaveBeenCalledOnce());
    if (change === 'tenant') await app.view.rerender({ tenant: 'second' });
    if (change === 'close') await app.view.rerender({ open: false });
    if (change === 'permission') await app.view.rerender({ permission: { can: async () => ({ can: false }) } });
    finish();
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(onTaskSubmitted).not.toHaveBeenCalled();
    expect(tasks.get).not.toHaveBeenCalledWith('child-private');
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it.each([
    { receiptId: 'r', rows: [1] },
    { receiptId: '', rows: [2] },
    { receiptId: 'r', rows: [2, 2] },
    { receiptId: 'r', rows: [] },
  ])('rejects an invalid retry receipt %j', retry => {
    expect(snapshotImportTaskResult({ ...recoverableResult, retry })).toBeUndefined();
  });

  it.each(['provider', 'name', 'key'] as const)('rejects missing task %s without falling back to local writes', async missing => {
    const tasks = taskProvider();
    const app = mount(provider(), {
      taskName: missing === 'name' ? '' : 'import-posts',
      taskIdempotencyKey: missing === 'key' ? '' : 'key',
      ...(missing === 'provider' ? {} : { taskProvider: tasks }),
    });
    await selectFile(csvFile('title,quantity\nFirst,2'));
    await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
    expect(app.view.getByRole('alert').textContent).toContain('requires');
    expect(tasks.submit).not.toHaveBeenCalled();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('preflights every mapped row before submitting a task', async () => {
    const tasks = taskProvider();
    const app = mount(provider(), { taskName: 'import-posts', taskProvider: tasks, taskIdempotencyKey: 'key' });
    await selectFile(csvFile('title,quantity\nFirst,2\nSecond,invalid'));
    await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
    expect(app.view.getByRole('alert').textContent).toContain('Row 2');
    expect(tasks.submit).not.toHaveBeenCalled();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it.each(['tenant', 'provider', 'permission', 'close'] as const)('ignores late task submissions after %s changes', async change => {
    let finish: () => void = () => {};
    const pending = new Promise<void>(resolve => { finish = resolve; });
    const tasks = taskProvider({ submit: vi.fn(async () => {
      await pending;
      return { id: 'late-private', wait: async () => ({ id: 'late-private' }) };
    }) });
    const onTaskSubmitted = vi.fn();
    const app = mount(provider(), {
      taskName: 'import-posts', taskProvider: tasks, taskIdempotencyKey: 'key', onTaskSubmitted,
    });
    await selectFile(csvFile('title,quantity\nFirst,2'));
    await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(tasks.submit).toHaveBeenCalledOnce());
    if (change === 'tenant') await app.view.rerender({ tenant: 'second' });
    if (change === 'provider') await app.view.rerender({ taskProvider: taskProvider() });
    if (change === 'permission') await app.view.rerender({ permission: { can: async () => ({ can: false }) } });
    if (change === 'close') await app.view.rerender({ open: false });
    finish();
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(onTaskSubmitted).not.toHaveBeenCalled();
    expect(tasks.get).not.toHaveBeenCalled();
    expect(app.view.queryByText('late-private')).toBeNull();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('clears a restored task on tenant changes instead of querying its ID in the next tenant', async () => {
    const tasks = taskProvider();
    const app = mount(provider(), { taskName: 'import-posts', taskProvider: tasks, initialTaskId: 'private-1' });
    await app.view.findByText('Running');
    vi.mocked(tasks.get).mockClear();
    await app.view.rerender({ tenant: 'second' });
    expect(app.view.queryByText('private-1')).toBeNull();
    expect(tasks.get).not.toHaveBeenCalled();
  });

  it('shows an unconfirmed submission without echoing transport errors or retrying automatically', async () => {
    const tasks = taskProvider({ submit: vi.fn(async () => { throw new Error('private-secret'); }) });
    const app = mount(provider(), { taskName: 'import-posts', taskProvider: tasks, taskIdempotencyKey: 'key' });
    await selectFile(csvFile('title,quantity\nFirst,2'));
    await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(app.view.getByRole('alert').textContent).toContain('unconfirmed'));
    expect(app.view.container.textContent).not.toContain('private-secret');
    expect(tasks.submit).toHaveBeenCalledOnce();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('cancels a restored server task through the task provider', async () => {
    let status = 'running';
    const tasks = taskProvider({
      get: vi.fn(async id => ({ id, status })),
      cancel: vi.fn(async id => { status = 'cancelled'; return { id, status }; }),
    });
    const app = mount(provider(), { taskName: 'import-posts', taskProvider: tasks, initialTaskId: 'cancel-1' });
    await fireEvent.click(await app.view.findByRole('button', { name: /^Cancel$/ }));
    await waitFor(() => expect(tasks.cancel).toHaveBeenCalledWith('cancel-1'));
    await app.view.findByText('Cancelled');
    expect(tasks.submit).not.toHaveBeenCalled();
  });

  it.each([
    { succeeded: -1, failed: 0 },
    { succeeded: 10000, failed: 1 },
    { succeeded: 1.5, failed: 0 },
    { succeeded: 1, failed: 0, failedRows: [{ row: 1, error: 'failed' }] },
    { succeeded: 1, failed: 2, failedRows: [{ row: 1, error: 'a' }, { row: 1, error: 'b' }] },
  ])('rejects invalid task summary %j', result => {
    expect(snapshotImportTaskResult(result)).toBeUndefined();
  });

  it('does not display successful counts for a malformed terminal task result', async () => {
    const tasks = taskProvider({ get: vi.fn(async id => ({
      id, status: 'completed', result: { succeeded: 'all', failed: 0 },
    })) });
    const app = mount(provider(), { taskName: 'import-posts', taskProvider: tasks, initialTaskId: 'bad-1' });
    await waitFor(() => expect(app.view.getByRole('alert').textContent).toContain('invalid result'));
    expect(app.view.queryByText('Succeeded: all')).toBeNull();
  });

  it('rejects oversized files before reading their content', async () => {
    const app = mount();
    await app.view.rerender({ maxBytes: 4 });
    const file = csvFile('title,quantity\nFirst,1');
    const read = vi.spyOn(file, 'text');
    await selectFile(file);
    await waitFor(() => expect(app.view.getByRole('alert').textContent).toContain('limit'));
    expect(read).not.toHaveBeenCalled();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it.each(['csv', 'json'] as const)('rejects %s row limits before mapping or writing', async format => {
    const app = mount();
    await app.view.rerender({ maxRows: 1 });
    const content = format === 'csv' ? 'title,quantity\nFirst,1\nSecond,2'
      : JSON.stringify([{ title: 'First', quantity: 1 }, { title: 'Second', quantity: 2 }]);
    await selectFile(new File([content], `posts.${format}`));
    await waitFor(() => expect(app.view.getByRole('alert').textContent).toContain('limit'));
    expect(app.view.queryByRole('button', { name: /Start Import/i })).toBeNull();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it.each(['maxBytes', 'maxRows', 'invalid'] as const)('core importer enforces %s before writes', async limit => {
    const onSuccess = vi.fn();
    let importer: { handleChange(info: { file: File }): Promise<unknown>; readonly error: HttpError | null } | undefined;
    const app = mount(provider(), {
      onSuccess,
      coreProbe: true,
      onImportReady: driver => { importer = driver; },
      maxBytes: limit === 'maxBytes' ? 1 : undefined,
      maxRows: limit === 'maxRows' ? 1 : limit === 'invalid' ? 0 : undefined,
    });
    if (!importer) throw new Error('Expected core import probe');
    const file = new File([JSON.stringify([{ title: 'First', quantity: 1 }, { title: 'Second', quantity: 2 }])], 'posts.json');
    const code = limit === 'invalid' ? 'INVALID_RESOURCE_INPUT' : 'IMPORT_LIMIT_EXCEEDED';
    await expect(importer.handleChange({ file })).rejects.toMatchObject({
      code, details: { writeMayHaveSucceeded: false },
    });
    expect(importer.error?.code).toBe(code);
    expect(app.source.create).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('stops subsequent submissions and ignores a late success after cancellation', async () => {
    let resolveWrite: (value: { data: { id: number; title: string; quantity: number } }) => void = () => {};
    const source = provider({
      create: vi.fn<NonNullable<DataProvider['create']>>(() => new Promise(resolve => { resolveWrite = resolve; })),
    });
    const onSuccess = vi.fn();
    const app = mount(source, { onSuccess });
    await selectFile(csvFile('title,quantity\nFirst,1\nSecond,2'));
    await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(source.create).toHaveBeenCalledTimes(1));
    await fireEvent.click(app.view.getByRole('button', { name: /^Cancel$/ }));
    expect(app.view.getByRole('status').textContent).toContain('may have been committed');
    expect(app.view.queryByText('Completed', { exact: true })).toBeNull();
    expect(app.view.queryByRole('progressbar')).toBeNull();
    resolveWrite({ data: { id: 1, title: 'First', quantity: 1 } });
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(source.create).toHaveBeenCalledTimes(1);
    expect(app.view.getByRole('status').textContent).toContain('may have been committed');
  });

  it('core parser accepts the row limit but never silently truncates CSV or JSON', () => {
    const csv = 'title,quantity\nFirst,1\nSecond,2';
    expect(parseImportRows(csv, 'posts.csv', 'auto', 2)).toHaveLength(2);
    for (const [text, name] of [[csv, 'posts.csv'], [JSON.stringify([{ title: 'First' }, { title: 'Second' }]), 'posts.json']]) {
      expect(() => parseImportRows(text!, name!, 'auto', 1)).toThrow(expect.objectContaining({
        code: 'IMPORT_LIMIT_EXCEEDED',
        details: expect.objectContaining({ writeMayHaveSucceeded: false }),
      }));
    }
  });

  it('core file size uses the native blob size, not an overridden property', () => {
    const file = csvFile('12345');
    Object.defineProperty(file, 'size', { value: 0 });
    expect(snapshotImportFile({ file }).size).toBe(5);
  });

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
    const timer = vi.spyOn(globalThis, 'setTimeout');
    await fireEvent.click(app.view.getByRole('button', { name: /Download Failed CSV/i }));
    expect(download).toHaveBeenCalledTimes(1);
    expect((download.mock.instances[0] as HTMLAnchorElement).download).toBe('posts-import-errors.csv');
    expect(revokeUrl).not.toHaveBeenCalled();
    const cleanup = timer.mock.calls.find(([_, delay]) => delay === 10_000)?.[0];
    expect(cleanup).toBeTypeOf('function');
    if (typeof cleanup === 'function') cleanup();
    const blob = createUrl.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    if (!(blob instanceof Blob)) throw new Error('Expected failed CSV blob');
    const csv = await blob.text();
    expect(csv).toContain('First');
    expect(csv).toContain('_error_reason');
    expect(csv).not.toContain('private provider detail');
    expect(revokeUrl).toHaveBeenCalledWith('blob:errors');
  });

  it.each([
    ['../Tenant/客户', 'Tenant-import-errors.csv'],
    ['客户', 'resource-import-errors.csv'],
    ['a'.repeat(200), `${'a'.repeat(100)}-import-errors.csv`],
  ])('sanitizes resource alias %s in failed import downloads', async (identifier, filename) => {
    const app = mount(provider(), {
      resourceName: identifier,
      resources: resources.map(resource => resource.name === 'posts' ? {
        ...resource,
        identifier,
        contract: defineResource(identifier, { record, create }),
      } : resource),
    });
    vi.mocked(app.source.create).mockRejectedValueOnce(new Error('private provider detail'));
    await selectFile(csvFile('title,quantity\nFirst,2'));
    await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(app.view.getByRole('button', { name: /Download Failed CSV/i })).toBeTruthy());
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:safe');
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await fireEvent.click(app.view.getByRole('button', { name: /Download Failed CSV/i }));
    expect((download.mock.instances[0] as HTMLAnchorElement).download).toBe(filename);
  });

  it.each(['tenant', 'provider', 'close'] as const)(
    'retires an in-flight import after %s changes', async change => {
      let resolveWrite: (value: { data: { id: number; title: string; quantity: number } }) => void = () => {};
      const source = provider({
        create: vi.fn<NonNullable<DataProvider['create']>>(() => new Promise(resolve => { resolveWrite = resolve; })),
      });
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

  it('blocks missing required mappings before entering the write step', async () => {
    const app = mount();
    await selectFile(csvFile('title\nFirst'));
    await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(app.view.getByRole('alert').textContent).toContain('Row 1'));
    expect(app.view.getByText(/Map Columns/i)).toBeTruthy();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('blocks deterministic type errors during mapping preflight', async () => {
    const app = mount();
    await selectFile(csvFile('title,quantity\nFirst,not-a-number'));
    await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(app.view.getByRole('alert').textContent).toContain('Row 1'));
    expect(app.view.getByText(/Map Columns/i)).toBeTruthy();
    expect(app.source.create).not.toHaveBeenCalled();
  });

  it('converts typed select and JSON CSV values before the core preflight', async () => {
    const selectContract = defineResource('select-posts', {
      record: Type.Object({ id: Type.Number(), status: Type.Literal(2), tags: Type.Array(Type.String()) }),
      create: Type.Object({ status: Type.Literal(2), tags: Type.Array(Type.String()) }),
    });
    const app = mount(provider(), {
      resourceName: 'select-posts',
      resources: [{
        name: 'select-posts', label: 'Select Posts', contract: selectContract,
        fields: [
          { key: 'status', label: 'Status', type: 'select', required: true, options: [{ label: 'Open', value: 2 }] },
          { key: 'tags', label: 'Tags', type: 'json', required: true },
        ],
      }],
    });
    await selectFile(csvFile('status,tags\n2,"[""a""]"'));
    await fireEvent.click(await app.view.findByRole('button', { name: /Start Import/i }));
    await waitFor(() => expect(app.source.create).toHaveBeenCalledTimes(1));
    expect(app.source.create).toHaveBeenCalledWith(expect.objectContaining({
      variables: { status: 2, tags: ['a'] },
    }));
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
    expect(app.view.getByRole('alert').textContent).toContain('Row 1');
    expect(app.source.create).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(app.view.getByRole('button', { name: /Start Import/i })).toBeTruthy();
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
