import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { defineResource, resetContext, parseQueryKey, type DataProvider, type ResourceDefinition,
  type GetOneResult } from '@svadmin/core';
import * as unsafe from '../../../core/src/unsafe';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Host from './detail-contract.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String() });
const posts = defineResource('posts', { record });
const other = defineResource('other', { record });
const postDefinition: ResourceDefinition = {
  name: 'posts', label: 'Posts', contract: posts,
  canCreate: false, canEdit: false, canDelete: false,
  fields: [{ key: 'id', label: 'ID', type: 'number' }, { key: 'title', label: 'Title', type: 'text' }],
};
const resources: ResourceDefinition[] = [postDefinition, { ...postDefinition, name: 'other', label: 'Other', contract: other }];
const clients: QueryClient[] = [];
type Mode = 'page' | 'drawer';

function provider(getOne: DataProvider['getOne'] = async ({ id }) => ({ data: { id, title: `Record ${id}` } })): DataProvider {
  return {
    getOne: vi.fn(getOne), getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: [], total: 0 })),
    create: async () => ({ data: {} }), update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
  };
}
function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Request not initialized'); };
  let reject: (cause: unknown) => void = () => { throw new Error('Request not initialized'); };
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function mount(mode: Mode, source: DataProvider | Record<string, DataProvider> = provider(), open = true, id: string | number | null = 1) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  const view = render(Host, { mode, provider: source, resources, queryClient: client, open, id });
  return { view, client };
}
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  vi.restoreAllMocks();
});

describe('contract-bound detail views', () => {
  it('strictly compiles the detail boundary, views and migrated negative type fixtures', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ['../../../core/src/query-hooks.svelte.ts', 'record-detail.svelte.ts', 'detail-contract.test.type-fixture.ts',
      '../../../../scripts/fixtures/core-resource-types/unregistered.ts'].map(path => resolve(directory, path));
    const virtual = new Map(['ShowPage.svelte', 'RecordDetailDrawer.svelte', 'BoundRecordDetailDrawer.svelte',
      'detail-contract.test-host.svelte'].map(name => {
      const filename = resolve(directory, name);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code];
    }));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, skipLibCheck: false, types: ['svelte', 'node'],
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.Preserve,
      allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = file => virtual.get(file) ?? read(file);
    host.fileExists = file => virtual.has(file) || exists(file);
    const targets = [...sources, ...virtual.keys()];
    const program = ts.createProgram({ rootNames: [...targets,
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
    ], options, host });
    const diagnostics = targets.flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing compiler input ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic => {
      const line = diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : 0;
      return `${diagnostic.file?.fileName ?? ''}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
    })).toEqual([]);
  }, 30_000);

  it('removes the unchecked detail hook export', () => {
    expect('useShow' in unsafe).toBe(false);
  });

  it.each(['page', 'drawer'] as const)('%s renders checked fields and rejects missing runtime contracts', async mode => {
    const app = mount(mode);
    await waitFor(() => expect(app.view.getByText('Record 1')).toBeTruthy());
    expect(app.view.getByText('Title')).toBeTruthy();
    expect(() => render(Host, { mode, provider: provider(),
      resources: [{ name: 'posts', label: 'Posts', fields: [] }], queryClient: app.client,
    })).toThrowError(expect.objectContaining({ code: 'RESOURCE_CONTRACT_REQUIRED' }));
  });

  it('does not fetch closed or unselected drawers, even with a route record ID', async () => {
    const source = provider();
    const app = mount('drawer', source, false, null);
    expect(source.getOne).not.toHaveBeenCalled();
    expect(app.view.queryByRole('dialog')).toBeNull();
    await app.view.rerender({ open: true });
    expect(app.view.getByRole('dialog')).toBeTruthy();
    expect(source.getOne).not.toHaveBeenCalled();
    expect(app.client.getQueryCache().getAll().filter(query => parseQueryKey(query.queryKey)?.kind === 'data')).toHaveLength(0);
    await app.view.rerender({ id: 2 });
    await waitFor(() => expect(app.view.getByText('Record 2')).toBeTruthy());
    expect(source.getOne).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    await app.view.rerender({ id: null });
    expect(app.view.queryByText('Record 2')).toBeNull();
    expect(source.getOne).toHaveBeenCalledTimes(1);
  });

  it.each(['page', 'drawer'] as const)('%s waits for show permission and never fetches a denied record', async mode => {
    const allow = deferred<{ can: boolean }>();
    const source = provider();
    const app = mount('drawer', source, false);
    await app.view.rerender({ mode, open: true, permission: { can: () => allow.promise } });
    expect(source.getOne).not.toHaveBeenCalled();
    expect(app.view.queryByText('Record 1')).toBeNull();
    allow.resolve({ can: false });
    await waitFor(() => expect(app.view.container.querySelector('[data-svadmin-access-denied]')).toBeTruthy());
    expect(source.getOne).not.toHaveBeenCalled();
    if (mode === 'page') {
      const refresh = app.view.getByRole('button', { name: /^refresh$/i });
      expect(refresh.hasAttribute('disabled')).toBe(true);
      await fireEvent.click(refresh);
      expect(source.getOne).not.toHaveBeenCalled();
    }
    await app.view.rerender({ permission: { can: async () => ({ can: true }) } });
    await waitFor(() => expect(app.view.getByText('Record 1')).toBeTruthy());
  });

  it.each(['page', 'drawer'] as const)('%s removes cached display immediately when show permission is revoked', async mode => {
    const source = provider();
    const app = mount(mode, source);
    await waitFor(() => expect(app.view.getByText('Record 1')).toBeTruthy());
    await app.view.rerender({ permission: { can: async () => ({ can: false }) } });
    await waitFor(() => expect(app.view.queryByText('Record 1')).toBeNull());
    expect(source.getOne).toHaveBeenCalledTimes(1);
  });

  it.each(['page', 'drawer'] as const)('%s respects canShow=false without fetching data', async mode => {
    const source = provider();
    const app = mount('drawer', source, false);
    await app.view.rerender({ mode, open: true, resources: [{ ...postDefinition, canShow: false }] });
    await waitFor(() => expect(app.view.container.querySelector('[data-svadmin-access-denied]')).toBeTruthy());
    expect(source.getOne).not.toHaveBeenCalled();
  });

  for (const mode of ['page', 'drawer'] as const) {
    it.each(['id', 'resource', 'provider', 'tenant', 'contract', 'metadata'] as const)(
      `${mode} keeps late responses out of the current view after a %s change`, async change => {
        const pending = deferred<GetOneResult>();
        const getOne = vi.fn<DataProvider['getOne']>()
          .mockImplementationOnce(() => pending.promise)
          .mockImplementation(async ({ id }) => ({ data: { id, title: 'Current' } }));
        const source = provider(getOne);
        const app = mount(mode, source);
        await waitFor(() => expect(getOne).toHaveBeenCalledOnce());
        switch (change) {
          case 'id': await app.view.rerender({ id: 2 }); break;
          case 'resource': await app.view.rerender({ resource: 'other' }); break;
          case 'provider': await app.view.rerender({ provider: provider(getOne) }); break;
          case 'tenant': await app.view.rerender({ tenant: 'second' }); break;
          case 'contract': await app.view.rerender({ resources: [{ ...postDefinition, contract: defineResource('posts', { record }) }] }); break;
          case 'metadata': await app.view.rerender({ resources: [{ ...postDefinition, provider: { meta: { region: 'new' } } }] }); break;
        }
        await waitFor(() => expect(app.view.getByText('Current')).toBeTruthy());
        pending.resolve({ data: { id: 1, title: 'Old' } });
        await pending.promise;
        await waitFor(() => expect(app.view.queryByText('Old')).toBeNull());
        expect(app.view.getByText('Current')).toBeTruthy();
      },
    );
  }

  it.each(['page', 'drawer'] as const)('%s separates provider instances sharing the same client and contract', async mode => {
    const first = provider(async ({ id }) => ({ data: { id, title: 'First provider' } }));
    const second = provider(async ({ id }) => ({ data: { id, title: 'Second provider' } }));
    const app = mount(mode, first);
    await waitFor(() => expect(app.view.getByText('First provider')).toBeTruthy());
    const next = render(Host, { mode, provider: second, resources, queryClient: app.client });
    await waitFor(() => expect(within(next.container).getByText('Second provider')).toBeTruthy());
    expect(within(app.view.container).getByText('First provider')).toBeTruthy();
    expect(first.getOne).toHaveBeenCalledOnce();
    expect(second.getOne).toHaveBeenCalledOnce();
  });

  it.each(['page', 'drawer'] as const)('%s rejects response schema and typed-ID mismatches', async mode => {
    for (const data of [{ id: 2, title: 'Wrong row' }, { id: '1', title: 'Wrong type' }, { id: 1, title: false }]) {
      const app = mount(mode, provider(async () => ({ data })));
      await waitFor(() => expect(app.view.getByRole('alert')).toBeTruthy());
      expect(app.view.queryByText('Wrong row')).toBeNull();
      expect(app.view.queryByText('Wrong type')).toBeNull();
      app.view.unmount();
    }
  });

  it.each(['page', 'drawer'] as const)('%s rejects accessor-backed records before rendering', async mode => {
    const getter = vi.fn(() => 'Private field');
    const data = Object.defineProperty({ id: 1 }, 'title', { enumerable: true, get: getter });
    const app = mount(mode, provider(async () => ({ data })));
    await waitFor(() => expect(app.view.getByRole('alert')).toBeTruthy());
    expect(getter).not.toHaveBeenCalled();
    expect(app.view.queryByText('Private field')).toBeNull();
  });

  it.each(['page', 'drawer'] as const)('%s shows a sanitized failure and retries the current detail', async mode => {
    const getOne = vi.fn<DataProvider['getOne']>().mockRejectedValueOnce(new Error('secret tenant token'))
      .mockResolvedValue({ data: { id: 1, title: 'Recovered' } });
    const source = provider(getOne);
    const app = mount(mode, source);
    await waitFor(() => expect(app.view.getByRole('alert')).toBeTruthy());
    expect(app.view.container.textContent).not.toContain('secret tenant');
    await fireEvent.click(app.view.getByRole('button', { name: /^retry$/i }));
    await waitFor(() => expect(app.view.getByText('Recovered')).toBeTruthy());
    expect(source.getList).not.toHaveBeenCalled();
    expect(getOne).toHaveBeenCalledTimes(2);
  });

  it('refreshes and waits for the page detail instead of unrelated list queries', async () => {
    const pending = deferred<GetOneResult>();
    const getOne = vi.fn<DataProvider['getOne']>().mockResolvedValueOnce({ data: { id: 1, title: 'Initial' } })
      .mockImplementationOnce(() => pending.promise);
    const source = provider(getOne);
    const app = mount('page', source);
    await waitFor(() => expect(app.view.getByText('Initial')).toBeTruthy());
    const button = app.view.getByRole('button', { name: /^refresh$/i });
    await fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('true'));
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(getOne).toHaveBeenCalledTimes(2);
    pending.resolve({ data: { id: 1, title: 'Updated' } });
    await waitFor(() => expect(app.view.getByText('Updated')).toBeTruthy());
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(source.getList).not.toHaveBeenCalled();
  });

  it('unmounts closed reads and never shows their late response for the reopened record', async () => {
    const pending = deferred<GetOneResult>();
    const getOne = vi.fn<DataProvider['getOne']>().mockImplementationOnce(() => pending.promise)
      .mockResolvedValue({ data: { id: 2, title: 'Reopened' } });
    const app = mount('drawer', provider(getOne));
    await waitFor(() => expect(getOne).toHaveBeenCalledOnce());
    await app.view.rerender({ open: false });
    expect(app.view.queryByRole('dialog')).toBeNull();
    await app.view.rerender({ open: true, id: 2 });
    await waitFor(() => expect(app.view.getByText('Reopened')).toBeTruthy());
    pending.resolve({ data: { id: 1, title: 'Closed record' } });
    await pending.promise;
    expect(app.view.queryByText('Closed record')).toBeNull();
  });

  it('uses current record permissions for drawer navigation and reports closing once', async () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    const app = mount('drawer');
    await app.view.rerender({ resources: [{ ...postDefinition, canEdit: true }],
      permission: { can: async request => ({ can: !Array.isArray(request) && request.action === 'show' }) },
      onNavigate, onClose,
    });
    await waitFor(() => expect(app.view.getByText('Record 1')).toBeTruthy());
    expect(app.view.queryByRole('button', { name: /^edit$/i })).toBeNull();
    await fireEvent.click(app.view.getByRole('button', { name: /full details/i }));
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/posts/show/1' }));
    expect(app.view.queryByRole('dialog')).toBeNull();
    await app.view.rerender({ open: true, id: 2 });
    await waitFor(() => expect(app.view.getByText('Record 2')).toBeTruthy());
    await fireEvent.click(app.view.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('retains field validation, hidden fields and grid/list layouts', async () => {
    const app = mount('page', provider(async ({ id }) => ({ data: { id, title: 'Visible' } })));
    await app.view.rerender({ layout: 'grid', resources: [{ ...postDefinition, fields: [
      { key: 'id', label: 'Hidden ID', type: 'number', showInShow: false },
      { key: 'title', label: 'Numeric metadata', type: 'number' },
    ] }] });
    await waitFor(() => expect(app.view.getByText('Numeric metadata')).toBeTruthy());
    expect(app.view.queryByText('Hidden ID')).toBeNull();
    expect(app.view.container.querySelector('[data-svadmin-invalid-field]')).toBeTruthy();
    await app.view.rerender({ layout: 'list', resources });
    await waitFor(() => expect(app.view.getByText('Visible')).toBeTruthy());
    expect(app.view.getByTestId('detail-child')).toBeTruthy();
  });

  it.each(['page', 'drawer'] as const)('%s rejects a wrong ID type before calling the provider', async mode => {
    const source = provider();
    const app = mount(mode, source, true, '1');
    await waitFor(() => expect(app.view.getByRole('alert')).toBeTruthy());
    expect(source.getOne).not.toHaveBeenCalled();
  });

  it('uses the resource provider route and its metadata without touching the default provider', async () => {
    const first = provider();
    const cms = provider();
    const app = mount('drawer', { default: first, cms }, false);
    await app.view.rerender({ mode: 'page', open: true,
      resources: [{ ...postDefinition, provider: { dataProviderName: 'cms', meta: { region: 'west' } } }],
    });
    await waitFor(() => expect(app.view.getByText('Record 1')).toBeTruthy());
    expect(first.getOne).not.toHaveBeenCalled();
    expect(cms.getOne).toHaveBeenCalledWith(expect.objectContaining({ meta: expect.objectContaining({ region: 'west' }) }));
  });
});
