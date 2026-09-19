import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  checkedSvarColumns, buildSvarColumns, projectSvarRows, nextSvarSort, nextSvarFilter,
  svarSortMarks, svarFilterValues, svarColumnId, installSvarGuards, SVAR_BLOCKED_ACTIONS,
  type SvarColumn, type SvarGridApi, type SvarSort, type SvarTextFilter,
} from './svar-grid-contract.js';

const columns: SvarColumn[] = [
  { key: 'name', label: 'Name', sortable: true, filterable: true },
  { key: 'stock', label: 'Stock', sortable: true, width: 120 },
];
function bus() {
  const handlers = new Map<string, (event: unknown) => false | void>();
  const api: SvarGridApi = { intercept(action, handler) { handlers.set(action, handler); } };
  return { api, dispatch(action: string, event: unknown = {}) { return handlers.get(action)?.(event); } };
}

describe('SVAR adapter data boundary', () => {
  it('projects only declared columns and strips arbitrary engine configuration', () => {
    const checked = checkedSvarColumns([{ ...columns[0], key: 'name', label: 'Name', editor: 'text' } as SvarColumn]);
    const config = buildSvarColumns(checked, false);
    assert.equal('editor' in (config[0] ?? {}), false);
    const rows = projectSvarRows([{ id: 1, name: 'Visible', secret: 'never-forward', open: true, rowHeight: 999 }], checked);
    assert.deepEqual(rows, [{ id: 'n:1', [svarColumnId('name')]: 'Visible' }]);
  });
  it('does not mutate frozen host data when a grid changes its copied rows', () => {
    const record = Object.freeze({ id: 1, name: 'Original' });
    const input = Object.freeze([record]);
    const rows = projectSvarRows(input, columns);
    const row = rows[0];
    assert.ok(row);
    row[svarColumnId('name')] = 'Edited';
    assert.equal(input[0]?.name, 'Original');
  });
  it('keeps numeric and string IDs distinct and accepts zero', () => {
    const rows = projectSvarRows([{ id: 0 }, { id: 1 }, { id: '1' }], columns);
    assert.deepEqual(rows.map(row => row.id), ['n:0', 'n:1', 's:1']);
  });
  it('uses a custom primary key without replacing its visible value', () => {
    const rows = projectSvarRows([{ uuid: 'abc', name: 'One' }], [{ key: 'uuid', label: 'ID' }], 'uuid');
    assert.equal(rows[0]?.id, 's:abc');
    assert.equal(rows[0]?.[svarColumnId('uuid')], 'abc');
  });
  it('rejects unstable, missing, and duplicate IDs', () => {
    for (const id of [undefined, null, '', NaN, Infinity, {}, true]) {
      assert.throws(() => projectSvarRows([{ id }], columns));
    }
    assert.throws(() => projectSvarRows([{ id: 1 }, { id: 1 }], columns));
  });
  it('maps children to SVAR trees and starts collapsed', () => {
    const input = [{ id: 1, name: 'Parent', children: [{ id: 2, name: 'Child' }] }];
    const rows = projectSvarRows(input, columns, 'id', 'children');
    assert.equal(rows[0]?.open, false);
    assert.equal(rows[0]?.data?.[0]?.id, 'n:2');
    const original = input[0];
    assert.ok(original);
    assert.equal('open' in original, false);
    assert.equal(buildSvarColumns(columns, true)[0]?.treetoggle, true);
    assert.equal(buildSvarColumns(columns, true)[1]?.treetoggle, false);
  });
  it('does not mistake ordinary data/open fields for tree configuration', () => {
    const config = [{ key: 'data', label: 'Data' }, { key: 'open', label: 'Open' }];
    const row = projectSvarRows([{ id: 1, data: 'value', open: true }], config)[0];
    assert.ok(row);
    assert.equal(row.data, undefined);
    assert.equal(row.open, undefined);
    assert.equal(row[svarColumnId('data')], 'value');
  });
  it('rejects duplicate IDs across tree branches', () => {
    assert.throws(() => projectSvarRows([{ id: 1, children: [{ id: 1 }] }], columns, 'id', 'children'));
  });
  it('rejects cyclic or malformed trees', () => {
    const root: Record<string, unknown> = { id: 1 };
    root['children'] = [root];
    assert.throws(() => projectSvarRows([root], columns, 'id', 'children'));
    assert.throws(() => projectSvarRows([{ id: 1, children: {} }], columns, 'id', 'children'));
  });
  it('refuses accessors without invoking them', () => {
    let calls = 0;
    const input = { id: 1, get name() { calls++; return 'secret'; } };
    assert.throws(() => projectSvarRows([input], columns));
    assert.equal(calls, 0);
  });
  it('never calls complex field value converters', () => {
    const value = { toString() { throw new Error('called'); }, toJSON() { throw new Error('called'); } };
    assert.equal(projectSvarRows([{ id: 1, name: value }], columns)[0]?.[svarColumnId('name')], '—');
  });
  it('preserves scalar types and treats HTML as text rather than an engine template', () => {
    const row = projectSvarRows([{ id: 1, name: '<img src=x onerror=alert(1)>', stock: 12 }], columns)[0];
    assert.equal(row?.[svarColumnId('stock')], 12);
    assert.equal(row?.[svarColumnId('name')], '<img src=x onerror=alert(1)>');
    assert.equal('template' in (buildSvarColumns(columns, false)[0] ?? {}), false);
  });
  it('rejects empty, duplicate, reserved, or invalid-width columns', () => {
    assert.throws(() => checkedSvarColumns([]));
    assert.throws(() => checkedSvarColumns([{ key: 'a', label: 'A' }, { key: 'a', label: 'A' }]));
    for (const key of ['__proto__', 'constructor', 'prototype', '']) assert.throws(() => checkedSvarColumns([{ key, label: 'X' }]));
    for (const width of [0, -1, Infinity, NaN, 9999]) assert.throws(() => checkedSvarColumns([{ key: 'a', label: 'A', width }]));
  });
});

describe('SVAR server query translation', () => {
  it('translates single sorting and toggles from a missing upstream order', () => {
    const key = svarColumnId('name');
    assert.deepEqual(nextSvarSort({ key }, columns, []), [{ field: 'name', order: 'asc' }]);
    assert.deepEqual(nextSvarSort({ key }, columns, [{ field: 'name', order: 'asc' }]), [{ field: 'name', order: 'desc' }]);
  });
  it('preserves multi-sort priority without mutating host state', () => {
    const current: SvarSort[] = [{ field: 'name', order: 'asc' }, { field: 'stock', order: 'desc' }];
    assert.deepEqual(nextSvarSort({ key: svarColumnId('name'), order: 'desc', add: true }, columns, current), [
      { field: 'name', order: 'desc' }, { field: 'stock', order: 'desc' },
    ]);
    assert.equal(current[0]?.order, 'asc');
    assert.equal(nextSvarSort({ key: svarColumnId('name'), add: false }, columns, current)?.length, 1);
  });
  it('rejects malformed/unknown sorting instead of executing arbitrary sort callbacks', () => {
    for (const event of [null, [], { key: 'secret' }, { key: svarColumnId('name'), order: 'DROP' }, { key: svarColumnId('name'), add: 2 }, { sort: () => 0 }]) {
      assert.equal(nextSvarSort(event, columns, []), undefined);
    }
    assert.equal(nextSvarSort({ key: svarColumnId('name') }, [{ key: 'name', label: 'Name' }], []), undefined);
  });
  it('adds/replaces/clears text filters while keeping other constraints', () => {
    const config = [...columns, { key: 'city', label: 'City', filterable: true }];
    const current: SvarTextFilter[] = [{ field: 'city', operator: 'contains', value: 'Tokyo' }];
    const next = nextSvarFilter({ key: svarColumnId('name'), value: 'Ada' }, config, current);
    assert.deepEqual(next, [...current, { field: 'name', operator: 'contains', value: 'Ada' }]);
    assert.deepEqual(nextSvarFilter({ key: svarColumnId('name'), value: '' }, config, next ?? []), current);
    assert.equal(current.length, 1);
  });
  it('rejects filter functions, unknown fields and non-text header filter values', () => {
    for (const event of [null, { filter: () => true }, { key: 'secret', value: 'x' }, { key: svarColumnId('name'), value: {} }, { key: svarColumnId('stock'), value: '1' }]) {
      assert.equal(nextSvarFilter(event, columns, []), undefined);
    }
  });
  it('maps controlled sort/filter state to internal column IDs', () => {
    assert.deepEqual(svarSortMarks([{ field: 'name', order: 'asc' }]), { [svarColumnId('name')]: { order: 'asc', index: 0 } });
    assert.deepEqual(svarFilterValues([{ field: 'name', operator: 'contains', value: 'Ada' }]), { [svarColumnId('name')]: 'Ada' });
  });
  it('blocks all write/export/print actions even in local mode', () => {
    const h = bus();
    installSvarGuards(h.api, { current: () => true, server: () => false, sort() {}, filter() {} });
    for (const action of SVAR_BLOCKED_ACTIONS) assert.equal(h.dispatch(action), false);
  });
  it('prevents current-page sorting/filtering in server mode and forwards exactly once', () => {
    const h = bus();
    const calls: string[] = [];
    installSvarGuards(h.api, { current: () => true, server: () => true, sort() { calls.push('sort'); }, filter() { calls.push('filter'); } });
    assert.equal(h.dispatch('sort-rows'), false);
    assert.equal(h.dispatch('filter-rows'), false);
    assert.deepEqual(calls, ['sort', 'filter']);
  });
  it('lets the real engine perform local sort/filter without server callbacks', () => {
    const h = bus();
    installSvarGuards(h.api, { current: () => true, server: () => false, sort() { assert.fail(); }, filter() { assert.fail(); } });
    assert.equal(h.dispatch('sort-rows'), undefined);
    assert.equal(h.dispatch('filter-rows'), undefined);
  });
  it('ignores events from a retired or disabled grid instance', () => {
    const h = bus();
    installSvarGuards(h.api, { current: () => false, server: () => true, sort() { assert.fail(); }, filter() { assert.fail(); } });
    assert.equal(h.dispatch('sort-rows'), false);
    assert.equal(h.dispatch('filter-rows'), false);
  });
});
