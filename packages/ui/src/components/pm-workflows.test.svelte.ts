import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { resetToast, setAdminOptions } from '@svadmin/core';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import AutoTableInteractionsHarness from './pm-workflows.test-host.svelte';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

beforeEach(() => {
  setAdminOptions({ mutationMode: 'pessimistic' });
  resetToast();
  localStorage.clear();
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel() {}, finished: Promise.resolve() }),
  });
});

afterEach(() => {
  resetToast();
  vi.restoreAllMocks();
});

describe('PM workflow acceptance', () => {
  it('strictly compiles the changed workflow components', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const virtual = new Map([
      'AutoTable.svelte', 'AutoForm.svelte', 'DetailDrawer.svelte',
      'QuickEditDrawer.svelte', 'RecordRowActions.svelte', 'BoundRecordDetailDrawer.svelte',
      'ui/sheet/sheet.svelte', 'pm-workflows.test-host.svelte', 'RowActions.svelte', 'DraggableHeader.svelte',
      '../../../../example/src/pages/Dashboard.svelte', '../../../../example/src/pages/UserManagementPage.svelte',
      '../../../create-svadmin/template/src/pages/Dashboard.svelte',
    ].map(file => {
      const filename = resolve(directory, file);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code];
    }));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, skipLibCheck: true, types: ['svelte', 'node'],
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.Preserve, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = file => virtual.get(file) ?? read(file);
    host.fileExists = file => virtual.has(file) || exists(file);
    host.resolveModuleNames = (names, containingFile) => names.map(name => {
      const candidate = resolve(dirname(containingFile), `${name}.tsx`);
      if (virtual.has(candidate)) return { resolvedFileName: candidate, extension: ts.Extension.Tsx };
      return ts.resolveModuleName(name, containingFile, options, host).resolvedModule;
    });
    const program = ts.createProgram({
      rootNames: [...virtual.keys(),
        resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
        resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
      ], options, host,
    });
    const errors = [...virtual.keys()].filter(file => !file.endsWith('/RowActions.svelte.tsx') && !file.endsWith('/DraggableHeader.svelte.tsx')).flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing source: ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(errors.map(error => `${error.file?.fileName}:${error.start}: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`)).toEqual([]);
  }, 30_000);

  it('keeps detail visible and isolates deletion behind the action menu and confirmation', async () => {
    const onDeleteOne = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      locale: 'en', canEdit: true, canDelete: true, onNavigate: vi.fn(), onDeleteOne,
    });
    await view.findAllByText('user@example.com');
    expect((await view.findAllByRole('button', { name: 'Detail', exact: true })).length).toBeGreaterThan(0);
    expect(view.queryByRole('button', { name: 'Delete', exact: true })).toBeNull();
    await fireEvent.click((await view.findAllByRole('button', { name: 'More actions' }))[0]!);
    await fireEvent.click(await view.findByRole('menuitem', { name: 'Delete', exact: true }));
    expect(await view.findByRole('alertdialog')).toBeTruthy();
    expect(onDeleteOne).not.toHaveBeenCalled();
  });

  it('saves quick edits without changing the route, filters, or selection', async () => {
    const onNavigate = vi.fn();
    const view = render(AutoTableInteractionsHarness, {
      locale: 'en', canEdit: true, canDelete: true, selectable: true,
      initialParams: { q: 'user' }, onNavigate,
    });
    await view.findAllByText('user@example.com');
    const checkbox = (await view.findAllByRole('checkbox', { name: /user-1/ }))[0]!;
    await fireEvent.click(checkbox);
    await fireEvent.click((await view.findAllByRole('button', { name: 'More actions' }))[0]!);
    await fireEvent.click(await view.findByRole('menuitem', { name: 'Quick edit' }));
    const drawer = await view.findByRole('dialog', { name: 'Edit Users' });
    const email = await within(drawer).findByLabelText('Email');
    await fireEvent.input(email, { target: { value: 'updated@example.com' } });
    await fireEvent.click(within(drawer).getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(view.queryByRole('dialog', { name: 'Edit Users' })).toBeNull());
    expect(onNavigate).not.toHaveBeenCalled();
    expect(view.getByPlaceholderText('Search...')).toHaveProperty('value', 'user');
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
  });

  it('guards Escape when the quick edit contains unsaved values', async () => {
    const view = render(AutoTableInteractionsHarness, { locale: 'en', canEdit: true, onNavigate: vi.fn() });
    await view.findAllByText('user@example.com');
    await fireEvent.click((await view.findAllByRole('button', { name: 'More actions' }))[0]!);
    await fireEvent.click(await view.findByRole('menuitem', { name: 'Quick edit' }));
    const drawer = await view.findByRole('dialog', { name: 'Edit Users' });
    await fireEvent.input(await within(drawer).findByLabelText('Email'), { target: { value: 'draft@example.com' } });
    await fireEvent.keyDown(document, { key: 'Escape' });
    const confirmation = await view.findByRole('alertdialog');
    await fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel', exact: true }));
    expect(view.getByRole('dialog', { name: 'Edit Users' })).toBeTruthy();
    expect(within(drawer).getByLabelText('Email')).toHaveProperty('value', 'draft@example.com');
  });

  it('does not offer quick edit or deletion when record permissions deny them', async () => {
    const view = render(AutoTableInteractionsHarness, {
      locale: 'en', canEdit: true, canDelete: true, editAllowed: false, deleteAllowed: false, onNavigate: vi.fn(),
    });
    await view.findAllByText('user@example.com');
    expect(view.queryByRole('button', { name: 'More actions' })).toBeNull();
  });

  it('retains draft values after a failed save and supports retry', async () => {
    const onUpdate = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(undefined);
    const view = render(AutoTableInteractionsHarness, { canEdit: true, onNavigate: vi.fn(), onUpdate });
    await fireEvent.click((await view.findAllByRole('button', { name: 'More actions' }))[0]!);
    await fireEvent.click(await view.findByRole('menuitem', { name: 'Quick edit' }));
    const drawer = await view.findByRole('dialog', { name: 'Edit Users' });
    await fireEvent.input(await within(drawer).findByLabelText('Email'), { target: { value: 'retry@example.com' } });
    await fireEvent.click(within(drawer).getByRole('button', { name: /Save/ }));
    await within(drawer).findByRole('alert');
    expect(within(drawer).getByLabelText('Email')).toHaveProperty('value', 'retry@example.com');
    await fireEvent.click(within(drawer).getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(view.queryByRole('dialog', { name: 'Edit Users' })).toBeNull());
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(await view.findAllByText('retry@example.com')).toHaveLength(2);
  });

  it('groups detail metadata and provides a working ID copy action', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const view = render(AutoTableInteractionsHarness, { onNavigate: vi.fn() });
    await fireEvent.click((await view.findAllByRole('button', { name: 'Detail', exact: true }))[0]!);
    const drawer = await view.findByRole('dialog', { name: 'Users Detail' });
    const group = await within(drawer).findByText('Contact', { selector: 'summary' });
    expect(group.closest('details')?.open).toBe(false);
    await fireEvent.click(within(drawer).getByRole('button', { name: 'Copy ID' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('user-1'));
    expect(await within(drawer).findByText('Copied!')).toBeTruthy();
  });

  it('offers recovery in both empty list layouts when a search has no results', async () => {
    const view = render(AutoTableInteractionsHarness, {
      locale: 'en', emptyData: true, initialParams: { q: 'missing' }, onNavigate: vi.fn(),
    });
    await waitFor(() => expect(view.getAllByRole('button', { name: 'Clear all' }).length).toBeGreaterThanOrEqual(2));
    await fireEvent.click(view.getAllByRole('button', { name: 'Clear all' }).at(-1)!);
    await waitFor(() => expect(view.getByPlaceholderText('Search...')).toHaveProperty('value', ''));
  });
});
