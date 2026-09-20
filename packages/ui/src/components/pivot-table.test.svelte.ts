import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { buildPivot, buildPivotCacheKey, buildPivotDrilldown, buildPivotExportRequest, decodePivotResult, snapshotPivotQuery, formatPivotValue, PIVOT_LIMITS, type PivotAggregation, type PivotPayload } from '@svadmin/core/pivot';
import { setLocale } from '@svadmin/core/i18n';
import { resetAccessControlProvider, setAccessControlProvider } from '@svadmin/core/permissions';
import PivotTable from './PivotTable.svelte';
import LitePivotTable from '../../../lite/src/components/LitePivotTable.svelte';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { svelte2tsx } from 'svelte2tsx';
import { QueryClient } from '@tanstack/svelte-query';
import type { AuthProvider } from '@svadmin/core';
import PivotSessionHost from './pivot-session.test-host.svelte';

const fields = { rowField: 'r', columnField: 'c', valueField: 'v' };
const data = [
  { r: 'A', c: 'X', v: 2 },
  { r: 'A', c: 'X', v: 4 },
  { r: 'A', c: 'Y', v: 12 },
  { r: 'B', c: 'X', v: -2 },
];
const payload = (label = 'A', total = 4): PivotPayload => ({
  rows: [{ key: 'row', value: label, label }],
  columns: [{ key: 'column', value: 'X', label: 'X' }],
  cells: [{ rowKey: 'row', columnKey: 'column', value: total }],
  rowTotals: [{ key: 'row', value: total }],
  columnTotals: [{ key: 'column', value: total }],
  grandTotal: total,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const sessionClients: QueryClient[] = [];
beforeEach(() => setLocale('en'));
afterEach(() => {
  cleanup();
  for (const client of sessionClients.splice(0)) client.clear();
  setLocale('en');
  resetAccessControlProvider();
});

describe('bounded pivot model', () => {
  it('builds cache keys only from valid provider and auth scope inputs', () => {
    const query = { ...fields, resource: 'orders' };
    const key = buildPivotCacheKey(query, 'scope:auth:1', 'orders-api');
    expect(key).toContain('"providerKey":"orders-api"');
    expect(key).toContain('"scopeKey":"scope:auth:1"');
    expect(buildPivotCacheKey(query, '', 'orders-api')).toBeUndefined();
    expect(buildPivotCacheKey(query, 'scope', '')).toBeUndefined();
  });

  it.each(['csv', 'json', 'xlsx'])('snapshots an explicit %s server pivot export request', format => {
    const query = {
      ...fields, resource: 'orders',
      filters: [{ field: 'status', operator: 'eq', value: 'paid' }],
      meta: { tenant: { id: 'a' } },
    };
    const request = buildPivotExportRequest(query, 'tenant-a:orders', format);
    expect(request).toEqual({
      protocolVersion: 1, kind: 'pivot', scopeKey: 'tenant-a:orders', format,
      query: { ...query, aggregator: 'sum' },
      requestFingerprint: expect.any(String),
    });
    expect(JSON.parse(request!.requestFingerprint)).toEqual({
      protocolVersion: 1, kind: 'pivot', scopeKey: 'tenant-a:orders', format,
      query: { ...query, aggregator: 'sum' },
    });
    query.filters[0]!.value = 'changed';
    query.meta.tenant.id = 'b';
    expect(request?.query.filters).toEqual([{ field: 'status', operator: 'eq', value: 'paid' }]);
    expect(request?.query.meta).toEqual({ tenant: { id: 'a' } });
  });

  it('rejects invalid pivot export scope, format and query without reading accessors', () => {
    const query = { ...fields, resource: 'orders' };
    for (const scope of [undefined, null, '', ' ', 1, 'x'.repeat(4001)]) {
      expect(buildPivotExportRequest(query, scope)).toBeUndefined();
    }
    for (const format of [null, '', 'xls', 'pdf', {}, 1]) {
      expect(buildPivotExportRequest(query, 'a', format)).toBeUndefined();
    }
    const getter = vi.fn(() => 'orders');
    expect(buildPivotExportRequest({ ...fields, get resource() { return getter(); } }, 'a')).toBeUndefined();
    expect(getter).not.toHaveBeenCalled();
    expect(buildPivotExportRequest({ ...query, data: [] }, 'a')).toBeUndefined();
    expect(buildPivotExportRequest({ ...query, aggregator: 'median' }, 'a')).toBeUndefined();
    expect(buildPivotExportRequest(query, 'a')?.format).toBe('csv');
  });

  it('strictly compiles both pivot surfaces and the shared server contract', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const components = [resolve(directory, 'PivotTable.svelte'), resolve(directory, 'PivotExportButton.svelte'),
      resolve(directory, 'pivot-export.test-host.svelte'),
      resolve(directory, 'pivot-session.test-host.svelte'), resolve(directory, 'pivot-session.test-probe.svelte'),
      resolve(directory, '../../../lite/src/components/LitePivotTable.svelte')];
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
    const targets = [...virtual.keys(), resolve(directory, '../../../core/src/pivot.ts')];
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
  it('snapshots server queries and rejects invalid filters, fields and query-only pagination', () => {
    const query = { ...fields, resource: 'orders', filters: [{ field: 'v', operator: 'eq', value: 1 }] };
    const copy = snapshotPivotQuery(query);
    expect(copy).toEqual({ ...query, aggregator: 'sum' });
    query.filters[0]!.value = 2;
    expect(copy?.filters?.[0]).toMatchObject({ value: 1 });
    for (const patch of [{ rowField: '' }, { filters: [{ field: 'v', operator: 'execute', value: 1 }] },
      { pagination: { pageSize: 10 } }, { aggregator: 'unknown' }]) {
      expect(snapshotPivotQuery({ ...query, ...patch })).toBeUndefined();
    }
  });

  it('rejects executable payloads, duplicate cells, incomplete totals and excessive dimensions', () => {
    const getter = vi.fn(() => []);
    const accessor = { ...payload(), get rows() { return getter(); } };
    expect(decodePivotResult(accessor).error).toBe('invalidData');
    expect(getter).not.toHaveBeenCalled();
    const value = payload();
    expect(decodePivotResult({ ...value, cells: [...value.cells, ...value.cells] }).error).toBe('invalidData');
    expect(decodePivotResult({ ...value, rowTotals: [] }).error).toBe('invalidData');
    expect(decodePivotResult({ ...value, grandTotal: Infinity }).error).toBe('invalidData');
    expect(decodePivotResult({ ...value, rows: Array.from({ length: 201 }, () => value.rows[0]) }).error).toBe('limit');
    expect(decodePivotResult({ ...value, cells: [{ ...value.cells[0], value: '4' }] }).error).toBe('invalidNumber');
  });
  it('decodes a bounded server aggregate and rejects forged cell references', () => {
    const payload = {
      rows: [{ key: 'string:A', value: 'A', label: 'A' }],
      columns: [{ key: 'string:X', value: 'X', label: 'X' }],
      cells: [{ rowKey: 'string:A', columnKey: 'string:X', value: 4 }],
      rowTotals: [{ key: 'string:A', value: 4 }],
      columnTotals: [{ key: 'string:X', value: 4 }],
      grandTotal: 4,
    };
    const result = decodePivotResult(payload);
    expect(result.error).toBeUndefined();
    expect(result.cells.get('string:A')?.get('string:X')).toBe(4);
    expect(decodePivotResult({ ...payload, cells: [{ ...payload.cells[0], rowKey: 'forged' }] }).error).toBe('invalidData');
  });
  it('builds typed drill-down filters without mutating the source query', () => {
    const query = { ...fields, resource: 'orders', filters: [{ operator: 'or' as const, value: [
      { field: 'status', operator: 'eq' as const, value: 'paid' },
    ] }], meta: { view: 'monthly' } };
    const drill = buildPivotDrilldown(query, 'tenant-a', { key: 'number:1', value: 1, label: '1' }, { key: 'string:X', value: 'X', label: 'X' });
    expect(drill).toMatchObject({
      resource: 'orders', scopeKey: 'tenant-a', row: { value: 1 }, column: { value: 'X' },
      filters: [
        { operator: 'or' },
        { field: 'r', operator: 'eq', value: 1 },
        { field: 'c', operator: 'eq', value: 'X' },
      ],
    });
    expect(query.filters).toHaveLength(1);
    expect(buildPivotDrilldown(query, '', { key: 'x', value: 'x', label: 'x' }, { key: 'y', value: 'y', label: 'y' })).toBeUndefined();
  });
  it.each([
    ['sum', [6, 18, 4, 16]],
    ['count', [2, 3, 3, 4]],
    ['avg', [3, 6, 4 / 3, 4]],
    ['min', [2, 2, -2, -2]],
    ['max', [4, 12, 4, 12]],
  ] satisfies [PivotAggregation, number[]][])('%s aggregates cells and original records for totals', (aggregator, expected) => {
    const pivot = buildPivot(data, { ...fields, aggregator });
    const actual = [
      pivot.cells.get('string:A')?.get('string:X'),
      pivot.rowTotals.get('string:A'),
      pivot.columnTotals.get('string:X'),
      pivot.grandTotal,
    ];
    actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!));
    expect(pivot.cells.get('string:B')?.get('string:Y')).toBeUndefined();
  });

  it('separates typed dimensions and null from placeholder text', () => {
    const values = [1, '1', true, 'true', null, '—'];
    const pivot = buildPivot(values.map((v, index) => ({ r: v, c: v, v: index })), fields);
    expect(pivot.error).toBeUndefined();
    expect(pivot.rows).toHaveLength(6);
    expect(pivot.columns).toHaveLength(6);
    expect(pivot.cells.get('number:1')?.get('number:1')).toBe(0);
    expect(pivot.cells.get('string:1')?.get('string:1')).toBe(1);
    expect(new Set(pivot.rows.map(row => row.label)).size).toBe(6);
  });

  it('does not collide when dimensions contain the previous compound-key delimiter', () => {
    const pivot = buildPivot([{ r: 'A:::B', c: 'C', v: 3 }, { r: 'A', c: 'B:::C', v: 7 }], fields);
    expect(pivot.cells.get('string:A:::B')?.get('string:C')).toBe(3);
    expect(pivot.cells.get('string:A')?.get('string:B:::C')).toBe(7);
    expect(pivot.grandTotal).toBe(10);
  });

  it('keeps escaped and empty dimension labels distinct', () => {
    const values = [1, '1', '"1"', '', '""', null, '—'];
    const pivot = buildPivot(values.map(r => ({ r, c: 'X', v: 1 })), fields);
    expect(new Set(pivot.rows.map(row => row.label)).size).toBe(values.length);
    expect(pivot.rows.every(row => row.label.length > 0)).toBe(true);
  });

  it.each(['sum', 'avg', 'min', 'max'] as const)('%s skips null measures but preserves numeric zero', aggregator => {
    const pivot = buildPivot([{ r: 'A', c: 'X', v: null }, { r: 'B', c: 'X', v: 0 }, { r: 'A', c: 'Y' }], { ...fields, aggregator });
    expect(pivot.cells.get('string:A')?.get('string:X')).toBeNull();
    expect(pivot.rowTotals.get('string:A')).toBeNull();
    expect(pivot.rowTotals.get('string:B')).toBe(0);
    expect(pivot.grandTotal).toBe(0);
  });

  it('count counts records without coercing or reading their measures', () => {
    const item = { r: 'A', c: 'X', get v(): number { throw new Error('must not read'); } };
    expect(buildPivot([item, { r: 'A', c: 'X', v: null }], { ...fields, aggregator: 'count' }).grandTotal).toBe(2);
  });

  it.each(['4', '', ' ', false, NaN, Infinity, -Infinity, {}, []].map(value => ({ value })))('rejects invalid measure $value atomically', ({ value: v }) => {
    const pivot = buildPivot([...data, { r: 'A', c: 'X', v }], fields);
    expect(pivot.error).toBe('invalidNumber');
    expect(pivot.rows).toEqual([]);
    expect(pivot.cells.size).toBe(0);
    expect(pivot.grandTotal).toBeNull();
  });

  it.each([{}, [], NaN, Infinity, 'x'.repeat(PIVOT_LIMITS.dimensionLength + 1)].map(value => ({ value })))('rejects invalid dimensions $value', ({ value: r }) => {
    expect(buildPivot([{ r, c: 'X', v: 1 }], fields).error).toBe('invalidData');
  });

  it('rejects invalid config and missing records without rendering a partial result', () => {
    expect(buildPivot(data, { ...fields, rowField: '' }).error).toBe('invalidData');
    expect(buildPivot(data, { ...fields, aggregator: 'median' as PivotAggregation }).error).toBe('invalidData');
    expect(buildPivot(new Array<Record<string, unknown>>(1), fields).error).toBe('invalidData');
  });

  it('treats missing dimensions as null and never uses inherited field values', () => {
    const record: Record<string, unknown> = Object.create({ r: 'secret', c: 'secret', v: 5 });
    const pivot = buildPivot([record], fields);
    expect(pivot.rows[0]?.value).toBeNull();
    expect(pivot.columns[0]?.value).toBeNull();
    expect(pivot.grandTotal).toBeNull();
  });

  it('rejects sum overflow but calculates finite averages, min and max', () => {
    const large = [{ r: 'A', c: 'X', v: Number.MAX_VALUE }, { r: 'A', c: 'X', v: Number.MAX_VALUE }];
    expect(buildPivot(large, fields).error).toBe('overflow');
    for (const aggregator of ['avg', 'min', 'max'] as const) {
      expect(buildPivot(large, { ...fields, aggregator }).grandTotal).toBe(Number.MAX_VALUE);
    }
  });

  it('accepts 10000 records and rejects the next without scanning records', () => {
    const records = Array.from({ length: 10_000 }, () => ({ r: 'A', c: 'X', v: 1 }));
    expect(buildPivot(records, fields).grandTotal).toBe(10_000);
    const poison = { get r(): string { throw new Error('must reject before reading'); } };
    expect(buildPivot([poison, ...records], fields).error).toBe('limit');
  });

  it('bounds row and column cardinality and accepts the largest cross matrix', () => {
    const records = Array.from({ length: 200 }, (_, i) => ({ r: i, c: i, v: 1 }));
    const pivot = buildPivot(records, fields);
    expect(pivot.error).toBeUndefined();
    expect(pivot.rows.length * pivot.columns.length).toBe(40_000);
    expect(buildPivot([...records, { r: 200, c: 0, v: 1 }], fields).error).toBe('limit');
    expect(buildPivot([...records, { r: 0, c: 200, v: 1 }], fields).error).toBe('limit');
  });

  it('reads each measure only once for matrix and totals', () => {
    const measure = vi.fn(() => 2);
    const records = Array.from({ length: 50 }, (_, i) => ({ r: i, c: i, get v() { return measure(); } }));
    expect(buildPivot(records, fields).grandTotal).toBe(100);
    expect(measure).toHaveBeenCalledTimes(50);
  });

  it('does not pass empty values to the formatter and recovers from formatter failure', () => {
    const formatter = vi.fn(() => { throw new Error('bad formatter'); });
    expect(formatPivotValue(null, formatter)).toBe('—');
    expect(formatter).not.toHaveBeenCalled();
    expect(formatPivotValue(0, formatter)).toBe('0');
    expect(formatPivotValue(7, () => ' ')).toBe('7');
  });
});

describe.each([['SPA', PivotTable], ['Lite', LitePivotTable]] as const)('%s pivot view', (_name, Component) => {
  it('renders server totals verbatim without averaging pre-aggregated groups', () => {
    const value = payload();
    value.cells[0]!.value = 12;
    value.grandTotal = 7;
    const view = render(Component, { ...fields, aggregator: 'avg', aggregateData: value });
    expect(view.container.querySelector('tbody td')?.textContent?.trim()).toBe('12');
    expect(view.container.querySelector('tfoot td:last-child')?.textContent?.trim()).toBe('7');
  });
  it('renders named native table with typed row headers, zero and empty cells', () => {
    const view = render(Component, {
      ...fields, ariaLabel: 'Revenue',
      data: [{ r: 1, c: 'X', v: 0 }, { r: '1', c: 'Y', v: 5 }],
    });
    expect(view.getByRole('table', { name: 'Revenue' })).toBeTruthy();
    expect(view.getByRole('rowheader', { name: '1', exact: true })).toBeTruthy();
    expect(view.getByRole('rowheader', { name: '"1"', exact: true })).toBeTruthy();
    expect(view.container.querySelector('tbody tr')?.textContent).toContain('0');
    expect(view.container.querySelector('tbody')?.textContent).toContain('—');
  });

  it('updates aggregate and clears stale results when input changes', async () => {
    const view = render(Component, { ...fields, data });
    const total = () => view.container.querySelector('tfoot td:last-child')?.textContent?.trim();
    expect(total()).toBe('16');
    await view.rerender({ aggregator: 'avg' });
    expect(total()).toBe('4');
    await view.rerender({ data: [{ r: 'C', c: 'Z', v: 20 }] });
    expect(total()).toBe('20');
    expect(view.queryByRole('rowheader', { name: 'A', exact: true })).toBeNull();
  });

  it('renders empty, loading and error states instead of stale tables', async () => {
    const view = render(Component, { ...fields, data: [] });
    expect(view.getByRole('status').textContent).toContain('No data');
    await view.rerender({ data, loading: true });
    expect(view.getByRole('status').textContent).toContain('Loading');
    expect(view.queryByRole('table')).toBeNull();
    await view.rerender({ loading: false, error: 'Access denied' });
    expect(view.getByRole('alert').textContent).toBe('Access denied');
    expect(view.queryByRole('table')).toBeNull();
    await view.rerender({ error: undefined });
    expect(view.queryByRole('table')).not.toBeNull();
  });

  it('shows numeric and capacity errors without a partial table', async () => {
    const view = render(Component, { ...fields, data: [{ r: 'A', c: 'X', v: '5' }] });
    expect(view.getByRole('alert').textContent).toContain('invalid numbers');
    expect(view.queryByRole('table')).toBeNull();
    await view.rerender({ data: Array.from({ length: 10_001 }, () => data[0]!) });
    expect(view.getByRole('alert').textContent).toContain('exceed');
  });

  it('recovers from formatter exceptions without crashing and escapes formatted output', async () => {
    const view = render(Component, { ...fields, data, formatValue: () => { throw new Error('bad formatter'); } });
    expect(view.container.querySelector('tfoot td:last-child')?.textContent?.trim()).toBe('16');
    await view.rerender({ formatValue: () => '<script>alert(1)</script>' });
    expect(view.container.querySelector('script')).toBeNull();
    expect(view.container.textContent).toContain('<script>');
  });

  it('uses Chinese labels and messages when requested', () => {
    setLocale('zh-CN');
    const view = render(Component, { ...fields, data });
    expect(view.container.textContent).toContain('透视分析');
    expect(view.container.textContent).toContain('求和');
    expect(view.getByRole('rowheader', { name: '总计' })).toBeTruthy();
  });
});

it('SPA uses a server aggregate provider and discards a stale response', async () => {
  const first = deferred<unknown>();
  const second = deferred<unknown>();
  const aggregate = vi.fn().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
  const view = render(PivotTable, { ...fields, scopeKey: 'alice:tenant1', resource: 'orders', provider: { aggregate } });
  expect(view.getByRole('status').textContent).toContain('Loading');
  await waitFor(() => expect(aggregate).toHaveBeenCalledTimes(1));
  await view.rerender({ scopeKey: 'bob:tenant2', rowField: 'department' });
  await waitFor(() => expect(aggregate).toHaveBeenCalledTimes(2));
  expect(aggregate).toHaveBeenLastCalledWith(expect.objectContaining({ resource: 'orders', rowField: 'department' }));
  second.resolve(payload('B', 7));
  await view.findByRole('rowheader', { name: 'B' });
  first.resolve(payload('A', 4));
  await first.promise;
  await Promise.resolve();
  expect(view.queryByRole('rowheader', { name: 'A' })).toBeNull();
  expect(view.container.querySelector('tfoot td:last-child')?.textContent?.trim()).toBe('7');
  await view.rerender({ rowField: 'r' });
  expect(view.queryByRole('table')).toBeNull();
  await view.rerender({ provider: undefined, data: [{ r: 'B', c: 'Y', v: 7 }] });
  expect(view.getByRole('rowheader', { name: 'B' })).toBeTruthy();
  expect(view.queryByRole('rowheader', { name: 'A' })).toBeNull();
});

it('SPA uses an explicit scope-aware cache only after permission and does not reuse another scope', async () => {
  const aggregate = vi.fn().mockResolvedValue(payload('Cached', 9));
  const values = new Map<string, unknown>();
  const cache = {
    providerKey: 'orders-api',
    get: vi.fn((key: string) => values.get(key)),
    set: vi.fn((key: string, value: unknown) => { values.set(key, value); }),
  };
  setAccessControlProvider({ can: vi.fn().mockResolvedValue({ can: true }) });
  const view = render(PivotTable, {
    ...fields, resource: 'orders', scopeKey: 'alice:tenant-a', provider: { aggregate }, cache,
  });
  await view.findByRole('rowheader', { name: 'Cached' });
  expect(aggregate).toHaveBeenCalledTimes(1);
  await view.rerender({ enabled: false });
  await view.rerender({ enabled: true });
  await view.findByRole('rowheader', { name: 'Cached' });
  expect(aggregate).toHaveBeenCalledTimes(1);
  expect(cache.get).toHaveBeenCalledTimes(2);
  await view.rerender({ scopeKey: 'bob:tenant-b' });
  await waitFor(() => expect(aggregate).toHaveBeenCalledTimes(2));
  expect(cache.get.mock.calls.at(-1)?.[0]).not.toBe(cache.get.mock.calls[0]?.[0]);
});

it('SPA never reads the aggregate cache when permission is denied', async () => {
  const aggregate = vi.fn().mockResolvedValue(payload());
  const cache = { providerKey: 'orders-api', get: vi.fn(() => payload('Private')), set: vi.fn() };
  setAccessControlProvider({ can: async () => ({ can: false }) });
  const view = render(PivotTable, {
    ...fields, resource: 'orders', scopeKey: 'a', provider: { aggregate }, cache,
  });
  await view.findByRole('alert');
  expect(cache.get).not.toHaveBeenCalled();
  expect(cache.set).not.toHaveBeenCalled();
  expect(aggregate).not.toHaveBeenCalled();
});

it('SPA does not aggregate or cache after an obsolete cache miss completes', async () => {
  const old = deferred<unknown>();
  const aggregate = vi.fn().mockResolvedValue(payload('Current'));
  const cache = {
    providerKey: 'orders-api',
    get: vi.fn().mockReturnValueOnce(old.promise).mockResolvedValue(undefined),
    set: vi.fn(),
  };
  const view = render(PivotTable, {
    ...fields, resource: 'orders', scopeKey: 'old', provider: { aggregate }, cache,
  });
  await waitFor(() => expect(cache.get).toHaveBeenCalledTimes(1));
  await view.rerender({ scopeKey: 'current' });
  await view.findByRole('rowheader', { name: 'Current' });
  old.resolve(undefined);
  await old.promise;
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(aggregate).toHaveBeenCalledTimes(1);
  expect(cache.set).toHaveBeenCalledTimes(1);
  expect(cache.set.mock.calls[0]?.[0]).toBe(cache.get.mock.calls[1]?.[0]);
});

it('SPA treats cache failures as misses without concealing valid provider data', async () => {
  const aggregate = vi.fn().mockResolvedValue(payload('Fresh'));
  const cache = {
    providerKey: 'orders-api',
    get: vi.fn().mockRejectedValue(new Error('private-cache-detail')),
    set: vi.fn().mockRejectedValue(new Error('private-cache-write')),
  };
  const view = render(PivotTable, {
    ...fields, resource: 'orders', scopeKey: 'a', provider: { aggregate }, cache,
  });
  await view.findByRole('rowheader', { name: 'Fresh' });
  expect(view.queryByRole('alert')).toBeNull();
  expect(cache.set).toHaveBeenCalledTimes(1);
});

it.each(['tenant', 'auth'] as const)('SPA isolates cached results when %s changes with a fixed business scope', async change => {
  const client = new QueryClient();
  sessionClients.push(client);
  const authProvider: AuthProvider = {
    login: async () => ({ success: true }), logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
  };
  const values = new Map<string, unknown>();
  const cache = {
    providerKey: 'orders-api', get: vi.fn((key: string) => values.get(key)),
    set: vi.fn((key: string, value: unknown) => { values.set(key, value); }),
  };
  const aggregate = vi.fn().mockResolvedValueOnce(payload('Old')).mockResolvedValue(payload('New'));
  const view = render(PivotSessionHost, {
    client, authProvider, settings: {
      ...fields, resource: 'orders', scopeKey: 'fixed', provider: { aggregate }, cache,
    },
  });
  await view.findByRole('rowheader', { name: 'Old' });
  await view.rerender(change === 'tenant' ? { tenant: 'second' } : { authProvider: { ...authProvider } });
  await view.findByRole('rowheader', { name: 'New' });
  expect(view.queryByRole('rowheader', { name: 'Old' })).toBeNull();
  expect(aggregate).toHaveBeenCalledTimes(2);
  expect(cache.get.mock.calls[0]?.[0]).not.toBe(cache.get.mock.calls[1]?.[0]);
});

it('SPA hides results and rejects a late aggregate during and after logout', async () => {
  const client = new QueryClient();
  sessionClients.push(client);
  const pending = deferred<unknown>();
  const logout = deferred<{ success: boolean }>();
  const logoutCall = vi.fn(() => logout.promise);
  const cache = { providerKey: 'orders-api', get: vi.fn(() => undefined), set: vi.fn() };
  const aggregate = vi.fn(() => pending.promise);
  const view = render(PivotSessionHost, {
    client, authProvider: {
      login: async () => ({ success: true }), logout: logoutCall,
      check: async () => ({ authenticated: true }),
    },
    settings: { ...fields, resource: 'orders', scopeKey: 'fixed', provider: { aggregate }, cache },
  });
  await waitFor(() => expect(aggregate).toHaveBeenCalledTimes(1));
  await fireEvent.click(view.getByRole('button', { name: 'Test logout' }));
  await waitFor(() => expect(logoutCall).toHaveBeenCalledTimes(1));
  await view.findByRole('alert');
  pending.resolve(payload('Private'));
  await pending.promise;
  logout.resolve({ success: true });
  await logout.promise;
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(view.queryByRole('table')).toBeNull();
  expect(cache.set).not.toHaveBeenCalled();
  expect(aggregate).toHaveBeenCalledTimes(1);
});

it('SPA retries failed aggregation without exposing provider errors and blocks missing or disabled scopes', async () => {
  const aggregate = vi.fn().mockRejectedValueOnce(new Error('private-db-secret')).mockResolvedValue(payload());
  const view = render(PivotTable, { ...fields, resource: 'orders', provider: { aggregate } });
  expect(view.getByRole('alert')).toBeTruthy();
  expect(aggregate).not.toHaveBeenCalled();
  await view.rerender({ scopeKey: 'alice', enabled: false });
  expect(aggregate).not.toHaveBeenCalled();
  await view.rerender({ enabled: true });
  await view.findByRole('alert');
  expect(view.container.textContent).not.toContain('private-db-secret');
  await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
  await view.findByRole('table');
  expect(aggregate).toHaveBeenCalledTimes(2);
  await view.rerender({ enabled: false });
  expect(view.queryByRole('table')).toBeNull();
});

it('SPA checks resource visibility before aggregate and does not dispatch when denied', async () => {
  const aggregate = vi.fn().mockResolvedValue(payload());
  setAccessControlProvider({ can: vi.fn().mockResolvedValue({ can: false, reason: 'private' }) });
  const view = render(PivotTable, {
    ...fields, resource: 'orders', scopeKey: 'tenant-a:orders',
    provider: { aggregate },
  });
  expect(await view.findByRole('alert')).toBeTruthy();
  expect(view.getByRole('alert').textContent).toContain('You do not have access');
  expect(aggregate).not.toHaveBeenCalled();
    expect(view.container.textContent).not.toContain('private');
  });


it('SPA exposes scoped typed drill-down values without leaking mutable inputs', async () => {
  const onDrillDown = vi.fn();
  const filters = [{ field: 'status', operator: 'eq' as const, value: 'paid' }];
  const view = render(PivotTable, {
    ...fields, resource: 'orders', scopeKey: 'tenant-a:orders', filters,
    provider: { aggregate: vi.fn().mockResolvedValue(payload('A', 4)) }, onDrillDown,
  });
  await view.findByRole('table');
  await fireEvent.click(view.getByRole('button', { name: /Drill down: A \/ X/ }));
  expect(onDrillDown).toHaveBeenCalledWith(expect.objectContaining({
    resource: 'orders', scopeKey: 'tenant-a:orders',
    row: expect.objectContaining({ value: 'A' }),
    column: expect.objectContaining({ value: 'X' }),
    filters: [
      ...filters,
      { field: 'r', operator: 'eq', value: 'A' },
      { field: 'c', operator: 'eq', value: 'X' },
    ],
  }));
  const received = onDrillDown.mock.calls[0]?.[0];
  if (!received) throw new Error('Missing drill-down payload');
  received.filters[0]!.value = 'mutated';
  expect(filters[0]!.value).toBe('paid');
});

it('SPA sanitizes permission transport errors without dispatching aggregation', async () => {
  setAccessControlProvider({ can: async () => { throw new Error('private-policy-secret'); } });
  const aggregate = vi.fn();
  const view = render(PivotTable, {
    ...fields, resource: 'orders', scopeKey: 'a', provider: { aggregate },
  });
  await view.findByRole('alert');
  expect(aggregate).not.toHaveBeenCalled();
  expect(view.container.textContent).not.toContain('private-policy-secret');
  expect(view.getByRole('button', { name: 'Retry' })).toBeTruthy();
});

it('SPA does not dispatch an aggregate after its permission check becomes obsolete', async () => {
  const pending = deferred<{ can: boolean }>();
  const can = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue({ can: true });
  setAccessControlProvider({ can });
  const aggregate = vi.fn().mockResolvedValue(payload('Current'));
  const view = render(PivotTable, {
    ...fields, resource: 'orders', scopeKey: 'a', provider: { aggregate },
  });
  await waitFor(() => expect(can).toHaveBeenCalledTimes(1));
  await view.rerender({ scopeKey: 'b', filters: [{ field: 'tenant', operator: 'eq', value: 'b' }] });
  await view.findByRole('table');
  pending.resolve({ can: true });
  await pending.promise;
  await Promise.resolve();
  expect(aggregate).toHaveBeenCalledTimes(1);
  expect(aggregate).toHaveBeenCalledWith(expect.objectContaining({
    filters: [{ field: 'tenant', operator: 'eq', value: 'b' }],
  }));
});

it('SPA hides the previous aggregate when the permission provider is replaced with a denial', async () => {
  setAccessControlProvider({ can: async () => ({ can: true }) });
  const aggregate = vi.fn().mockResolvedValue(payload('Private'));
  const view = render(PivotTable, {
    ...fields, resource: 'orders', scopeKey: 'a', provider: { aggregate },
  });
  await view.findByRole('table');
  setAccessControlProvider({ can: async () => ({ can: false }) });
  await view.findByRole('alert');
  expect(view.queryByRole('table')).toBeNull();
  expect(view.container.textContent).not.toContain('Private');
  expect(aggregate).toHaveBeenCalledTimes(1);
});

it('SPA retry calls the host once', async () => {
  const onRetry = vi.fn();
  const view = render(PivotTable, { ...fields, data, error: 'Failed', onRetry });
  await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

it('Lite retry is a safe native link without client event handlers', async () => {
  const view = render(LitePivotTable, { ...fields, data, error: 'Failed', retryHref: '/reports?retry=1' });
  expect(view.getByRole('link', { name: 'Retry' }).getAttribute('href')).toBe('/reports?retry=1');
  for (const retryHref of ['javascript:alert(1)', '//evil.example', '/\\evil.example', '/\tevil.example']) {
    await view.rerender({ retryHref });
    expect(view.queryByRole('link')).toBeNull();
  }
});

it('Lite export is a safe native link without client event handlers', async () => {
  const view = render(LitePivotTable, { ...fields, data, exportHref: '/reports/pivot-export?format=xlsx' });
  expect(view.getByRole('link', { name: 'Export' }).getAttribute('href')).toBe('/reports/pivot-export?format=xlsx');
  for (const exportHref of ['javascript:alert(1)', '//evil.example', '/\\evil.example', '/\tevil.example']) {
    await view.rerender({ exportHref });
    expect(view.queryByRole('link', { name: 'Export' })).toBeNull();
  }
});

it('Lite drilldown is a safe native link with a validated request', async () => {
  const hrefs: unknown[] = [];
  const view = render(LitePivotTable, {
    ...fields, resource: 'orders', scopeKey: 'tenant-a:orders',
    data, drilldownHref: input => {
      hrefs.push(input);
      return '/orders?drill=1';
    },
  });
  const link = await view.findByRole('link', { name: /Drill down: A \/ X/ });
  expect(link.getAttribute('href')).toBe('/orders?drill=1');
  expect(hrefs[0]).toEqual(expect.objectContaining({
    resource: 'orders', scopeKey: 'tenant-a:orders',
    row: expect.objectContaining({ value: 'A' }),
    column: expect.objectContaining({ value: 'X' }),
  }));
  await view.rerender({ drilldownHref: () => 'javascript:alert(1)' });
  expect(view.queryByRole('link', { name: /Drill down/ })).toBeNull();
});

it('Lite drilldown requires explicit scope and resource and contains callback failures', async () => {
  const drilldownHref = vi.fn(() => '/orders');
  const view = render(LitePivotTable, { ...fields, data, drilldownHref });
  expect(drilldownHref).not.toHaveBeenCalled();
  expect(view.queryByRole('link')).toBeNull();
  await view.rerender({ resource: 'orders', scopeKey: ' ' });
  expect(drilldownHref).not.toHaveBeenCalled();
  await view.rerender({ scopeKey: 'tenant-a', drilldownHref: () => { throw new Error('private'); } });
  expect(view.getByRole('table')).toBeTruthy();
  expect(view.queryByRole('link')).toBeNull();
  expect(view.container.textContent).not.toContain('private');
  for (const href of ['//evil.example', '/\\evil.example', '/\tevil.example', 'https://evil.example']) {
    await view.rerender({ drilldownHref: () => href });
    expect(view.queryByRole('link')).toBeNull();
  }
  await view.rerender({ drilldownHref, loading: true });
  expect(view.queryByRole('link')).toBeNull();
  expect(drilldownHref).not.toHaveBeenCalled();
});
