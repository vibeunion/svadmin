import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { checkedSvarSelection, svarRecordIndex, svarRecordKey, runSvarBatch, svarCsv } from './svar-grid-operations.js';
import { projectSvarRows, svarColumnId } from './svar-grid-contract.js';
import { checkedSvarInteractiveColumns, buildSvarInteractiveColumns, formatSvarValue, parseSvarCellEdit, installSvarInteractions, type SvarInteractiveApi, type SvarInteractiveColumn } from './svar-grid-interactions.js';

const columns: SvarInteractiveColumn[] = [{ key: 'name', label: 'Name', editable: 'text', sortable: true, filterable: true }, { key: 'amount', label: 'Amount', editable: 'number' }];
const records = [{ id: 1, name: 'Alice', amount: 2 }, { id: '1', name: 'Bob', amount: 3 }];

describe('SVAR scoped batch operations', () => {
  it('validates and deduplicates IDs without confusing number/string IDs', () => {
    assert.deepEqual(checkedSvarSelection([1, '1', 1]), [1, '1']);
    assert.throws(() => checkedSvarSelection(Array.from({ length: 101 }, (_, i) => i)));
    assert.throws(() => svarRecordKey(NaN));
    assert.throws(() => svarRecordKey(''));
  });
  it('preflights the entire selection before any write', async () => {
    const writes: (string | number)[] = [];
    const result = await runSvarBatch({ ids: [1, 2], current: () => true, authorize: async id => id === 1, write: async id => { writes.push(id); } });
    assert.deepEqual(writes, []);
    assert.equal(result.failed[0]?.id, 2);
    assert.deepEqual(result.skipped, [1]);
  });
  it('treats authorization exceptions as denial', async () => {
    let writes = 0;
    const result = await runSvarBatch({ ids: [1], current: () => true, authorize: async () => { throw new Error('offline'); }, write: async () => { writes++; } });
    assert.equal(writes, 0); assert.equal(result.failed.length, 1);
  });
  it('rechecks each record just before dispatch', async () => {
    let checks = 0;
    let writes = 0;
    const result = await runSvarBatch({ ids: [1], current: () => true, authorize: async () => ++checks === 1, write: async () => { writes++; } });
    assert.equal(checks, 2); assert.equal(writes, 0); assert.equal(result.failed.length, 1);
  });
  it('does not dispatch after the authorization scope changed', async () => {
    let current = true;
    let writes = 0;
    const result = await runSvarBatch({ ids: [1, 2], current: () => current, authorize: async () => { current = false; return true; }, write: async () => { writes++; } });
    assert.equal(writes, 0); assert.equal(result.cancelled, true); assert.deepEqual(result.skipped, [1, 2]);
  });
  it('stops the remaining batch when the first completed write changes scope', async () => {
    let current = true;
    const writes: (string | number)[] = [];
    const result = await runSvarBatch({ ids: [1, 2, 3], current: () => current, authorize: async () => true, write: async id => { writes.push(id); current = false; } });
    assert.deepEqual(writes, [1]); assert.deepEqual(result.succeeded, [1]); assert.deepEqual(result.skipped, [2, 3]); assert.equal(result.cancelled, true);
  });
  it('reports partial success without claiming atomic rollback', async () => {
    const result = await runSvarBatch({ ids: [1, 2, 3], current: () => true, authorize: async () => true, write: async id => { if (id === 2) throw new Error('network'); } });
    assert.deepEqual(result.succeeded, [1, 3]); assert.equal(result.failed[0]?.uncertain, true); assert.deepEqual(result.skipped, []);
  });
  it('retains a checked mutation input-failure certainty flag', async () => {
    const result = await runSvarBatch({ ids: [1], current: () => true, authorize: async () => true, write: async () => { throw Object.assign(new Error(), { details: { writeMayHaveSucceeded: false } }); } });
    assert.equal(result.failed[0]?.uncertain, false);
  });
  it('handles an empty selection without provider calls', async () => {
    const result = await runSvarBatch({ ids: [], current: () => true, authorize: async () => { throw new Error(); }, write: async () => { throw new Error(); } });
    assert.deepEqual(result.succeeded, []); assert.equal(result.cancelled, false);
  });
});

describe('SVAR exported and editable data', () => {
  it('indexes original typed IDs and rejects duplicate or missing IDs', () => {
    const index = svarRecordIndex(records);
    assert.equal(index.get('n:1')?.['name'], 'Alice'); assert.equal(index.get('s:1')?.['name'], 'Bob');
    assert.throws(() => svarRecordIndex([{ id: 1 }, { id: 1 }]));
    assert.throws(() => svarRecordIndex([{ name: 'missing' }]));
  });
  it('rejects cyclic child data', () => {
    const root: Record<string, unknown> = { id: 1 }; root['children'] = [root];
    assert.throws(() => svarRecordIndex([root], 'id', 'children'));
  });
  it('never calls ID accessors', () => {
    let calls = 0; const record = { get id() { calls++; return 1; } };
    assert.throws(() => svarRecordIndex([record])); assert.equal(calls, 0);
  });
  it('blocks undeclared editors and primary-key writes', () => {
    const index = svarRecordIndex(records);
    assert.equal(parseSvarCellEdit({ id: 'n:1', column: svarColumnId('secret'), value: 'x' }, columns, index, 'id'), undefined);
    assert.equal(parseSvarCellEdit({ id: 'n:999', column: svarColumnId('name'), value: 'x' }, columns, index, 'id'), undefined);
    assert.equal(parseSvarCellEdit({ id: 'n:1', column: svarColumnId('id'), value: 'x' }, [{ key: 'id', label: 'ID', editable: 'text' }], index, 'id'), undefined);
  });
  it('converts only explicitly numeric edits and rejects blank/non-finite values', () => {
    const index = svarRecordIndex(records);
    assert.deepEqual(parseSvarCellEdit({ id: 's:1', column: svarColumnId('amount'), value: '42' }, columns, index, 'id'), { id: '1', field: 'amount', value: 42 });
    for (const value of ['', 'NaN', 'Infinity', {}, true]) assert.throws(() => parseSvarCellEdit({ id: 'n:1', column: svarColumnId('amount'), value }, columns, index, 'id'));
  });
  it('projects only declared CSV columns and escapes values and headers', () => {
    const declared = [{ key: 'name', label: '=danger' }];
    const rows = projectSvarRows([{ id: 1, name: '="formula"', secret: 'hidden' }], declared);
    const csv = svarCsv(rows, declared);
    assert.ok(csv.includes('"\'=danger"')); assert.ok(csv.includes('"\'=""formula"""')); assert.ok(!csv.includes('hidden'));
  });
  it('defuses formula prefixes with whitespace/control characters', () => {
    for (const name of ['=cmd', '+cmd', '-cmd', '@cmd', '  =cmd', '\tcmd', '\r=cmd', '\n+cmd']) {
      const csv = svarCsv(projectSvarRows([{ id: 1, name }], columns), columns);
      assert.ok(csv.includes(`"'${name}"`));
    }
  });
  it('preserves real negative numbers as numbers instead of formula strings', () => {
    const csv = svarCsv(projectSvarRows([{ id: 1, name: 'a,b\nc', amount: -12 }], columns), columns);
    assert.ok(csv.includes('"-12"')); assert.ok(csv.includes('"a,b\nc"'));
  });
  it('exports loaded trees without invoking object coercion', () => {
    const data = [{ id: 1, name: { toString() { throw new Error('unsafe'); } }, children: [{ id: 2, name: 'Child' }] }];
    const csv = svarCsv(projectSvarRows(data, columns, 'id', 'children'), columns);
    assert.ok(csv.includes('Child')); assert.ok(csv.includes('—'));
  });
  it('validates typed formats and never forwards arbitrary template properties', () => {
    const raw = { key: 'name', label: 'Name', template: () => { throw new Error(); } };
    assert.equal('template' in checkedSvarInteractiveColumns([raw])[0]!, false);
    assert.equal(formatSvarValue(0.5, { key: 'x', label: 'X', format: 'percent' }, 'en-US'), '50%');
    assert.equal(formatSvarValue(true, { key: 'x', label: 'X', format: 'boolean' }, 'zh-CN'), '是');
    assert.equal(formatSvarValue('invalid', { key: 'x', label: 'X', format: 'date' }, 'en-US'), '—');
    assert.equal(buildSvarInteractiveColumns(columns, false, false, 'en-US')[0]?.editor, undefined);
    assert.equal(buildSvarInteractiveColumns(columns, false, true, 'en-US')[0]?.editor, 'text');
  });
});

describe('SVAR engine interaction boundaries', () => {
  function setup() {
    const guards = new Map<string, (event: unknown) => false | undefined>();
    const listeners = new Map<string, (event: unknown) => void>();
    const api: SvarInteractiveApi = { intercept: (key, fn) => { guards.set(key, fn); }, on: (key, fn) => { listeners.set(key, fn); }, getState: () => ({ selectedRows: ['n:1', 's:1', 'n:999'] }) };
    let current = true;
    const edits: unknown[] = [], selections: unknown[] = [];
    installSvarInteractions(api, {
      current: () => current, columns: () => columns, items: () => records,
      primaryKey: () => 'id', childrenKey: () => undefined, server: () => true,
      sorters: () => [], filters: () => [], sort: () => {}, filter: () => {},
      editable: () => true, edit: value => { edits.push(value); },
      selectable: () => true, selection: value => { selections.push(value); }, error: () => {},
    });
    return { guards, listeners, edits, selections, retire: () => { current = false; } };
  }
  it('always cancels native writes and forwards only a validated edit intent', () => {
    const h = setup();
    assert.equal(h.guards.get('update-cell')?.({ id: 'n:1', column: svarColumnId('name'), value: 'new' }), false);
    assert.deepEqual(h.edits, [{ id: 1, field: 'name', value: 'new' }]);
    for (const action of ['add-row', 'delete-row', 'update-row', 'copy-row', 'undo', 'redo', 'export-data', 'print']) assert.equal(h.guards.get(action)?.({}), false);
  });
  it('maps only existing selected IDs back to business IDs', () => {
    const h = setup(); h.listeners.get('select-row')?.({}); assert.deepEqual(h.selections, [[1, '1']]);
  });
  it('blocks stale editing and selection callbacks', () => {
    const h = setup(); h.retire();
    assert.equal(h.guards.get('open-editor')?.({ id: 'n:1', column: svarColumnId('name') }), false);
    h.guards.get('update-cell')?.({ id: 'n:1', column: svarColumnId('name'), value: 'new' });
    h.listeners.get('select-row')?.({}); assert.deepEqual(h.edits, []); assert.deepEqual(h.selections, []);
  });
});
