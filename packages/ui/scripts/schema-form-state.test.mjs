import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeSchemaForm, schemaFormArrayItem, schemaFormSnapshot,
  writeSchemaFormPath, schemaFormEnumIndex, schemaFormEnumValue, SCHEMA_FORM_LIMITS,
} from '../src/components/json-schema-form-state.ts';

const schema = { properties: {
  quota: { type: 'number', default: 10 },
  profile: { type: 'object', required: ['active'], properties: { active: { type: 'boolean' }, name: { type: 'string', default: 'Initial' } } },
  addresses: { type: 'array', items: { type: 'object', required: ['active'], properties: { active: { type: 'boolean' }, city: { type: 'string', default: 'Tokyo' } } } },
} };

test('nested missing defaults and required false initialize without mutating the host', () => {
  const input = Object.freeze({});
  const value = initializeSchemaForm(schema, input);
  assert.deepEqual(value, { quota: 10, profile: { active: false, name: 'Initial' }, addresses: [] });
  assert.deepEqual(input, {});
  assert.equal(initializeSchemaForm(schema, value), value);
});
for (const intentional of [undefined, null, false, 0, '']) {
  test(`explicit ${String(intentional)} does not become a default`, () => {
    const input = { quota: intentional, profile: { active: false, name: intentional }, addresses: [] };
    const value = initializeSchemaForm(schema, input);
    assert.equal(value, input);
    assert.equal(value.quota, intentional); assert.equal(value.profile.name, intentional);
  });
}
test('cleared nested numbers remain omitted in JSON after sibling edits', () => {
  const nested = { properties: { profile: { properties: { quota: { type: 'number', default: 10 }, name: { type: 'string' } } } } };
  let value = initializeSchemaForm(nested, {});
  value = writeSchemaFormPath(value, ['profile', 'quota'], undefined);
  value = writeSchemaFormPath(value, ['profile', 'name'], 'Changed');
  assert.ok(Object.hasOwn(initializeSchemaForm(nested, value).profile, 'quota'));
  assert.deepEqual(schemaFormSnapshot(initializeSchemaForm(nested, value)), { profile: { name: 'Changed' } });
});
test('array object children receive defaults and required false', () => {
  const item = schemaFormArrayItem(schema.properties.addresses.items);
  assert.deepEqual(item, { active: false, city: 'Tokyo' });
  const existing = initializeSchemaForm(schema, { addresses: [{ city: 'Kyoto' }] });
  assert.deepEqual(existing.addresses, [{ city: 'Kyoto', active: false }]);
});
test('default arrays are independently owned and initialized recursively', () => {
  const s = { properties: { rows: { ...schema.properties.addresses, default: [{}] } } };
  const first = initializeSchemaForm(s, {}), second = initializeSchemaForm(s, {});
  first.rows[0].city = 'Changed';
  assert.equal(second.rows[0].city, 'Tokyo'); assert.deepEqual(s.properties.rows.default, [{}]);
});
test('new numeric array item is not fabricated as zero; incomplete wire arrays are rejected', () => {
  assert.equal(schemaFormArrayItem({ type: 'number' }), undefined);
  assert.throws(() => schemaFormSnapshot({ values: [undefined] }));
  assert.throws(() => schemaFormSnapshot({ values: new Array(1) }));
  assert.deepEqual(schemaFormSnapshot({ values: [0, false, null, ''] }), { values: [0, false, null, ''] });
});
test('wire snapshots own nested object and array references and omit only undefined object fields', () => {
  const input = { profile: { name: 'Alice', omitted: undefined }, rows: [{ value: 1 }] };
  const payload = schemaFormSnapshot(input);
  payload.profile.name = 'Bob'; payload.rows[0].value = 2;
  assert.equal(input.profile.name, 'Alice'); assert.equal(input.rows[0].value, 1);
  assert.equal(Object.hasOwn(payload.profile, 'omitted'), false);
});
test('safe updates inside nested arrays preserve shape and undefined markers', () => {
  const before = { rows: [{ quota: undefined, name: 'A' }] };
  const after = writeSchemaFormPath(before, ['rows', '0', 'name'], 'B');
  assert.ok(Object.hasOwn(after.rows[0], 'quota')); assert.equal(after.rows[0].quota, undefined);
  assert.equal(before.rows[0].name, 'A'); assert.equal(after.rows[0].name, 'B');
});
const choices = [1, '1', null, 'null', false, 'false', ''];
for (const [index, choice] of choices.entries()) test(`enum index ${index} retains JSON identity`, () => {
  assert.equal(schemaFormEnumIndex(choices, choice), String(index));
  assert.equal(schemaFormEnumValue(choices, String(index)), choice);
});
test('empty enum selection means absence, not a fabricated string or null', () => {
  assert.equal(schemaFormEnumValue(choices, ''), undefined);
  assert.equal(schemaFormEnumIndex(choices, undefined), '');
  for (const index of ['-1', '01', '1.0', '7', 'NaN']) assert.throws(() => schemaFormEnumValue(choices, index));
});
test('non JSON and cyclic data cannot reach an executor', () => {
  const cyclic = {}; cyclic.self = cyclic;
  for (const value of [NaN, Infinity, 1n, () => {}, new Date(), new Map(), cyclic]) {
    assert.throws(() => schemaFormSnapshot({ value }));
  }
});
test('getters are rejected before invocation rather than evaluated while copying', () => {
  let reads = 0; const value = {};
  Object.defineProperty(value, 'secret', { enumerable: true, get() { reads++; return 'secret'; } });
  assert.throws(() => schemaFormSnapshot(value)); assert.equal(reads, 0);
});
test('prototype fields and invalid array paths are rejected', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    assert.throws(() => schemaFormSnapshot(JSON.parse(`{"${key}":{}}`)));
    assert.throws(() => writeSchemaFormPath({}, [key, 'polluted'], true));
    assert.throws(() => initializeSchemaForm({ properties: JSON.parse(`{"${key}":{"type":"string"}}`) }, {}));
  }
  for (const key of ['-1', '2', '1.5', '01']) assert.throws(() => writeSchemaFormPath({ rows: [0] }, ['rows', key], 2));
  assert.equal({}.polluted, undefined);
});
test('cyclic schemas and oversized values terminate with a clear failure', () => {
  const recursive = { properties: {} }; recursive.properties.self = recursive;
  assert.throws(() => initializeSchemaForm(recursive, {}));
  assert.throws(() => schemaFormSnapshot({ rows: new Array(SCHEMA_FORM_LIMITS.nodes + 1).fill(0) }));
  assert.throws(() => schemaFormSnapshot({ text: 'x'.repeat(SCHEMA_FORM_LIMITS.characters + 1) }));
});

// 明确的用户编辑可以创建之前为 null 的父对象，初始化本身则保留 null。
test('editing a child can materialize an explicitly empty parent without changing the original', () => {
  const original = { profile: null };
  const next = writeSchemaFormPath(original, ['profile', 'city'], 'Osaka');
  assert.deepEqual(next, { profile: { city: 'Osaka' } }); assert.equal(original.profile, null);
});
