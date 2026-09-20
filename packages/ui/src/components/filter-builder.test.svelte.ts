import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/svelte';
import FilterBuilder from './FilterBuilder.svelte';
import LiteFilterBuilder from '../../../lite/src/components/LiteFilterBuilder.svelte';
import { createListLoader } from '../../../lite/src/server-adapter';
import { isFilterCollectionValue, type FieldDefinition, type DataProvider, type CrudOperator, type Filter } from '@svadmin/core';
import { setLocale } from '@svadmin/core/i18n';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { svelte2tsx } from 'svelte2tsx';
import ts from 'typescript';

const testFields: FieldDefinition[] = [
  { key: 'title', label: '标题', type: 'text', filterable: true },
  { key: 'status', label: '状态', type: 'select', options: [{ label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' }], filterable: true },
  { key: 'views', label: '浏览量', type: 'number', filterable: true },
];

describe('FilterBuilder component', () => {
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
  }, 30_000);
  it('renders initial empty state and allows adding rules', async () => {
    const view = render(FilterBuilder, {
      fields: testFields,
      filters: [],
    });

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

  it('preserves typed select values and blocks incomplete rules', async () => {
    const onApply = vi.fn();
    const fields: FieldDefinition[] = [{
      key: 'priority', label: '优先级', type: 'select',
      options: [{ label: '高', value: 2 }, { label: '低', value: 'low' }],
    }];
    const view = render(FilterBuilder, { fields, filters: [{ field: 'priority', operator: 'eq', value: 2 }], onApply });
    await fireEvent.click(view.container.querySelector('[data-testid="filter-builder-apply"]')!);
    expect(onApply).toHaveBeenCalledWith([{ field: 'priority', operator: 'eq', value: 2 }]);

    await fireEvent.click(view.container.querySelector('[data-testid="filter-builder-add-rule"]')!);
    await fireEvent.click(view.container.querySelector('[data-testid="filter-builder-apply"]')!);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(view.getByRole('alert')).toBeTruthy();
  });

  it('keeps unsupported incoming conditions read-only instead of rewriting them', async () => {
    const onApply = vi.fn();
    const filters = [{ field: 'title', operator: 'between' as const, value: ['Svelte', 'SVAR'] }];
    const view = render(FilterBuilder, { fields: testFields, filters, onApply });
    await fireEvent.click(view.container.querySelector('[data-testid="filter-builder-apply"]')!);
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
    await fireEvent.change(selects[0]!, { target: { value: 'views' } });
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
    const operator = view.getByTestId('filter-builder-rule').querySelectorAll('select')[1]!;
    expect([...operator.options].map(option => option.value))
      .toEqual(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'between', 'nbetween', 'null', 'nnull']);
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
    setLocale('en');
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
    setLocale('en');
    const fields: FieldDefinition[] = [{ key: 'priority', label: 'Priority', type: 'select',
      options: [{ value: 2, label: 'Number' }, { value: '2', label: 'String' }] }];
    const onApply = vi.fn();
    const view = render(FilterBuilder, { fields, filters: [{ field: 'priority', operator: 'in', value: [2] }], onApply });
    await fireEvent.click(view.getByRole('button', { name: 'Add set value' }));
    await fireEvent.change(view.getByRole('combobox', { name: 'Set value 2' }), { target: { value: '1' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'priority', operator: 'in', value: [2, '2'] }]);
    await fireEvent.click(view.getAllByRole('button', { name: 'Remove set value' })[0]!);
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
    setLocale('en');
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields,
      filters: [{ operator: 'or', value: [{ field: 'views', operator: 'eq', value: 2 }] }], onApply,
    });
    const operator = view.getByTestId('filter-builder-rule').querySelectorAll('select')[1]!;
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
    , ['mixed', 'in', [['value', '1'], ['values.0', '1']]]
    , ['duplicate', 'in', [['values.0', '1'], ['values.0', '2']]]
    , ['wrong shape', 'eq', [['values.0', '1']]]
    , ['infinite', 'in', [['values.0', '1e999']]]
    , ['reversed range', 'between', [['values.0', '2'], ['values.1', '1']]]
    , ['missing endpoint', 'nbetween', [['values.0', '1']]]
    , ['too many endpoints', 'between', [['values.0', '1'], ['values.1', '2'], ['values.2', '3']]]
    , ['noncanonical', 'in', [['values.00', '1']]]
    , ['large index', 'in', [['values.100', '1']]]
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
});
