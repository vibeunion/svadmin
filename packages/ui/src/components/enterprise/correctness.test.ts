import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { evaluateFormula, safeSpreadsheetCsvText } from './spreadsheet-formula.js';
import { readSchemaForm, schemaFormValues, validateSchemaForm, schemaFormSnapshot, parseSchemaNumber, enumIndex, enumValue } from './json-schema-form.js';
import { readFilterTree, compileFilterTree, parseFilterInput, FILTER_EDITOR_LIMITS } from './filter-tree.js';
import type { FieldDefinition, Filter } from '@svadmin/core';

const cells = { A1: '2', A2: '4', A3: '', A4: 'text', B1: '=A1+A2', B2: '=B1*2', C1: '0' };
const formulas: Array<[string, number | string]> = [
  ['plain text', 'plain text'], ['-42', '-42'], ['=1+2*3', 7], ['=(1+2)*3', 9], ['=8/4/2', 1], ['=10-3-2', 5],
  ['=--2 + -(3)', -1], ['=.5+1.5e2', 150.5], ['=a1+$A$2', 6], ['=B2+1', 13], ['=A4', 'text'], ['=A3', 0],
  ['=SUM(A1:A4)', 6], ['=SUM(A4:A1)', 6], ['=SUM(A1,2,B1*2)', 16], ['=SUM(A1,AVG(A1:A2))', 5],
  ['=AVG(A1:A4)', 3], ['=AVERAGE(A1:A4)', 3], ['=COUNT(A1:A4)', 2], ['=COUNT(A3:A4)', 0],
  ['=MIN(A1:A4)', 2], ['=MAX(A1:A4)', 4], ['=SUM()', 0], ['=MIN()', 0], ['=COUNT()', 0],
  ['=AVG(A3:A4)', '#DIV/0!'], ['=1/0', '#DIV/0!'], ['=SUM(1/0,2)', '#DIV/0!'], ['=1e309', '#NUM!'],
  ['=1e308*2', '#NUM!'], ['=A4+1', '#VALUE!'], ['=UNKNOWN(A1)', '#NAME?'], ['=SUM(A0:A1)', '#REF!'],
  ['=XFE1', '#REF!'], ['=A1048577', '#REF!'], ['=1 +', '#VALUE!'], ['=SUM(A1,)', '#VALUE!'],
  ['=1 garbage', '#VALUE!'], ['=1;globalThis.process.exit()', '#VALUE!'], ['=Math.random()', '#VALUE!'],
  ['=SUM(A1:A999999)', '#LIMIT!'], ['=' + '('.repeat(100) + '1' + ')'.repeat(100), '#LIMIT!'],
  ['=' + '-'.repeat(100) + '1', '#LIMIT!'], ['=' + '1+'.repeat(1500) + '1', '#LIMIT!'],
];

describe('bounded spreadsheet formulas', () => {
  for (const [formula, expected] of formulas) it(`evaluates ${formula.slice(0, 75)}`, () => assert.equal(evaluateFormula(formula, cells), expected));
  it('detects self reference', () => assert.equal(evaluateFormula('=A1', { A1: '=A1' }), '#CYCLE!'));
  it('detects indirect range cycles and propagates errors', () => assert.equal(evaluateFormula('=SUM(A1:A2)', { A1: '=B1', A2: '1', B1: '=A1' }), '#CYCLE!'));
  it('bounds dependency depth', () => {
    const chain: Record<string, string> = {};
    for (let i = 1; i <= 100; i++) chain[`A${i}`] = `=A${i + 1}`;
    chain['A101'] = '1';
    assert.equal(evaluateFormula('=A1', chain), '#LIMIT!');
  });
  it('does not confuse repeated dependencies with cycles', () => assert.equal(evaluateFormula('=SUM(B1,B1,B2)', cells), 24));
  it('does not reuse cached values across calls', () => {
    const data = { A1: '2' };
    assert.equal(evaluateFormula('=A1', data), 2);
    data.A1 = '3';
    assert.equal(evaluateFormula('=A1', data), 3);
  });
  it('does not access inherited cells', () => assert.equal(evaluateFormula('=A1', Object.create({ A1: '10' }) as Record<string, string>), 0));
  it('does not mutate the input map', () => { evaluateFormula('=B2', Object.freeze({ ...cells })); });
  it('matches independently calculated arithmetic cases', () => {
    for (let a = -8; a <= 8; a++) for (let b = 1; b <= 8; b++) {
      assert.equal(evaluateFormula(`=(${a}+${b})*${b}-${a}`, {}), (a + b) * b - a);
    }
  });
  for (const prefix of ['=', '+', '-', '@', ' =', '\t=', '\r', '\n', '\uFEFF@']) {
    it(`neutralizes CSV prefix ${JSON.stringify(prefix)}`, () => assert.equal(safeSpreadsheetCsvText(`${prefix}CMD()`), `'${prefix}CMD()`));
  }
  it('preserves ordinary CSV text', () => assert.equal(safeSpreadsheetCsvText('ACME "Tokyo", 42'), 'ACME "Tokyo", 42'));
});

describe('schema form value correctness', () => {
  const model = readSchemaForm({ type: 'object', required: ['amount', 'enabled'], properties: {
    amount: { type: 'number', default: 0, minimum: 0, maximum: 100 },
    enabled: { type: 'boolean', default: false },
    plan: { type: 'integer', enum: [1, 2], default: 1 },
    note: { type: 'string', default: '' },
  } });
  it('materializes exactly the defaults shown by the form', () => assert.deepEqual(schemaFormValues(model, {}), { amount: 0, enabled: false, plan: 1, note: '' }));
  it('does not mutate schema or caller data', () => {
    const input = Object.freeze({ amount: 12 });
    assert.equal(schemaFormValues(model, input)['amount'], 12);
    assert.deepEqual(input, { amount: 12 });
  });
  it('respects an explicit clear instead of restoring the default', () => {
    const value = schemaFormValues(model, { amount: undefined });
    assert.equal(value['amount'], undefined);
    assert.ok(validateSchemaForm(model, value).some((issue) => issue.path === '/amount' && issue.code === 'required'));
  });
  it('keeps false, zero and empty-string defaults valid', () => assert.deepEqual(validateSchemaForm(model, schemaFormValues(model, {})), []));
  it('does not replace an explicit null with a default', () => assert.equal(schemaFormValues(model, { amount: null })['amount'], null));
  it('keeps number enums numeric', () => assert.equal(enumValue([1, 2], '1'), 2));
  it('distinguishes strings, numbers, false and null in enums', () => {
    const options = [1, '1', false, null];
    options.forEach((option, index) => assert.equal(enumValue(options, enumIndex(options, option)), options[index]));
  });
  it('does not turn empty enum selection into index zero', () => assert.equal(enumValue([1, 2], ''), undefined));
  for (const value of ['-1', '1.1', '2', '01', 'oops']) it(`rejects invalid enum index ${value}`, () => assert.throws(() => enumValue([1, 2], value)));
  it('does not submit a numeric enum as a string', () => assert.ok(validateSchemaForm(model, { amount: 1, enabled: false, plan: '1' }).some((issue) => issue.code === 'type')));
  it('does not turn empty numeric input into zero', () => assert.equal(parseSchemaNumber(''), undefined));
  it('preserves typed zero', () => assert.equal(parseSchemaNumber('0'), 0));
  it('accepts finite exponent notation', () => assert.equal(parseSchemaNumber('1.2e2'), 120));
  for (const value of ['NaN', 'Infinity', '1e309', '0x10', '1x', '--1']) it(`rejects invalid numeric input ${value}`, () => assert.throws(() => parseSchemaNumber(value)));
  it('validates integer values and bounds', () => {
    const integer = readSchemaForm({ properties: { count: { type: 'integer', minimum: 1, maximum: 5 } } });
    for (const count of [0, 6, 1.5, Infinity]) assert.notEqual(validateSchemaForm(integer, { count }).length, 0);
  });
  it('validates decimal multiples without treating 0.3 as invalid', () => {
    const decimal = readSchemaForm({ properties: { amount: { type: 'number', multipleOf: 0.1 } } });
    assert.deepEqual(validateSchemaForm(decimal, { amount: 0.3 }), []);
    assert.ok(validateSchemaForm(decimal, { amount: 0.35 }).some((issue) => issue.code === 'multipleOf'));
  });
  it('supports nullable scalar values', () => assert.deepEqual(validateSchemaForm(readSchemaForm({ properties: { note: { type: ['string', 'null'] } } }), { note: null }), []));
  it('counts string code points', () => {
    const text = readSchemaForm({ properties: { note: { type: 'string', minLength: 1, maxLength: 1 } } });
    assert.deepEqual(validateSchemaForm(text, { note: '😀' }), []);
    assert.ok(validateSchemaForm(text, { note: 'ab' }).length);
  });
  it('refuses unsupported nested fields rather than stringify them', () => assert.ok(readSchemaForm({ properties: { obj: { type: 'object', properties: {} } } }).issues.length));
  for (const keyword of ['$ref', 'allOf', 'anyOf', 'if', 'dependentRequired']) it(`refuses unsupported root assertion ${keyword}`, () => assert.ok(readSchemaForm({ [keyword]: {} }).issues.length));
  it('refuses unsupported regex assertions', () => assert.ok(readSchemaForm({ properties: { text: { type: 'string', pattern: '.*' } } }).issues.length));
  it('rejects non-finite defaults', () => assert.ok(readSchemaForm({ properties: { n: { type: 'number', default: Infinity } } }).issues.length));
  it('rejects unknown required fields', () => assert.ok(readSchemaForm({ required: ['missing'], properties: {} }).issues.length));
  it('enforces additionalProperties false', () => assert.ok(validateSchemaForm(readSchemaForm({ additionalProperties: false, properties: {} }), { extra: 1 }).some((issue) => issue.code === 'additionalProperties')));
  it('snapshots submitted data independently and omits explicit clears', () => {
    const input = { x: undefined, hidden: { a: 1 } };
    const snapshot = schemaFormSnapshot(input);
    (snapshot['hidden'] as { a: number }).a = 2;
    assert.deepEqual(input.hidden, { a: 1 });
    assert.equal(Object.hasOwn(snapshot, 'x'), false);
  });
  it('rejects sparse arrays instead of exporting implicit nulls', () => assert.throws(() => schemaFormSnapshot({ list: Array(3) })));
  it('rejects null schema metadata', () => {
    assert.ok(readSchemaForm({ properties: null }).issues.length);
    assert.ok(readSchemaForm({ properties: { bad: { type: null } } }).issues.length);
  });
  it('rejects cyclic data', () => { const value: Record<string, unknown> = {}; value['cycle'] = value; assert.throws(() => schemaFormSnapshot(value)); });
  it('rejects non-JSON values instead of silently converting them', () => {
    for (const invalid of [NaN, Infinity, BigInt(1), new Date(), () => 1, [undefined]]) assert.throws(() => schemaFormSnapshot({ invalid }));
  });
  it('rejects prototype keys', () => assert.throws(() => schemaFormSnapshot(JSON.parse('{"__proto__":{"admin":true}}') as Record<string, unknown>)));
});

const fields: FieldDefinition[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'enabled', label: 'Enabled', type: 'boolean' },
  { key: 'plan', label: 'Plan', type: 'select', options: [{ label: 'One', value: 1 }, { label: 'Two', value: 2 }] },
  { key: 'secret', label: 'Secret', type: 'text', filterable: false },
];
function roundtrip(filters: Filter[]): Filter[] {
  const read = readFilterTree(filters);
  assert.equal(read.ok, true);
  if (!read.ok) throw new Error('read failed');
  const compiled = compileFilterTree(read.root, fields);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) throw new Error('compile failed');
  return compiled.filters;
}

describe('lossless recursive filters', () => {
  const leaf: Filter = { field: 'name', operator: 'contains', value: 'Ada' };
  const nested: Filter[] = [leaf, { operator: 'or', value: [
    { field: 'enabled', operator: 'eq', value: false },
    { operator: 'and', value: [{ field: 'amount', operator: 'between', value: [0, 10] }, { field: 'plan', operator: 'in', value: [1, 2] }] },
  ] }];
  it('preserves mixed nested AND/OR without flattening', () => assert.deepEqual(roundtrip(nested), nested));
  it('preserves explicit root AND wrapping', () => assert.deepEqual(roundtrip([{ operator: 'and', value: [leaf] }]), [{ operator: 'and', value: [leaf] }]));
  it('preserves explicit root OR wrapping', () => assert.deepEqual(roundtrip([{ operator: 'or', value: [leaf] }]), [{ operator: 'or', value: [leaf] }]));
  it('preserves the empty query', () => assert.deepEqual(roundtrip([]), []));
  it('preserves intentional empty-string equality', () => assert.deepEqual(roundtrip([{ field: 'name', operator: 'eq', value: '' }]), [{ field: 'name', operator: 'eq', value: '' }]));
  it('roundtrips a family of deep trees', () => {
    for (let depth = 0; depth < 10; depth++) {
      let tree: Filter = leaf;
      for (let n = 0; n < depth; n++) tree = { operator: n % 2 ? 'and' : 'or', value: [tree, { field: 'amount', operator: 'gt', value: n }] };
      assert.deepEqual(roundtrip([tree]), [tree]);
    }
  });
  it('does not mutate caller arrays through the editor', () => {
    const input: Filter[] = [{ field: 'plan', operator: 'in', value: [1, 2] }];
    const read = readFilterTree(input);
    if (!read.ok) throw new Error('read failed');
    const node = read.root.children[0];
    if (node?.kind !== 'rule' || !Array.isArray(node.value)) throw new Error('rule missing');
    node.value.push(3);
    assert.deepEqual(input, [{ field: 'plan', operator: 'in', value: [1, 2] }]);
  });
  for (const invalid of [
    [{ field: 'missing', operator: 'eq', value: 'x' }],
    [{ field: 'secret', operator: 'eq', value: 'x' }],
    [{ field: 'amount', operator: 'contains', value: '1' }],
    [{ field: 'amount', operator: 'eq', value: '1' }],
    [{ field: 'enabled', operator: 'eq', value: 'false' }],
    [{ field: 'plan', operator: 'eq', value: '1' }],
    [{ field: 'amount', operator: 'between', value: [1] }],
    [{ field: 'amount', operator: 'between', value: [10, 1] }],
    [{ field: 'plan', operator: 'in', value: [] }],
    [{ operator: 'or', value: [] }],
  ]) it(`blocks invalid filters ${JSON.stringify(invalid)}`, () => {
    const read = readFilterTree(invalid);
    assert.equal(read.ok, true);
    if (read.ok) assert.equal(compileFilterTree(read.root, fields).ok, false);
  });
  it('accepts explicit null checks', () => assert.deepEqual(roundtrip([{ field: 'name', operator: 'null', value: null }]), [{ field: 'name', operator: 'null', value: null }]));
  it('rejects unsupported input instead of dropping a branch', () => assert.equal(readFilterTree([leaf, { operator: 'not', value: [leaf] }]).ok, false));
  it('rejects non-JSON filter values', () => assert.equal(readFilterTree([{ field: 'amount', operator: 'eq', value: Infinity }]).ok, false));
  it('rejects cyclic query trees', () => { const cycle: { operator: string; value: unknown[] } = { operator: 'and', value: [] }; cycle.value.push(cycle); assert.equal(readFilterTree([cycle]).ok, false); });
  it('limits node count', () => assert.equal(readFilterTree(Array.from({ length: FILTER_EDITOR_LIMITS.nodes + 1 }, () => leaf)).ok, false));
  it('limits nesting depth', () => { let tree: Filter = leaf; for (let n = 0; n < 20; n++) tree = { operator: 'or', value: [tree] }; assert.equal(readFilterTree([tree]).ok, false); });
  it('preserves typed numeric zero input', () => assert.equal(parseFilterInput('0', { type: 'number' }, 'eq'), 0));
  it('preserves typed boolean false input', () => assert.equal(parseFilterInput('false', { type: 'boolean' }, 'eq'), false));
  it('parses collection values as JSON, not comma-split strings', () => assert.deepEqual(parseFilterInput('[1,2]', { type: 'number' }, 'between'), [1, 2]));
  it('does not accept trailing junk in numeric filters', () => assert.throws(() => parseFilterInput('1x', { type: 'number' }, 'eq')));
});
