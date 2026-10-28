import { describe, expect, it, vi } from 'vitest';
import { fireEvent, within } from '@testing-library/svelte';
import FilterBuilder from './FilterBuilder.svelte';
import LiteFilterBuilder from '../../../lite/src/components/LiteFilterBuilder.svelte';
import { createListLoader } from '../../../lite/src/server-adapter';
import { compileFilterTree, readFilterTree, type FilterRuleNode } from './enterprise/filter-tree.js';
import { isFilterCollectionValue, type FieldDefinition, type DataProvider, type CrudOperator, type Filter } from '@svadmin/core';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { svelte2tsx } from 'svelte2tsx';
import ts from 'typescript';

import { requireValue } from '../../../../scripts/test-assertions';
const testFields: FieldDefinition[] = [
  { key: 'title', label: '标题', type: 'text', filterable: true },
  { key: 'status', label: '状态', type: 'select', options: [{ label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' }], filterable: true },
  { key: 'views', label: '浏览量', type: 'number', filterable: true },
];

describe('FilterBuilder component', () => {
  it.each(['number', 'text', 'boolean', 'select'] as const)('links an incomplete %s scalar draft to its error until repaired', async type => {
    const field: FieldDefinition = { key: 'value', label: 'Value', type,
      ...(type === 'select' ? { options: [{ label: 'Two', value: 2 }] } : {}) };
    const onApply = vi.fn();
    const view = render(FilterBuilder, { fields: [field], onApply });
    await fireEvent.click(view.getByTestId('filter-builder-add-rule'));
    const role = type === 'number' ? 'spinbutton' : type === 'text' ? 'textbox' : 'combobox';
    const input = view.getByRole(role, { name: /^Value$/ });
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const errorId = input.getAttribute('aria-describedby');
    if (!errorId) throw new Error('Expected scalar error association');
    const error = document.getElementById(errorId);
    expect(view.getByRole('alert').contains(error)).toBe(true);
    expect(error?.textContent).toContain('Enter a valid typed value');
    if (type === 'text' || type === 'number') {
      await fireEvent.input(input, { target: { value: type === 'text' ? 'fixed' : '0' } });
    } else {
      await fireEvent.change(input, { target: { value: type === 'select' ? '0' : 'false' } });
    }
    expect(view.getByRole(role, { name: /^Value$/ })).toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(document.getElementById(errorId)).toBeNull();
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledExactlyOnceWith([{
      field: 'value', operator: type === 'text' ? 'contains' : 'eq',
      value: type === 'text' ? 'fixed' : type === 'number' ? 0 : type === 'select' ? 2 : false,
    }]);
  });

  it('keeps error references on the correct rule when earlier errors are repaired or removed', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: [{ key: 'amount', label: 'Amount', type: 'number' }],
      filters: [{ field: 'amount', operator: 'eq', value: 1 },
        { field: 'amount', operator: 'between', value: [2, 3] }],
      onApply,
    });
    const first = view.getByRole('spinbutton', { name: /^Value$/ });
    const lower = view.getByRole('spinbutton', { name: 'Lower bound' });
    const upper = view.getByRole('spinbutton', { name: 'Upper bound' });
    await fireEvent.input(first, { target: { value: '' } });
    await fireEvent.input(lower, { target: { value: '4' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    const rangeRule = lower.closest('[data-filter-rule]')?.getAttribute('data-filter-rule');
    if (!rangeRule) throw new Error('Expected range rule identity');
    function assertRangeError() {
      const id = lower.getAttribute('aria-describedby');
      if (!id) throw new Error('Expected range error reference');
      expect(upper.getAttribute('aria-describedby')).toBe(id);
      expect(view.getByRole('group', { name: /^Value$/ }).getAttribute('aria-describedby')).toBe(id);
      expect(document.getElementById(id)?.textContent).toBe(`${rangeRule}: Enter a valid typed value`);
      expect(view.getByRole('alert').contains(document.getElementById(id))).toBe(true);
      return id;
    }
    const initialRangeId = assertRangeError();
    expect(initialRangeId).not.toBe(first.getAttribute('aria-describedby'));
    await fireEvent.input(first, { target: { value: '0' } });
    expect(first.hasAttribute('aria-describedby')).toBe(false);
    expect(assertRangeError()).not.toBe(initialRangeId);
    await fireEvent.input(first, { target: { value: '' } });
    assertRangeError();
    await fireEvent.click(requireValue(view.getAllByRole('button', { name: 'Remove rule' })[0]));
    assertRangeError();
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    await fireEvent.input(lower, { target: { value: '1' } });
    for (const element of [lower, upper, view.getByRole('group', { name: /^Value$/ })]) {
      expect(element.hasAttribute('aria-describedby')).toBe(false);
    }
    expect(view.queryByRole('alert')).toBeNull();
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledExactlyOnceWith([{ field: 'amount', operator: 'between', value: [1, 3] }]);
  });

  it.each(['number', 'text', 'boolean', 'select'] as const)('associates %s set errors with the group and its editable values', async type => {
    const initial = type === 'number' || type === 'select' ? 2 : type === 'boolean' ? true : 'first';
    const field: FieldDefinition = { key: 'value', label: 'Value', type,
      ...(type === 'select' ? { options: [{ label: 'Two', value: 2 }, { label: 'Three', value: 3 }] } : {}) };
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: [field], filters: [{ field: 'value', operator: 'in', value: [initial] }], onApply,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Add set value' }));
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    const group = view.getByRole('group', { name: 'Value' });
    const role = type === 'number' ? 'spinbutton' : type === 'text' ? 'textbox' : 'combobox';
    const second = within(group).getByRole(role, { name: 'Set value 2' });
    expect(second.getAttribute('aria-invalid')).toBe('true');
    const errorId = second.getAttribute('aria-describedby');
    if (!errorId) throw new Error('Expected value error association');
    expect(group.getAttribute('aria-describedby')).toBe(errorId);
    expect(document.getElementById(errorId)?.textContent).toContain('Enter a valid typed value');
    if (type === 'number' || type === 'text') {
      await fireEvent.input(second, { target: { value: type === 'number' ? '3' : 'second' } });
    } else {
      await fireEvent.change(second, { target: { value: type === 'boolean' ? 'false' : '1' } });
    }
    expect(second.getAttribute('aria-invalid')).toBe('false');
    expect(second.hasAttribute('aria-describedby')).toBe(false);
    expect(view.queryByRole('alert')).toBeNull();
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledExactlyOnceWith([{ field: 'value', operator: 'in',
      value: [initial, type === 'number' || type === 'select' ? 3 : type === 'boolean' ? false : 'second'] }]);
  });

  it('keeps range error associations isolated between instances and clears them after repair', async () => {
    const props = {
      fields: [{ key: 'value', label: 'Value', type: 'number' as const }],
      filters: [{ field: 'value', operator: 'between' as const, value: [1, 2] }],
    };
    const first = render(FilterBuilder, props);
    const second = render(FilterBuilder, props);
    const ids: string[] = [];
    for (const view of [first, second]) {
      const scoped = within(view.container);
      const lower = scoped.getByRole('spinbutton', { name: 'Lower bound' });
      await fireEvent.input(lower, { target: { value: '3' } });
      await fireEvent.click(scoped.getByTestId('filter-builder-apply'));
      const upper = scoped.getByRole('spinbutton', { name: 'Upper bound' });
      expect(upper.getAttribute('aria-invalid')).toBe('true');
      const id = lower.getAttribute('aria-describedby');
      if (!id) throw new Error('Expected range error association');
      expect(upper.getAttribute('aria-describedby')).toBe(id);
      expect(view.container.contains(document.getElementById(id))).toBe(true);
      ids.push(id);
    }
    expect(new Set(ids).size).toBe(2);
    await fireEvent.input(within(first.container).getByRole('spinbutton', { name: 'Lower bound' }), { target: { value: '0' } });
    expect(within(first.container).queryByRole('alert')).toBeNull();
    expect(within(first.container).getByRole('spinbutton', { name: 'Lower bound' }).getAttribute('aria-describedby')).toBeNull();
    expect(within(first.container).getByRole('spinbutton', { name: 'Upper bound' }).getAttribute('aria-describedby')).toBeNull();
    expect(within(second.container).getByRole('alert')).toBeTruthy();
  });

  it('strictly compiles both filter surfaces and their collection editor', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const components = [
      resolve(directory, 'FilterBuilder.svelte'), resolve(directory, 'FilterCollectionInput.svelte'),
      resolve(directory, '../../../lite/src/components/LiteFilterBuilder.svelte'),
    ];
    const virtual = new Map(components.map(filename =>
      [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code]));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, skipLibCheck: true,
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: ['svelte', 'node'], jsx: ts.JsxEmit.Preserve, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = file => virtual.get(file) ?? read(file);
    host.fileExists = file => virtual.has(file) || exists(file);
    host.resolveModuleNames = (names, from) => names.map(name => {
      const file = resolve(dirname(from), `${name}.tsx`);
      return virtual.has(file) ? { resolvedFileName: file, extension: ts.Extension.Tsx }
        : ts.resolveModuleName(name, from, options, host).resolvedModule;
    });
    const targets = [...virtual.keys(), resolve(directory, '../../../core/src/filter-values.ts'), fileURLToPath(import.meta.url)];
    const program = ts.createProgram([...targets,
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts')], options, host);
    const diagnostics = targets.flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic =>
      `${diagnostic.file?.fileName}:${diagnostic.start}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
    )).toEqual([]);
  }, 90_000);
  it('unlocks historical filters when field metadata becomes available', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: [],
      filters: [{ field: 'title', operator: 'contains', value: 'Svelte' }],
      onApply,
    });
    expect(view.container.querySelector('output')).toBeTruthy();
    await view.rerender({ fields: testFields });
    expect(view.container.querySelector('output')).toBeNull();
    const input = view.container.querySelector<HTMLInputElement>('input');
    if (!input) throw new Error('Expected editable filter');
    await fireEvent.input(input, { target: { value: 'Updated' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith([{ field: 'title', operator: 'contains', value: 'Updated' }]);
  });

  it('keeps a historical condition read-only when late metadata still cannot validate it', async () => {
    const onApply = vi.fn();
    const filters = [{ field: 'views', operator: 'contains' as const, value: 10 }];
    const view = render(FilterBuilder, { fields: [], filters, onApply });
    expect(view.getByRole('status', { name: /只读|read-only/i })).toBeTruthy();
    await view.rerender({ fields: testFields });
    expect(view.getByRole('status', { name: /只读|read-only/i })).toBeTruthy();
    expect(view.queryByRole('spinbutton')).toBeNull();
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith(filters);
  });

  it('rejects a new draft that forges readonly without a preserved host snapshot', () => {
    const parsed = readFilterTree([{ field: 'title', operator: 'contains', value: 'Svelte' }]);
    if (!parsed.ok) throw new Error('Expected host filter');
    const node = parsed.root.children[0] as FilterRuleNode;
    node.id = 'draft-1';
    node.readonly = true;
    node.value = undefined;
    const unrelated = new Map<string, Filter>([['node-1', { field: 'title', operator: 'contains', value: 'Svelte' }]]);
    expect(compileFilterTree(parsed.root, testFields).ok).toBe(false);
    expect(compileFilterTree(parsed.root, testFields, unrelated).ok).toBe(false);
  });

  it('renders initial empty state and allows adding rules', async () => {
    const view = render(FilterBuilder, {
      fields: testFields,
    }, 'zh');

    expect(view.container.textContent).toContain('暂无筛选条件');

    const addBtn = view.container.querySelector('[data-testid="filter-builder-add-rule"]');
    expect(addBtn).not.toBeNull();
    if (addBtn) await fireEvent.click(addBtn);

    expect(view.container.textContent).not.toContain('暂无筛选条件');
  });

  it('compiles rules into filters and triggers onApply', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields,
      filters: [{ field: 'title', operator: 'contains', value: 'Svelte' }],
      onApply,
    });

    const applyBtn = view.container.querySelector('[data-testid="filter-builder-apply"]');
    expect(applyBtn).not.toBeNull();
    if (applyBtn) await fireEvent.click(applyBtn);

    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith([
      { field: 'title', operator: 'contains', value: 'Svelte' },
    ]);
  });

  it('preserves nested logical groups when applying', async () => {
    const onApply = vi.fn();
    const filters = [{
      operator: 'or' as const,
      value: [
        { field: 'title', operator: 'contains' as const, value: 'Svelte' },
        {
          operator: 'and' as const,
          value: [
            { field: 'status', operator: 'eq' as const, value: 'published' },
            { field: 'views', operator: 'gte' as const, value: 100 },
          ],
        },
      ],
    }];

    const view = render(FilterBuilder, { fields: testFields, filters, onApply });
    const applyBtn = view.container.querySelector('[data-testid="filter-builder-apply"]');
    expect(view.container.querySelectorAll('[data-testid="filter-builder-group"]')).toHaveLength(1);
    if (applyBtn) await fireEvent.click(applyBtn);

    expect(onApply).toHaveBeenCalledWith(filters);
  });

  it('fails closed on malformed input instead of applying the valid remainder', async () => {
    const onApply = vi.fn();
    const onInvalid = vi.fn();
    const filters = [
      { field: 'title', operator: 'eq', value: 'valid' },
      { operator: 'or', value: [{ field: 'views', operator: 'eq', value: { invalid: true } }] },
    ] as unknown as Filter[];
    const view = render(FilterBuilder, { fields: testFields, filters, onApply, onInvalid });
    expect(view.queryByTestId('filter-builder-root')).toBeNull();
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ code: 'value' })]));
    expect(filters).toHaveLength(2);
  });

  it.each(['nodes', 'depth'] as const)('reports %s overflow without applying or mutating the input', async kind => {
    const onApply = vi.fn();
    const onInvalid = vi.fn();
    let filters: Filter[];
    if (kind === 'nodes') {
      filters = Array.from({ length: 257 }, (_, index) => ({
        field: 'title',
        operator: 'eq' as const,
        value: `value-${index}`,
      }));
    } else {
      let nested: Filter = { field: 'title', operator: 'eq', value: 'deep' };
      for (let index = 0; index < 20; index += 1) nested = { operator: 'and', value: [nested] };
      filters = [nested];
    }
    const original = structuredClone(filters);
    const view = render(FilterBuilder, { fields: testFields, filters, onApply, onInvalid });

    await fireEvent.click(view.getByTestId('filter-builder-apply'));

    expect(onApply).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ code: 'limit' })]));
    expect(filters).toEqual(original);
  });

  it('keeps one recursive editor and rejects an incomplete nested draft without dropping siblings', async () => {
    const onApply = vi.fn();
    const onInvalid = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields, filters: [{ field: 'title', operator: 'eq', value: 'keep' }], onApply, onInvalid,
    });
    expect(view.getAllByTestId('filter-builder-root')).toHaveLength(1);
    await fireEvent.click(view.getByTestId('filter-builder-add-group'));
    const group = within(view.getByTestId('filter-builder-group'));
    await fireEvent.click(group.getByTestId('filter-group-add-rule'));
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalled();
    await fireEvent.input(group.getByRole('textbox'), { target: { value: 'nested' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith([
      { field: 'title', operator: 'eq', value: 'keep' },
      { operator: 'and', value: [{ field: 'title', operator: 'contains', value: 'nested' }] },
    ]);
  });

  it('disabled public methods cannot alter or submit the editor', () => {
    const onApply = vi.fn();
    const onReset = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields, filters: [{ field: 'title', operator: 'eq', value: 'keep' }],
      disabled: true, onApply, onReset,
    });
    view.component.addRule();
    view.component.removeRule(0);
    view.component.reset();
    view.component.apply();
    expect(view.getAllByTestId('filter-builder-rule')).toHaveLength(1);
    expect(onApply).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  });

  it('preserves typed select values and blocks incomplete rules', async () => {
    const onApply = vi.fn();
    const fields: FieldDefinition[] = [{
      key: 'priority', label: '优先级', type: 'select',
      options: [{ label: '高', value: 2 }, { label: '低', value: 'low' }],
    }];
    const view = render(FilterBuilder, { fields, filters: [{ field: 'priority', operator: 'eq', value: 2 }], onApply });
    await fireEvent.click(requireValue(view.container.querySelector('[data-testid="filter-builder-apply"]')));
    expect(onApply).toHaveBeenCalledWith([{ field: 'priority', operator: 'eq', value: 2 }]);

    await fireEvent.click(requireValue(view.container.querySelector('[data-testid="filter-builder-add-rule"]')));
    await fireEvent.click(requireValue(view.container.querySelector('[data-testid="filter-builder-apply"]')));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(view.getByRole('alert')).toBeTruthy();
  });

  it('keeps unsupported incoming conditions read-only instead of rewriting them', async () => {
    const onApply = vi.fn();
    const filters = [{ field: 'title', operator: 'between' as const, value: ['Svelte', 'SVAR'] }];
    const view = render(FilterBuilder, { fields: testFields, filters, onApply });
    await fireEvent.click(requireValue(view.container.querySelector('[data-testid="filter-builder-apply"]')));
    expect(onApply).toHaveBeenCalledWith(filters);
    expect(view.getByRole('status', { name: /只读|read-only/i })).toBeTruthy();
  });

  it('distinguishes numeric and string enum values during actual edits', async () => {
    const onApply = vi.fn();
    const fields: FieldDefinition[] = [{
      key: 'priority', label: 'Priority', type: 'select',
      options: [{ label: 'Number', value: 2 }, { label: 'String', value: '2' }],
    }];
    const view = render(FilterBuilder, { fields, filters: [{ field: 'priority', operator: 'eq', value: 2 }], onApply });
    const selects = within(view.getByTestId('filter-builder-rule')).getAllByRole('combobox');
    const valueSelect = selects[2];
    if (!valueSelect) throw new Error('Missing enum value input');
    await fireEvent.change(valueSelect, { target: { value: '1' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'priority', operator: 'eq', value: '2' }]);
    await fireEvent.change(valueSelect, { target: { value: '0' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'priority', operator: 'eq', value: 2 }]);
  });

  it('blocks a cleared number without dropping it and accepts zero after correction', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields, filters: [{ field: 'views', operator: 'gte', value: 100 }], onApply,
    });
    const input = view.getByRole('spinbutton');
    await fireEvent.input(input, { target: { value: '' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    expect(view.getByRole('alert')).toBeTruthy();
    await fireEvent.input(input, { target: { value: '0' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'views', operator: 'gte', value: 0 }]);
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('only presents operators accepted by the selected field type', () => {
    const view = render(FilterBuilder, {
      fields: [
        ...testFields,
        { key: 'active', label: '启用', type: 'boolean', filterable: true },
      ],
      filters: [{ field: 'status', operator: 'eq', value: 'draft' }],
    });
    const values = [...view.getByTestId('filter-builder-rule').querySelectorAll('select')];
    const labels = values[1] ? [...values[1].options].map(option => option.value) : [];
    expect(labels).toEqual(['eq', 'ne', 'in', 'nin', 'null', 'nnull']);
  });

  it('changes the default operator when switching from text to numeric fields', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields,
      filters: [{ field: 'title', operator: 'contains', value: '100' }],
      onApply,
    });
    const rule = view.getByTestId('filter-builder-rule');
    const selects = rule.querySelectorAll('select');
    await fireEvent.change(requireValue(selects[0]), { target: { value: 'views' } });
    await fireEvent.input(view.getByRole('spinbutton'), { target: { value: '100' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'views', operator: 'eq', value: 100 }]);
  });

  it.each(['currency', 'rating', 'rate'] as const)('edits %s as a finite number without coercing an empty value to zero', async type => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: [{ key: 'amount', label: 'Amount', type }],
      filters: [{ field: 'amount', operator: 'gte', value: 1.5 }],
      onApply,
    });
    const input = view.getByRole('spinbutton');
    const operator =requireValue( view.getByTestId('filter-builder-rule').querySelectorAll('select')[1]);
    expect([...operator.options].map(option => option.value))
      .toEqual(['eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'in', 'nin', 'between', 'nbetween', 'null', 'nnull']);
    await fireEvent.input(input, { target: { value: '' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    await fireEvent.input(input, { target: { value: '0' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'amount', operator: 'gte', value: 0 }]);
    await fireEvent.input(input, { target: { value: '-2.75' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'amount', operator: 'gte', value: -2.75 }]);
  });

  it.each(['startswith', 'endswith'] as const)('renders and edits the existing %s operator without changing its meaning', async operator => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields, filters: [{ field: 'title', operator, value: 'old' }], onApply,
    });
    expect(view.getByTestId('filter-builder-rule').querySelectorAll('select')[1]?.value).toBe(operator);
    await fireEvent.input(view.getByRole('textbox'), { target: { value: 'new' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'title', operator, value: 'new' }]);
  });

  it('preserves a historical invalid operator as read-only instead of selecting an allowed replacement', async () => {
    const onApply = vi.fn();
    const filters = [{ field: 'views', operator: 'contains' as const, value: 10 }];
    const view = render(FilterBuilder, { fields: testFields, filters, onApply });
    expect(view.getByRole('status', { name: /只读|read-only/i })).toBeTruthy();
    expect(view.queryByRole('spinbutton')).toBeNull();
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith(filters);
  });

  it('revalidates editable drafts when field definitions change', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields, filters: [{ field: 'views', operator: 'gte', value: 10 }], onApply,
    });
    await view.rerender({ fields: [{ key: 'views', label: 'Views', type: 'boolean' }] });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    expect(view.getByRole('alert')).toBeTruthy();
  });

  it('preserves explicit AND, empty groups and empty-string equality on round trip', async () => {
    const onApply = vi.fn();
    const filters = [{
      operator: 'and' as const,
      value: [
        { operator: 'or' as const, value: [] },
        { field: 'title', operator: 'eq' as const, value: '' },
      ],
    }];
    const view = render(FilterBuilder, { fields: testFields, filters, onApply });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith(filters);
  });

  it('edits numeric ranges without coercing missing endpoints, sorting or applying field min/max', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: [{ key: 'amount', label: 'Amount', type: 'currency', min: 10, max: 100 }],
      filters: [{ field: 'amount', operator: 'between', value: [0, 20] }], onApply,
    });
    await fireEvent.input(view.getByRole('spinbutton', { name: 'Lower bound' }), { target: { value: '30' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    await fireEvent.input(view.getByRole('spinbutton', { name: 'Lower bound' }), { target: { value: '' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    await fireEvent.input(view.getByRole('spinbutton', { name: 'Lower bound' }), { target: { value: '-0.25' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith([{ field: 'amount', operator: 'between', value: [-0.25, 20] }]);
  });

  it('edits typed enum sets and adds and removes values', async () => {
    const fields: FieldDefinition[] = [{ key: 'priority', label: 'Priority', type: 'select',
      options: [{ value: 2, label: 'Number' }, { value: '2', label: 'String' }] }];
    const onApply = vi.fn();
    const view = render(FilterBuilder, { fields, filters: [{ field: 'priority', operator: 'in', value: [2] }], onApply });
    await fireEvent.click(view.getByRole('button', { name: 'Add set value' }));
    await fireEvent.change(view.getByRole('combobox', { name: 'Set value 2' }), { target: { value: '1' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'priority', operator: 'in', value: [2, '2'] }]);
    await fireEvent.click(requireValue(view.getAllByRole('button', { name: 'Remove set value' })[0]));
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'priority', operator: 'in', value: ['2'] }]);
  });

  it('revalidates a collection draft when enum options become disabled', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: [{ key: 'priority', label: 'Priority', type: 'select', options: [{ value: 2, label: 'Two' }] }],
      filters: [{ field: 'priority', operator: 'in', value: [2] }], onApply,
    });
    await view.rerender({
      fields: [{ key: 'priority', label: 'Priority', type: 'select', options: [{ value: 2, label: 'Two', disabled: true }] }],
    });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    expect(view.getByRole('alert')).toBeTruthy();
  });

  it('resets the value shape when changing operators and retains nested sets on apply', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields,
      filters: [{ operator: 'or', value: [{ field: 'views', operator: 'eq', value: 2 }] }], onApply,
    });
    const operator =requireValue( view.getByTestId('filter-builder-rule').querySelectorAll('select')[1]);
    await fireEvent.change(operator, { target: { value: 'in' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    await fireEvent.input(view.getByRole('spinbutton', { name: 'Set value 1' }), { target: { value: '0' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ operator: 'or', value: [{ field: 'views', operator: 'in', value: [0] }] }]);
    await fireEvent.change(operator, { target: { value: 'between' } });
    expect(view.getAllByRole('spinbutton')).toHaveLength(2);
    await fireEvent.change(operator, { target: { value: 'eq' } });
    expect(view.getAllByRole('spinbutton')).toHaveLength(1);
  });

  it('round-trips native Lite collections through the real list loader', async () => {
    const fields: FieldDefinition[] = [
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'active', label: 'Active', type: 'boolean' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'priority', label: 'Priority', type: 'select', options: [{ value: 2, label: 'Number' }, { value: '2', label: 'String' }] },
    ];
    const filters: Filter[] = [{ operator: 'or', value: [
      { field: 'amount', operator: 'nbetween', value: [0, 2.5] },
      { field: 'active', operator: 'in', value: [false, true] },
      { field: 'name', operator: 'nin', value: ['', 'a,b'] },
      { field: 'priority', operator: 'in', value: [2, '2'] },
    ] }];
    const view = render(LiteFilterBuilder, { fields, filters });
    const form = view.container.querySelector('form');
    if (!form) throw new Error('Missing filter form');
    const url = new URL('https://example.test/list');
    for (const [key, value] of new FormData(form)) {
      if (typeof value !== 'string') throw new Error('Unexpected file');
      url.searchParams.append(key, value);
    }
    const getList = vi.fn(async () => ({ data: [], total: 0 }));
    await createListLoader({ getList } as unknown as DataProvider, { name: 'items', label: 'Items', fields })({ url });
    expect(getList).toHaveBeenCalledWith(expect.objectContaining({ filters }));
  });

  it.each([
    ['sparse', 'in', [['values.1', '1']]],
    ['mixed', 'in', [['value', '1'], ['values.0', '1']]],
    ['duplicate', 'in', [['values.0', '1'], ['values.0', '2']]],
    ['wrong shape', 'eq', [['values.0', '1']]],
    ['infinite', 'in', [['values.0', '1e999']]],
    ['reversed range', 'between', [['values.0', '2'], ['values.1', '1']]],
    ['missing endpoint', 'nbetween', [['values.0', '1']]],
    ['too many endpoints', 'between', [['values.0', '1'], ['values.1', '2'], ['values.2', '3']]],
    ['noncanonical', 'in', [['values.00', '1']]],
    ['large index', 'in', [['values.100', '1']]],
  ] as [string, CrudOperator, [string, string][]][])('rejects %s native collection before querying', async (_name, operator, values) => {
    const url = new URL('https://example.test/list');
    url.searchParams.set('filters[0][field]', 'amount');
    url.searchParams.set('filters[0][operator]', operator);
    for (const [property, value] of values) url.searchParams.append(`filters[0][${property}]`, value);
    const getList = vi.fn(async () => ({ data: [], total: 0 }));
    await expect(createListLoader({ getList } as unknown as DataProvider, {
      name: 'items', label: 'Items', fields: [{ key: 'amount', label: 'Amount', type: 'number' }],
    })({ url })).rejects.toMatchObject({ status: 400 });
    expect(getList).not.toHaveBeenCalled();
  });

  it('bounds collections and rejects sparse arrays without rewriting values', () => {
    const field: FieldDefinition = { key: 'amount', label: 'Amount', type: 'number' };
    expect(isFilterCollectionValue(field, 'in', Array(2))).toBe(false);
    expect(isFilterCollectionValue(field, 'in', Array(101).fill(0))).toBe(false);
    expect(isFilterCollectionValue(field, 'in', [])).toBe(false);
    expect(isFilterCollectionValue(field, 'in', [false])).toBe(false);
    expect(isFilterCollectionValue(field, 'in', [0, 0])).toBe(true);
  });

  it('limits operator choices to the host allowlist', async () => {
    const view = render(FilterBuilder, {
      fields: [{ key: 'title', label: '标题', type: 'text', filterable: true }],
      allowedOperators: ['eq'],
    });
    await fireEvent.click(view.getByTestId('filter-builder-add-rule'));
    const rule = within(view.getByTestId('filter-builder-rule'));
    const operator = rule.getAllByRole('combobox')[1];
    if (!(operator instanceof HTMLSelectElement)) throw new Error('Missing operator select');
    expect([...operator.options].map((option) => option.value)).toEqual(['eq']);
    expect(operator.value).toBe('eq');
  });

  it('does not invent an operator when the host allowlist matches nothing', async () => {
    const view = render(FilterBuilder, {
      fields: [{ key: 'title', label: '标题', type: 'text', filterable: true }],
      allowedOperators: [],
    });
    await fireEvent.click(view.getByTestId('filter-builder-add-rule'));
    expect(view.queryByTestId('filter-builder-rule')).toBeNull();
  });

  it('locks logic and hides nested groups for flat AND hosts', async () => {
    const view = render(FilterBuilder, {
      fields: [{ key: 'title', label: '标题', type: 'text', filterable: true }],
      allowedLogicalOperators: ['and'],
      allowGroups: false,
    });
    const root = within(view.getByTestId('filter-builder-root'));
    const logic = root.getAllByRole('combobox')[0];
    if (!(logic instanceof HTMLSelectElement)) throw new Error('Missing logic select');
    expect([...logic.options].map((option) => option.value)).toEqual(['and']);
    expect(logic.value).toBe('and');
    expect(logic.disabled).toBe(true);
    expect(root.queryByTestId('filter-builder-add-group')).toBeNull();
  });

  it('renders native date and datetime inputs for temporal fields', () => {
    const view = render(FilterBuilder, {
      fields: [
        { key: 'day', label: '日期', type: 'date', filterable: true },
        { key: 'at', label: '时间', type: 'datetime', filterable: true },
      ],
      filters: [
        { field: 'day', operator: 'eq', value: '2026-10-28' },
        { field: 'at', operator: 'eq', value: '2026-10-28T10:30' },
      ],
      allowedOperators: ['eq'],
    });
    expect(view.container.querySelector('input[type="date"]')).toBeTruthy();
    expect(view.container.querySelector('input[type="datetime-local"]')).toBeTruthy();
  });

  it('rejects saved OR filters when the host only supports AND', () => {
    const view = render(FilterBuilder, {
      fields: [{ key: 'title', label: '标题', type: 'text', filterable: true }],
      filters: [{ operator: 'or', value: [{ field: 'title', operator: 'eq', value: 'x' }] }],
      allowedLogicalOperators: ['and'],
    });
    expect(view.getByTestId('filter-builder-errors')).toBeTruthy();
    expect(view.queryByTestId('filter-builder-root')).toBeNull();
  });
});
