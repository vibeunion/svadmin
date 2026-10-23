import { act, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import { Type } from 'typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { defineResource, resetContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
import Host from './select-contract.test-host.svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';

const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
});
const resources: ResourceDefinition[] = [{
  name: 'posts',
  label: 'Posts',
  fields: [],
  contract: posts,
}];
const clients: QueryClient[] = [];

function provider(): DataProvider {
  return {
    getList: vi.fn(async () => ({
      data: [{ id: 1, title: 'First' }],
      total: 1,
    })),
    getMany: vi.fn(async ({ ids }: { ids: (string | number)[] }) => ({
      data: ids.map((id) => ({ id: Number(id), title: `Selected ${id}` })),
    })),
    getOne: async ({ id }) => ({ data: { id: Number(id), title: `Selected ${id}` } }),
    getApiUrl: () => '/api',
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
}

function mount(options: {
  value?: string | number | null | (string | number)[];
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  triggerKeydown?: HTMLButtonAttributes['onkeydown'];
  fetchSize?: number;
  requestTimeout?: number;
  onchange?: (value: string | number | null | (string | number)[]) => void;
} = {}, overrides: Partial<DataProvider> = {}, locale = 'en') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  clients.push(queryClient);
  return render(Host, {
    provider: { ...provider(), ...overrides },
    resources,
    queryClient,
    field: true,
    ...options,
  }, locale);
}

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
});

describe('ComboboxField', () => {
  it('type-checks the component, keyboard host and regression with strict flags', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const checkedComponents = ['ComboboxField.svelte', 'select-contract.test-host.svelte'];
    const virtual = new Map([...checkedComponents, 'ui/button/button.svelte'].map(name => {
      const filename = resolve(directory, name);
      return [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), {
        filename, isTsFile: true, mode: 'ts',
      }).code];
    }));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, noImplicitOverride: true, skipLibCheck: false,
      types: ['svelte', 'node'], target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.Preserve,
      allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const readFile = host.readFile;
    const fileExists = host.fileExists;
    host.readFile = filename => virtual.get(filename) ?? readFile(filename);
    host.fileExists = filename => virtual.has(filename) || fileExists(filename);
    host.resolveModuleNames = (names, from) => names.map(name => {
      const filename = resolve(dirname(from), `${name}.tsx`);
      return virtual.has(filename) ? { resolvedFileName: filename, extension: ts.Extension.Tsx }
        : ts.resolveModuleName(name, from, options, host).resolvedModule;
    });
    const targets = [fileURLToPath(import.meta.url),
      ...checkedComponents.map(name => resolve(directory, `${name}.tsx`))];
    const program = ts.createProgram({
      rootNames: [fileURLToPath(import.meta.url), ...virtual.keys(),
        resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
        resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts'),
      ], options, host,
    });
    // 使用真实 Button 类型参与赋值检查，诊断只收集本轮修改边界。
    const diagnostics = targets.flatMap(filename => {
      const source = program.getSourceFile(filename);
      if (!source) throw new Error(`Compiler did not load ${filename}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic => {
      const line = diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : 0;
      return `${diagnostic.file?.fileName ?? ''}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
    })).toEqual([]);
  }, 30_000);

  it.each(['click', 'ArrowDown', 'ArrowUp'])('opens with %s and focuses the search field', async action => {
    const view = mount();
    const trigger = view.getByRole('button', { name: 'Record' });
    trigger.focus();
    if (action === 'click') await fireEvent.click(trigger);
    else await fireEvent.keyDown(trigger, { key: action });
    const search = await view.findByPlaceholderText('Search...');
    await waitFor(() => expect(document.activeElement).toBe(search));
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(view.getByRole('listbox').id);
  });

  it('closes with Escape without changing the value and returns focus to the trigger', async () => {
    const onchange = vi.fn();
    const view = mount({ value: 2, onchange });
    const trigger = view.getByRole('button', { name: 'Record' });
    await fireEvent.click(trigger);
    const search = await view.findByPlaceholderText('Search...');
    await waitFor(() => expect(document.activeElement).toBe(search));
    await fireEvent.keyDown(search, { key: 'Escape' });
    await waitFor(() => expect(view.queryByRole('listbox')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['escape', 'trigger', 'focusout', 'outside', 'disabled'] as const)(
    'cancels the pending search and reopens from an empty first page after %s close', async closeBy => {
      const getList = vi.fn<DataProvider['getList']>(async ({ filters }) => {
        const searched = filters?.some(filter => 'field' in filter && filter.field === 'title' && filter.value === 'Match');
        return searched
          ? { data: [{ id: 2, title: 'Search result' }], total: 1 }
          : { data: [{ id: 1, title: 'Initial 1' }], total: 1 };
      });
      const onchange = vi.fn();
      const view = mount({ multiple: true, value: [1], onchange }, { getList });
      const trigger = view.getByRole('button', { name: 'Record' });
      const outside = document.createElement('button');
      outside.textContent = 'Next field';
      view.container.append(outside);

      await fireEvent.click(trigger);
      const search = await view.findByPlaceholderText('Search...');
      await view.findByRole('option', { name: 'Initial 1' });
      await fireEvent.input(search, { target: { value: 'Match' } });
      expect(search).toHaveProperty('value', 'Match');

      if (closeBy === 'escape') await fireEvent.keyDown(search, { key: 'Escape' });
      else if (closeBy === 'trigger') await fireEvent.click(trigger);
      else if (closeBy === 'focusout') outside.focus();
      else if (closeBy === 'outside') await fireEvent.click(outside);
      else await view.rerender({ disabled: true });
      await waitFor(() => expect(view.queryByRole('listbox')).toBeNull());

      // 关闭后超过防抖窗口，未执行的搜索不能继续提交。
      await new Promise<void>(resolve => setTimeout(resolve, 350));
      expect(getList).not.toHaveBeenCalledWith(expect.objectContaining({
        filters: [{ field: 'title', operator: 'contains', value: 'Match' }],
      }));

      if (closeBy === 'disabled') await view.rerender({ disabled: false });
      await fireEvent.click(trigger);
      const reopened = await view.findByPlaceholderText('Search...');
      expect(reopened).toHaveProperty('value', '');
      await view.findByRole('option', { name: 'Initial 1' });
      expect(view.queryByRole('option', { name: 'Search result' })).toBeNull();
      expect(getList).toHaveBeenLastCalledWith(expect.objectContaining({
        pagination: expect.objectContaining({ current: 1, pageSize: 50 }),
        filters: [],
      }));
      expect(onchange).not.toHaveBeenCalled();
      expect(trigger.textContent).toContain('Initial 1');
    },
  );

  it('reopens from an empty first page instead of restoring an executed multi-page search', async () => {
    const getList = vi.fn<DataProvider['getList']>(async ({ pagination, filters }) => {
      const current = pagination?.current ?? 1;
      const searched = filters?.some(filter => 'field' in filter && filter.field === 'title' && filter.value === 'Match');
      const prefix = searched ? 'Match' : 'Initial';
      const offset = searched ? 100 : 0;
      return {
        data: Array.from({ length: current === 2 ? 1 : 10 }, (_, index) => ({
          id: offset + (current - 1) * 10 + index + 1,
          title: `${prefix} ${offset + (current - 1) * 10 + index + 1}`,
        })),
        total: 21,
      };
    });
    const onchange = vi.fn();
    const view = mount({ fetchSize: 10, multiple: true, onchange }, { getList });
    const trigger = view.getByRole('button', { name: 'Record' });

    await fireEvent.click(trigger);
    await view.findByRole('option', { name: 'Initial 1' });
    await fireEvent.input(view.getByPlaceholderText('Search...'), { target: { value: 'Match' } });
    await view.findByRole('option', { name: 'Match 101' });
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await view.findByRole('option', { name: 'Match 111' });

    await fireEvent.keyDown(view.getByPlaceholderText('Search...'), { key: 'Escape' });
    await waitFor(() => expect(view.queryByRole('listbox')).toBeNull());

    await fireEvent.click(trigger);
    const reopened = await view.findByPlaceholderText('Search...');
    expect(reopened).toHaveProperty('value', '');
    await view.findByRole('option', { name: 'Initial 1' });
    expect(view.queryByRole('option', { name: 'Match 101' })).toBeNull();
    expect(view.queryByRole('option', { name: 'Match 111' })).toBeNull();
    expect(getList).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 1, pageSize: 10 }),
      filters: [],
    }));
    // 重开后的分页必须从空搜索第一页继续，而不是旧搜索第二页。
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await view.findByRole('option', { name: 'Initial 11' });
    expect(getList).toHaveBeenLastCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 2, pageSize: 10 }),
      filters: [],
    }));
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not select stale results while searching and restores them after clearing', async () => {
    let finishSearch!: (value: { data: { id: number; title: string }[]; total: number }) => void;
    const pendingSearch = new Promise<{ data: { id: number; title: string }[]; total: number }>(resolve => {
      finishSearch = resolve;
    });
    const getList = vi.fn<DataProvider['getList']>(async ({ filters }) => {
      if (filters?.some(filter => 'field' in filter && filter.field === 'title' && filter.value === 'Match')) return pendingSearch;
      return { data: [{ id: 1, title: 'Initial 1' }], total: 1 };
    });
    const onchange = vi.fn();
    const view = mount({ onchange }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    const search = await view.findByPlaceholderText('Search...');
    const initial = await view.findByRole('option', { name: 'Initial 1' });

    // 输入尚未应用时旧结果仍可见，但不能被选中。
    await fireEvent.input(search, { target: { value: 'Match' } });
    await fireEvent.click(initial);
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getByRole('listbox')).toBeTruthy();
    await waitFor(() => expect(getList).toHaveBeenCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'Match' }],
    })));

    await fireEvent.input(search, { target: { value: '' } });
    const restored = await view.findByRole('option', { name: 'Initial 1' });
    await fireEvent.click(restored);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(1);

    await act(async () => {
      finishSearch({ data: [{ id: 9, title: 'Late search result' }], total: 1 });
      await pendingSearch;
    });
    expect(view.queryByRole('option', { name: 'Late search result' })).toBeNull();
  });

  it('drops an in-flight search that resolves after closing and reopening', async () => {
    let finishSearch!: (value: { data: { id: number; title: string }[]; total: number }) => void;
    const pendingSearch = new Promise<{ data: { id: number; title: string }[]; total: number }>(resolve => {
      finishSearch = resolve;
    });
    const getList = vi.fn<DataProvider['getList']>(async ({ filters }) => {
      if (filters?.some(filter => 'field' in filter && filter.field === 'title' && filter.value === 'Match')) {
        return pendingSearch;
      }
      return { data: [{ id: 1, title: 'Initial 1' }], total: 1 };
    });
    const onchange = vi.fn();
    const view = mount({ onchange }, { getList });
    const trigger = view.getByRole('button', { name: 'Record' });
    await fireEvent.click(trigger);
    const search = await view.findByPlaceholderText('Search...');
    await view.findByRole('option', { name: 'Initial 1' });
    await fireEvent.input(search, { target: { value: 'Match' } });
    await waitFor(() => expect(getList).toHaveBeenCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'Match' }],
    })));

    await fireEvent.keyDown(search, { key: 'Escape' });
    await waitFor(() => expect(view.queryByRole('listbox')).toBeNull());
    await fireEvent.click(trigger);
    const reopened = await view.findByPlaceholderText('Search...');
    expect(reopened).toHaveProperty('value', '');
    await view.findByRole('option', { name: 'Initial 1' });

    await act(async () => {
      finishSearch({ data: [{ id: 9, title: 'Late search result' }], total: 1 });
      await pendingSearch;
    });
    expect(view.queryByRole('option', { name: 'Late search result' })).toBeNull();
    expect(view.getByRole('option', { name: 'Initial 1' })).toBeTruthy();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('keeps a late response from an older search from replacing the newer results', async () => {
    let finishOld!: (value: { data: { id: number; title: string }[]; total: number }) => void;
    let finishNew!: (value: { data: { id: number; title: string }[]; total: number }) => void;
    const oldSearch = new Promise<{ data: { id: number; title: string }[]; total: number }>(resolve => {
      finishOld = resolve;
    });
    const newSearch = new Promise<{ data: { id: number; title: string }[]; total: number }>(resolve => {
      finishNew = resolve;
    });
    const getList = vi.fn<DataProvider['getList']>(async ({ filters }) => {
      const value = filters?.[0]?.value;
      if (value === 'Old') return oldSearch;
      if (value === 'New') return newSearch;
      return { data: [{ id: 1, title: 'Initial 1' }], total: 1 };
    });
    const onchange = vi.fn();
    const view = mount({ onchange }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    const search = await view.findByPlaceholderText('Search...');
    await view.findByRole('option', { name: 'Initial 1' });

    await fireEvent.input(search, { target: { value: 'Old' } });
    await waitFor(() => expect(getList).toHaveBeenCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'Old' }],
    })));
    await fireEvent.input(search, { target: { value: 'New' } });
    await waitFor(() => expect(getList).toHaveBeenCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'New' }],
    })));
    await act(async () => {
      finishNew({ data: [{ id: 2, title: 'New result' }], total: 1 });
      await newSearch;
    });
    await view.findByRole('option', { name: 'New result' });

    await act(async () => {
      finishOld({ data: [{ id: 3, title: 'Old late result' }], total: 1 });
      await oldSearch;
    });
    expect(view.queryByRole('option', { name: 'Old late result' })).toBeNull();
    expect(view.getByRole('option', { name: 'New result' })).toBeTruthy();
    await fireEvent.click(view.getByRole('option', { name: 'New result' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('uses distinct listbox identities across instances and reuses its own identity after reopening', async () => {
    const first = mount();
    const second = mount();
    const firstTrigger = first.container.querySelector<HTMLButtonElement>('button');
    const secondTrigger = second.container.querySelector<HTMLButtonElement>('button');
    if (!firstTrigger || !secondTrigger) throw new Error('Missing instance triggers');
    expect(firstTrigger.hasAttribute('aria-controls')).toBe(false);
    await fireEvent.click(firstTrigger);
    const firstId = firstTrigger.getAttribute('aria-controls');
    expect(firstId).toBeTruthy();
    expect(document.getElementById(firstId!)?.getAttribute('role')).toBe('listbox');
    await fireEvent.click(secondTrigger);
    const secondId = secondTrigger.getAttribute('aria-controls');
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);
    expect(firstTrigger.hasAttribute('aria-controls')).toBe(false);
    expect(document.getElementById(secondId!)?.getAttribute('role')).toBe('listbox');
    await fireEvent.click(firstTrigger);
    expect(firstTrigger.getAttribute('aria-controls')).toBe(firstId);
    expect(secondTrigger.hasAttribute('aria-controls')).toBe(false);
  });

  it('returns focus after a single selection', async () => {
    const onchange = vi.fn();
    const view = mount({ onchange });
    const trigger = view.getByRole('button', { name: 'Record' });
    await fireEvent.click(trigger);
    const first = await view.findByRole('option', { name: 'First' });
    await fireEvent.click(first);
    await waitFor(() => expect(view.queryByRole('listbox')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('focuses the command surface when searching is disabled', async () => {
    const view = mount({ searchable: false });
    const trigger = view.getByRole('button', { name: 'Record' });
    await fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const command = await view.findByRole('application');
    await waitFor(() => expect(document.activeElement).toBe(command));
    expect(view.queryByPlaceholderText('Search...')).toBeNull();
    await fireEvent.keyDown(command, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(view.queryByRole('listbox')).toBeNull();
  });

  it('closes when focus moves outside without taking it back', async () => {
    const view = mount();
    const trigger = view.getByRole('button', { name: 'Record' });
    await fireEvent.click(trigger);
    const search = await view.findByPlaceholderText('Search...');
    await waitFor(() => expect(document.activeElement).toBe(search));
    const outside = document.createElement('button');
    outside.textContent = 'Next field';
    view.container.append(outside);
    outside.focus();
    await waitFor(() => expect(view.queryByRole('listbox')).toBeNull());
    expect(document.activeElement).toBe(outside);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps native Enter/Space activation and host key handlers intact', async () => {
    const triggerKeydown = vi.fn<NonNullable<HTMLButtonAttributes['onkeydown']>>(event => {
      if (event.key === 'ArrowDown') event.preventDefault();
    });
    const view = mount({ triggerKeydown });
    const trigger = view.getByRole('button', { name: 'Record' });
    for (const key of ['Enter', ' ', 'ArrowDown']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      await fireEvent(trigger, event);
      expect(event.defaultPrevented).toBe(key === 'ArrowDown');
      expect(view.queryByRole('listbox')).toBeNull();
    }
    expect(triggerKeydown).toHaveBeenCalledTimes(3);
    await fireEvent.click(trigger);
    await waitFor(() => expect(document.activeElement).toBe(view.getByPlaceholderText('Search...')));
    trigger.focus();
    await fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(view.getByPlaceholderText('Search...'));
    trigger.focus();
    await fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(view.queryByRole('listbox')).toBeNull();
  });

  it.each([false, true])('respects host Escape handling with an open menu when prevented=%s', async prevented => {
    const triggerKeydown = vi.fn<NonNullable<HTMLButtonAttributes['onkeydown']>>(event => {
      if (prevented) event.preventDefault();
    });
    const view = mount({ triggerKeydown });
    const trigger = view.getByRole('button', { name: 'Record' });
    await fireEvent.click(trigger);
    await waitFor(() => expect(document.activeElement).toBe(view.getByPlaceholderText('Search...')));
    trigger.focus();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await fireEvent(trigger, event);
    expect(triggerKeydown).toHaveBeenCalledExactlyOnceWith(event);
    expect(trigger.getAttribute('aria-expanded')).toBe(String(prevented));
    expect(document.activeElement).toBe(trigger);
  });

  it.each(['disabled', 'ctrl', 'alt', 'meta', 'shift', 'composing'] as const)(
    'does not open for %s keyboard input', async scenario => {
      const view = mount({ disabled: scenario === 'disabled' });
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown', bubbles: true, cancelable: true,
        ctrlKey: scenario === 'ctrl', altKey: scenario === 'alt', metaKey: scenario === 'meta',
        shiftKey: scenario === 'shift', isComposing: scenario === 'composing',
      });
      await fireEvent(view.getByRole('button', { name: 'Record' }), event);
      expect(event.defaultPrevented).toBe(false);
      expect(view.queryByRole('listbox')).toBeNull();
    },
  );

  it('does not reopen after disabling or move focus after a tenant change', async () => {
    const onchange = vi.fn();
    const view = mount({ onchange });
    const trigger = view.getByRole('button', { name: 'Record' });
    await fireEvent.click(trigger);
    await waitFor(() => expect(document.activeElement).toBe(view.getByPlaceholderText('Search...')));
    await view.rerender({ disabled: true });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(view.queryByRole('listbox')).toBeNull();
    await view.rerender({ disabled: false });
    expect(view.queryByRole('listbox')).toBeNull();

    await fireEvent.click(trigger);
    const oldSearch = view.getByPlaceholderText('Search...');
    await waitFor(() => expect(document.activeElement).toBe(oldSearch));
    await view.rerender({ tenant: 'second' });
    expect(view.queryByRole('listbox')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).not.toBe(trigger);
    expect(document.activeElement).not.toBe(oldSearch);
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each([false, true])('allows the consumer to move focus after a selection when multiple=%s', async multiple => {
    const view = mount({ multiple, onchange: () => outside.focus() });
    const outside = document.createElement('button');
    outside.textContent = 'Next field';
    view.container.append(outside);
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await fireEvent.click(await view.findByRole('option', { name: 'First' }));
    await waitFor(() => expect(view.queryByRole('listbox')).toBeNull());
    expect(document.activeElement).toBe(outside);
  });

  it('retains search and previous pages when loading more and preserves cross-page selection', async () => {
    const getList = vi.fn<DataProvider['getList']>(async ({ pagination, filters }) => {
      const current = pagination?.current ?? 1;
      const searched = filters?.length ? 'Match' : 'Initial';
      return { data: Array.from({ length: current === 3 ? 1 : 10 }, (_, index) => ({
        id: (current - 1) * 10 + index + 1, title: `${searched} ${(current - 1) * 10 + index + 1}`,
      })), total: 21 };
    });
    const onchange = vi.fn();
    const view = mount({ fetchSize: 10, multiple: true, onchange }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await view.findByRole('option', { name: 'Initial 1' });
    await fireEvent.input(view.getByPlaceholderText('Search...'), { target: { value: 'Match' } });
    await view.findByRole('option', { name: 'Match 1' });
    expect(view.queryByRole('option', { name: 'Initial 1' })).toBeNull();
    await fireEvent.click(view.getByRole('option', { name: 'Match 1' }));
    await waitFor(() => expect(view.getByRole('button', { name: 'Load more' }).getAttribute('aria-disabled')).toBe('false'));
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await view.findByRole('option', { name: 'Match 11' });
    expect(getList).toHaveBeenLastCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 2, pageSize: 10 }),
      filters: [{ field: 'title', operator: 'contains', value: 'Match' }],
    }));
    expect(view.getAllByRole('option')).toHaveLength(20);
    await fireEvent.click(view.getByRole('option', { name: 'Match 11' }));
    expect(onchange).toHaveBeenLastCalledWith([1, 11]);
    await waitFor(() => expect(view.getByRole('button', { name: 'Load more' }).getAttribute('aria-disabled')).toBe('false'));
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await view.findByRole('option', { name: 'Match 21' });
    expect(view.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(view.getAllByRole('option')).toHaveLength(21);
  });

  it('retries a failed next page without skipping it', async () => {
    let fail = true;
    const getList = vi.fn<DataProvider['getList']>(async ({ pagination }) => {
      if (pagination?.current === 2 && fail) throw new Error('PRIVATE');
      const id = pagination?.current ?? 1;
      return { data: [{ id, title: `Page ${id}` }], total: 20 };
    });
    const view = mount({ fetchSize: 10 }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await view.findByRole('option', { name: 'Page 1' });
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await view.findByRole('alert');
    expect(view.queryByText('PRIVATE')).toBeNull();
    expect(view.queryByRole('button', { name: 'Load more' })).toBeNull();
    fail = false;
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await view.findByRole('option', { name: 'Page 2' });
    expect(view.getByRole('option', { name: 'Page 1' })).toBeTruthy();
    expect(getList).toHaveBeenLastCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 2 }),
    }));
  });

  it('keeps a confirmed multi-select value and label through a failed next page and retry', async () => {
    let fail = true;
    const getList = vi.fn<DataProvider['getList']>(async ({ pagination }) => {
      const current = pagination?.current ?? 1;
      if (current === 2 && fail) throw new Error('PRIVATE');
      return current === 2
        ? { data: [{ id: 2, title: 'Page 2' }], total: 20 }
        : { data: [{ id: 1, title: 'First' }], total: 20 };
    });
    const getMany = vi.fn(async ({ ids }: { ids: (string | number)[] }) => ({
      data: ids.map(id => ({ id: Number(id), title: `Selected ${id}` })),
    }));
    const onchange = vi.fn();
    const view = mount({ multiple: true, value: [1], fetchSize: 10, onchange }, { getList, getMany });
    const trigger = view.getByRole('button', { name: 'Record' });

    await fireEvent.click(trigger);
    await view.findByRole('option', { name: 'First' });
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await view.findByRole('alert');
    expect(view.queryByText('PRIVATE')).toBeNull();

    // 后续页失败只应隐藏候选列表，已确认的多选值及其权威回显不能随错误一起清空。
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getByRole('button', { name: /clear/i })).toBeTruthy();
    expect(trigger.textContent).toContain('Selected 1');

    fail = false;
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await view.findByRole('option', { name: 'Page 2' });
    expect(trigger.textContent).toContain('Selected 1');
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('option', { name: 'Page 2' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith([1, 2]);
  });

  it('prefers the refreshed selected-record label over an old page cache', async () => {
    const getList = vi.fn<DataProvider['getList']>(async ({ pagination }) => {
      const current = pagination?.current ?? 1;
      return current === 2
        ? { data: [{ id: 2, title: 'Page 2' }], total: 20 }
        : { data: [{ id: 1, title: 'First' }], total: 20 };
    });
    const getMany = vi.fn(async () => ({ data: [{ id: 1, title: 'Selected 1' }] }));
    const view = mount({ multiple: true, value: [1], fetchSize: 10 }, { getList, getMany });
    const trigger = view.getByRole('button', { name: 'Record' });

    await fireEvent.click(trigger);
    await view.findByRole('option', { name: 'First' });
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await view.findByRole('option', { name: 'Page 2' });

    // 第 1 页缓存仍有 First，但已选记录查询的权威新标签必须覆盖旧页缓存。
    await waitFor(() => expect(trigger.textContent).toContain('Selected 1'));
    expect(trigger.textContent).not.toContain('First');
  });

  it('hides an old cached label when the selected-record query fails', async () => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({
      data: [{ id: 1, title: 'First' }], total: 1,
    }));
    const getMany = vi.fn(async ({ ids }: { ids: (string | number)[] }) => {
      if (ids.includes(2)) throw new Error('PRIVATE');
      return { data: ids.map(id => ({ id: Number(id), title: `Selected ${id}` })) };
    });
    const view = mount({ multiple: true, value: [1] }, { getList, getMany });
    const trigger = view.getByRole('button', { name: 'Record' });

    await fireEvent.click(trigger);
    await view.findByRole('option', { name: 'First' });
    await waitFor(() => expect(trigger.textContent).toContain('First'));

    await view.rerender({ value: [1, 2] });
    await view.findByRole('alert');

    // 已选记录查询失败时沿用旧实现的隐藏标签边界，不能把旧页缓存当作权威回显。
    expect(view.queryByText('PRIVATE')).toBeNull();
    expect(trigger.textContent).not.toContain('First');
  });

  it('keeps Load more Enter activation separate from option selection', async () => {
    const onchange = vi.fn();
    let finish = () => {};
    const pending = new Promise<void>(resolve => { finish = resolve; });
    const getList = vi.fn<DataProvider['getList']>(async ({ pagination }) => {
      if (pagination?.current === 2) await pending;
      return {
        data: [{ id: pagination?.current ?? 1, title: `Page ${pagination?.current ?? 1}` }],
        total: 30,
      };
    });
    const view = mount({ onchange, fetchSize: 10 }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await view.findByRole('option', { name: 'Page 1' });
    const more = view.getByRole('button', { name: 'Load more' });
    more.focus();
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    await fireEvent(more, event);
    expect(event.defaultPrevented).toBe(false);
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getByRole('listbox')).toBeTruthy();
    // Happy DOM 不派发原生按钮键盘 click；浏览器另验 Enter 和 Space 的完整链路。
    await fireEvent.click(more);
    await waitFor(() => expect(more.getAttribute('aria-disabled')).toBe('true'));
    expect(document.activeElement).toBe(more);
    await fireEvent.click(more);
    expect(getList).toHaveBeenCalledTimes(2);
    finish();
    await view.findByRole('option', { name: 'Page 2' });
    expect(document.activeElement).toBe(more);
    expect(onchange).not.toHaveBeenCalled();
    expect(getList).toHaveBeenLastCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 2 }),
    }));
    await fireEvent.keyDown(more, { key: 'Escape' });
    expect(view.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(view.getByRole('button', { name: 'Record' }));
  });

  it('drops accumulated and late pages when the tenant changes', async () => {
    let finish!: (value: { data: { id: number; title: string }[]; total: number }) => void;
    const pending = new Promise<{ data: { id: number; title: string }[]; total: number }>(resolve => { finish = resolve; });
    const getList = vi.fn<DataProvider['getList']>()
      .mockResolvedValueOnce({ data: [{ id: 1, title: 'Old first' }], total: 20 })
      .mockImplementationOnce(() => pending)
      .mockResolvedValue({ data: [{ id: 3, title: 'New tenant' }], total: 1 });
    const view = mount({ fetchSize: 10 }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await view.findByRole('option', { name: 'Old first' });
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(2));
    await view.rerender({ tenant: 'second' });
    await waitFor(() => expect(view.getByRole('button', { name: 'Record' }).getAttribute('aria-expanded')).toBe('false'));
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await view.findByRole('option', { name: 'New tenant' });
    await act(async () => { finish({ data: [{ id: 2, title: 'Old late' }], total: 20 }); await pending; });
    expect(view.queryByRole('option', { name: 'Old first' })).toBeNull();
    expect(view.queryByRole('option', { name: 'Old late' })).toBeNull();
    expect(view.getAllByRole('option')).toHaveLength(1);
  });

  it.each([undefined, 0, Infinity, 201])('uses bounded default page size for %s', async fetchSize => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({ data: [], total: 0 }));
    const view = mount(fetchSize === undefined ? {} : { fetchSize }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(getList).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 1, pageSize: 50 }),
    })));
  });

  it('localizes search and empty state', async () => {
    const view = mount({}, { getList: async () => ({ data: [], total: 0 }) }, 'zh-CN');
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    expect(view.getByPlaceholderText('搜索...')).toBeTruthy();
    await view.findByText('无匹配结果。');
  });

  it('supports controlled multi-select while keeping the menu open', async () => {
    const changes: (string | number | null | (string | number)[])[] = [];
    const view = mount({ multiple: true, onchange: value => changes.push(value) });

    const trigger = await view.findByRole('button', { name: 'Record' });
    await fireEvent.click(trigger);
    const first = await view.findByRole('option', { name: 'First' });
    // Chromium 点击 option 时会先将焦点放到可聚焦的 Command 根节点。
    view.getByRole('application').focus();
    await fireEvent.click(first);

    expect(changes).toEqual([[1]]);
    expect(view.getByRole('listbox')).toBeTruthy();
    expect(document.activeElement).toBe(view.getByPlaceholderText('Search...'));

    await waitFor(() => expect(view.getByRole('button', { name: 'Record' }).textContent).toContain('First'));
    await fireEvent.click(view.getByRole('option', { name: 'First' }));
    expect(changes).toEqual([[1], []]);
    expect(document.activeElement).toBe(view.getByPlaceholderText('Search...'));
  });

  it('loads selected records separately so a filtered list does not lose the selection', async () => {
    const view = mount({ value: [2], multiple: true });

    const trigger = await view.findByRole('button', { name: 'Record' });
    await fireEvent.click(trigger);
    await waitFor(() => expect(view.getByRole('option', { name: 'First' })).toBeTruthy());
    expect(view.getByRole('option', { name: 'Selected 2' })).toBeTruthy();
  });

  it('aborts a superseded list request when a newer search dispatches', async () => {
    const signals: AbortSignal[] = [];
    let finishOld!: (value: { data: { id: number; title: string }[]; total: number }) => void;
    const pendingOld = new Promise<{ data: { id: number; title: string }[]; total: number }>(resolve => {
      finishOld = resolve;
    });
    const getList = vi.fn<DataProvider['getList']>(async params => {
      const signal = (params as { signal?: AbortSignal }).signal;
      if (signal) signals.push(signal);
      const value = params.filters?.[0]?.value;
      if (value === 'Old') return pendingOld;
      if (value === 'New') return { data: [{ id: 2, title: 'New result' }], total: 1 };
      return { data: [{ id: 1, title: 'Initial 1' }], total: 1 };
    });
    const view = mount({ onchange: vi.fn() }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    const search = await view.findByPlaceholderText('Search...');
    await view.findByRole('option', { name: 'Initial 1' });

    await fireEvent.input(search, { target: { value: 'Old' } });
    await waitFor(() => expect(getList).toHaveBeenCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'Old' }],
    })));
    await fireEvent.input(search, { target: { value: 'New' } });
    await view.findByRole('option', { name: 'New result' });

    // 新搜索派发时必须真实中止旧请求，而不只是丢弃旧响应。
    await waitFor(() => expect(signals[1]?.aborted).toBe(true));
    expect(signals[2]?.aborted).toBe(false);
    await act(async () => {
      finishOld({ data: [{ id: 3, title: 'Old late result' }], total: 1 });
      await pendingOld;
    });
    expect(view.queryByRole('option', { name: 'Old late result' })).toBeNull();
    expect(view.getByRole('option', { name: 'New result' })).toBeTruthy();
  });

  it('rejects an invalid request timeout before dispatching any provider request', async () => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({
      data: [{ id: 1, title: 'First' }], total: 1,
    }));
    const view = mount({ requestTimeout: 0 }, { getList });
    await view.findByRole('alert');
    expect(getList).not.toHaveBeenCalled();
  });

  it('aborts a timed-out request and exposes retry without leaking the private error', async () => {
    const signals: AbortSignal[] = [];
    let stalled = true;
    const getList = vi.fn<DataProvider['getList']>(async params => {
      const signal = (params as { signal?: AbortSignal }).signal;
      if (signal) signals.push(signal);
      if (stalled) return new Promise(() => {});
      return { data: [{ id: 1, title: 'Recovered' }], total: 1 };
    });
    const view = mount({ requestTimeout: 20 }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await view.findByRole('alert');
    expect(view.queryByText('PRIVATE')).toBeNull();
    await waitFor(() => expect(signals[0]?.aborted).toBe(true));

    stalled = false;
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await view.findByRole('option', { name: 'Recovered' });
  });

  it('virtualizes more than 1000 candidates and keeps a far row operable', async () => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({
      data: Array.from({ length: 1200 }, (_, index) => ({ id: index, title: `Item ${index}` })),
      total: 1200,
    }));
    const onchange = vi.fn();
    const view = mount({ fetchSize: 200, onchange }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await view.findByRole('option', { name: 'Item 0' });

    // 窗口化后不应把 1200 个候选全部挂到 DOM。
    expect(view.getAllByRole('option').length).toBeLessThan(200);
    const listbox = view.getByRole('listbox');
    listbox.scrollTop = 1200 * 36;
    await fireEvent.scroll(listbox);
    const far = await view.findByRole('option', { name: 'Item 1199' });
    await fireEvent.click(far);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(1199);
  });

  it('navigates 1200 virtual candidates with End, Home and cross-window arrows before Enter', async () => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({
      data: Array.from({ length: 1200 }, (_, index) => ({ id: index, title: `Item ${index}` })),
      total: 1200,
    }));
    const onchange = vi.fn();
    const view = mount({ fetchSize: 200, onchange }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    const search = await view.findByPlaceholderText('Search...');
    await view.findByRole('option', { name: 'Item 0' });
    const activeText = (): string | null => {
      const id = search.getAttribute('aria-activedescendant');
      return id ? document.getElementById(id)?.textContent?.trim() ?? null : null;
    };

    await fireEvent.keyDown(search, { key: 'ArrowDown' });
    await waitFor(() => expect(activeText()).toBe('Item 0'));
    await fireEvent.keyDown(search, { key: 'End' });
    await waitFor(() => expect(activeText()).toBe('Item 1199'));
    expect(search.getAttribute('aria-activedescendant')).not.toBeNull();
    await fireEvent.keyDown(search, { key: 'Home' });
    await waitFor(() => expect(activeText()).toBe('Item 0'));
    // 从首页向上回绕到完整候选末尾，证明导航基于 1200 项而不是已挂载窗口。
    await fireEvent.keyDown(search, { key: 'ArrowUp' });
    await waitFor(() => expect(activeText()).toBe('Item 1199'));
    await fireEvent.keyDown(search, { key: 'Enter' });
    expect(onchange).toHaveBeenCalledExactlyOnceWith(1199);
    expect(view.queryByRole('listbox')).toBeNull();
  });

  it('clears all selected values with one explicit action', async () => {
    const changes: (string | number | null | (string | number)[])[] = [];
    const view = mount({ value: [2], multiple: true, onchange: value => changes.push(value) });

    await view.findByRole('button', { name: 'Record' });
    await fireEvent.click(view.getByRole('button', { name: /clear/i }));
    expect(changes).toEqual([[]]);
    expect(document.activeElement).toBe(view.getByRole('button', { name: 'Record' }));
  });
});
