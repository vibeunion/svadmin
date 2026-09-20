import { describe, expect, it } from 'vitest';
import { readRecursiveSchemaForm, validateRecursiveSchemaForm } from './recursive-schema-form.js';
import { initializeSchemaForm, schemaFormSnapshot } from '../json-schema-form-state.js';
import { compileFilterTree, readFilterTree, type FilterRuleNode } from './filter-tree.js';
import type { FieldDefinition, Filter } from '@svadmin/core';

const nested = { type: 'object', additionalProperties: false, required: ['account', 'items'], properties: {
  account: { type: 'object', required: ['enabled', 'amount'], properties: {
    enabled: { type: 'boolean', default: false },
    amount: { type: 'number', minimum: 0, multipleOf: 0.1, default: 0.3 },
  } },
  items: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'object', required: ['plan'], properties: {
    plan: { type: 'integer', enum: [1, 2] },
  } } },
} };

describe('recursive form integration', () => {
  it('uses the existing initializer and validates nested false, decimals and typed enums', () => {
    const model = readRecursiveSchemaForm(nested);
    expect(model.issues).toEqual([]);
    const value = initializeSchemaForm(nested, { items: [{ plan: 2 }] });
    expect(value).toEqual({ account: { enabled: false, amount: 0.3 }, items: [{ plan: 2 }] });
    expect(validateRecursiveSchemaForm(model, value)).toEqual([]);
  });
  it('does not treat cleared required values as zero or restore defaults during validation', () => {
    const value = { account: { enabled: false, amount: undefined }, items: [{ plan: 1 }] };
    expect(validateRecursiveSchemaForm(readRecursiveSchemaForm(nested), value)).toContainEqual({ path: '/account/amount', code: 'required' });
    expect(value.account.amount).toBeUndefined();
  });
  it('validates every array item and retains escaped error paths', () => {
    const model = readRecursiveSchemaForm({ properties: { 'a/b': { type: 'array', items: { properties: { '~n': { type: 'integer', minimum: 1 } } } } } });
    expect(validateRecursiveSchemaForm(model, { 'a/b': [{ '~n': 0 }, { '~n': '1' }] })).toEqual([
      { path: '/a~1b/0/~0n', code: 'minimum' }, { path: '/a~1b/1/~0n', code: 'type' },
    ]);
  });
  it('enforces min/max items without confusing an absent optional array with an empty required array', () => {
    const model = readRecursiveSchemaForm(nested);
    expect(validateRecursiveSchemaForm(model, { account: { enabled: false, amount: 0 }, items: [] })).toContainEqual({ path: '/items', code: 'minItems' });
    expect(validateRecursiveSchemaForm(model, { account: { enabled: false, amount: 0 }, items: [{ plan: 1 }, { plan: 1 }, { plan: 1 }] })).toContainEqual({ path: '/items', code: 'maxItems' });
    expect(validateRecursiveSchemaForm(readRecursiveSchemaForm({ properties: { rows: { type: 'array', items: { type: 'number' }, minItems: 1 } } }), {})).toEqual([]);
  });
  it('rejects extra properties at their owning object boundary', () => {
    const model = readRecursiveSchemaForm({ properties: { value: { type: 'object', additionalProperties: false, properties: {} } } });
    expect(validateRecursiveSchemaForm(model, { value: { extra: 1 } })).toEqual([{ path: '/value/extra', code: 'additionalProperties' }]);
  });
  it('keeps nullable leaf types strict rather than coercing strings', () => {
    const model = readRecursiveSchemaForm({ properties: { amount: { type: ['number', 'null'], minimum: 0 } } });
    expect(validateRecursiveSchemaForm(model, { amount: null })).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { amount: '1' })).toEqual([{ path: '/amount', code: 'type' }]);
  });
  it('rejects unsupported assertions on composites and leaves', () => {
    for (const schema of [
      { allOf: [] }, { properties: { name: { type: 'string', pattern: '.*' } } },
      { properties: { rows: { type: 'array', items: { type: 'number' }, uniqueItems: true } } },
    ]) expect(readRecursiveSchemaForm(schema).issues.length).toBeGreaterThan(0);
  });
  it('rejects invalid metadata, missing array item schemas and cyclic schemas', () => {
    const cycle: Record<string, unknown> = { type: 'object' };
    cycle['properties'] = { again: cycle };
    for (const schema of [null, { properties: null }, { required: null }, { properties: { rows: { type: 'array' } } }, cycle]) {
      expect(readRecursiveSchemaForm(schema).issues.length).toBeGreaterThan(0);
    }
  });
  it('rejects accessors before executing their payload', () => {
    let invoked = 0;
    const schema = { get type() { invoked++; return 'object'; } };
    expect(readRecursiveSchemaForm(schema).issues.length).toBeGreaterThan(0);
    expect(invoked).toBe(0);
  });
  it('fails closed for sparse, cyclic and non-JSON submitted data', () => {
    const model = readRecursiveSchemaForm({ properties: {} });
    const cycle: Record<string, unknown> = {}; cycle['self'] = cycle;
    for (const value of [{ value: Array(2) }, { value: NaN }, cycle]) {
      expect(validateRecursiveSchemaForm(model, value)).toEqual([{ path: '', code: 'invalid-value' }]);
    }
  });
  it('validates without changing the draft or weakening the snapshot boundary', () => {
    const value = { account: { enabled: false, amount: 0.3 }, items: [{ plan: 2 }] };
    const before = schemaFormSnapshot(value);
    validateRecursiveSchemaForm(readRecursiveSchemaForm(nested), value);
    expect(value).toEqual(before);
  });
});

describe('preserved host-filter capability', () => {
  const fields: FieldDefinition[] = [{ key: 'name', label: 'Name', type: 'text' }];
  it('preserves only an unchanged captured readonly rule', () => {
    const original: Filter = { field: 'remote', operator: 'eq', value: 'host' };
    const parsed = readFilterTree([original]);
    if (!parsed.ok) throw new Error('Expected host filter');
    const node = parsed.root.children[0] as FilterRuleNode;
    node.readonly = true;
    const saved = new Map([[node.id, original]]);
    expect(compileFilterTree(parsed.root, fields, saved)).toEqual({ ok: true, filters: [original] });
    node.value = 'edited';
    expect(compileFilterTree(parsed.root, fields, saved).ok).toBe(false);
    expect(compileFilterTree(parsed.root, fields).ok).toBe(false);
  });
  it('preserves an originally empty group but rejects a newly-created one', () => {
    const original: Filter = { operator: 'or', value: [] };
    const parsed = readFilterTree([original]);
    if (!parsed.ok) throw new Error('Expected explicit group');
    const saved = new Map([[parsed.root.id, original]]);
    expect(compileFilterTree(parsed.root, fields, saved)).toEqual({ ok: true, filters: [original] });
    expect(compileFilterTree(parsed.root, fields).ok).toBe(false);
  });
  it('never applies a valid subset next to an invalid edited rule', () => {
    const parsed = readFilterTree([{ field: 'remote', operator: 'eq', value: 'host' }]);
    if (!parsed.ok) throw new Error('Expected host filter');
    const node = parsed.root.children[0] as FilterRuleNode;
    node.readonly = true;
    const saved = new Map<string, Filter>([[node.id, { field: 'remote', operator: 'eq', value: 'host' }]]);
    parsed.root.children.push({ kind: 'rule', id: 'draft', field: 'name', operator: 'eq', value: undefined });
    expect(compileFilterTree(parsed.root, fields, saved).ok).toBe(false);
  });
  it('rejects sparse collections rather than dropping their holes', () => {
    expect(readFilterTree([{ field: 'name', operator: 'in', value: Array(2) }]).ok).toBe(false);
  });
});
