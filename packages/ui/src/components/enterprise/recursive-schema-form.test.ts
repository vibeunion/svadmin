import { describe, expect, it } from 'vitest';
import {
  readRecursiveSchemaForm, validateRecursiveSchemaForm,
  pruneRecursiveSchemaFormValue, selectRecursiveOneOfBranch, switchRecursiveOneOfBranch,
} from './recursive-schema-form.js';
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
      { allOf: [] }, { properties: { choice: { oneOf: [{ type: 'string' }, { type: 'number' }] } } },
      { properties: { name: { type: 'string', pattern: '.*' } } },
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
  it('resolves an exact internal root $defs reference with RFC6901 names', () => {
    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        amount: { $ref: '#/$defs/a~1b' },
        token: { $ref: '#/$defs/~0token' },
      },
      $defs: {
        'a/b': { type: 'integer', minimum: 1 },
        '~token': { type: 'string', minLength: 2 },
      },
    };
    const model = readRecursiveSchemaForm(schema);
    expect(model.issues).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { amount: 1, token: 'ok' })).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { amount: 0, token: 'x' })).toEqual([
      { path: '/amount', code: 'minimum' }, { path: '/token', code: 'minLength' },
    ]);
    // $defs is root metadata only; it is never rendered or validated as a data field.
    expect(validateRecursiveSchemaForm(model, { amount: 1, token: 'ok', $defs: {} })).toEqual([
      { path: '/$defs', code: 'additionalProperties' },
    ]);
  });
  it('resolves a referenced object definition for nested required fields', () => {
    const schema = { type: 'object', properties: { owner: { $ref: '#/$defs/owner' } }, $defs: {
      owner: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
    } };
    const model = readRecursiveSchemaForm(schema);
    expect(model.issues).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { owner: { name: 'Ada' } })).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { owner: {} })).toEqual([{ path: '/owner/name', code: 'required' }]);
  });
  it('reports missing and illegal internal references at the reference path', () => {
    const missing = readRecursiveSchemaForm({ properties: { field: { $ref: '#/$defs/missing' } }, $defs: { known: { type: 'string' } } });
    expect(missing.issues).toContainEqual({ path: '/field', code: 'ref-invalid' });
    for (const reference of [
      'https://example.com/schema.json#/$defs/known', 'other.json#/$defs/known',
      '#/definitions/known', '#/$defs/known/extra', '#/$defs/', '#/$defs/a~2b', '#/$defs/__proto__',
    ]) {
      const model = readRecursiveSchemaForm({ properties: { field: { $ref: reference } }, $defs: { known: { type: 'string' }, 'a~2b': { type: 'string' } } });
      expect(model.issues).toContainEqual({ path: '/field', code: 'ref-invalid' });
    }
    expect(readRecursiveSchemaForm({ properties: { field: { $ref: 1 } } }).issues).toContainEqual({ path: '/field', code: 'ref-invalid' });
    expect(readRecursiveSchemaForm({ properties: { field: { $ref: '#/$defs/known', type: 'string' } }, $defs: { known: { type: 'string' } } }).issues)
      .toContainEqual({ path: '/field', code: 'unsupported-schema' });
  });
  it('fails closed on direct and indirect reference cycles', () => {
    const direct = readRecursiveSchemaForm({ properties: { field: { $ref: '#/$defs/node' } }, $defs: {
      node: { type: 'object', properties: { next: { $ref: '#/$defs/node' } } },
    } });
    expect(direct.issues).toContainEqual({ path: '/field/next', code: 'ref-cycle' });
    const indirect = readRecursiveSchemaForm({ properties: { field: { $ref: '#/$defs/a' } }, $defs: {
      a: { type: 'object', properties: { next: { $ref: '#/$defs/b' } } },
      b: { $ref: '#/$defs/a' },
    } });
    expect(indirect.issues).toContainEqual({ path: '/field/next', code: 'ref-cycle' });
    expect(validateRecursiveSchemaForm(direct, { field: {} })).toContainEqual({ path: '/field/next', code: 'ref-cycle' });
  });
  it('bounds total reference expansion and direct reference chain depth with ref-limit', () => {
    const chain: Record<string, unknown> = {};
    for (let index = 0; index < 40; index++) {
      chain[`n${index}`] = index === 39 ? { type: 'string' } : { $ref: `#/$defs/n${index + 1}` };
    }
    const chained = readRecursiveSchemaForm({ properties: { field: { $ref: '#/$defs/n0' } }, $defs: chain });
    expect(chained.issues).toContainEqual({ path: '/field', code: 'ref-limit' });

    const leaf = { type: 'string' };
    const node = {
      type: 'object',
      properties: Object.fromEntries(Array.from({ length: 256 }, (_, index) => [`p${index}`, { $ref: '#/$defs/leaf' }])),
    };
    const wide = readRecursiveSchemaForm({
      properties: { field: { $ref: '#/$defs/node' } },
      $defs: { leaf, node },
    });
    expect(wide.issues).toContainEqual({ path: '/field/p255', code: 'ref-limit' });
  });
  it('allows the same internal reference target to be shared by multiple fields', () => {
    const schema = { properties: {
      first: { $ref: '#/$defs/count' }, second: { $ref: '#/$defs/count' },
    }, $defs: { count: { type: 'integer', minimum: 1, maximum: 9 } } };
    const model = readRecursiveSchemaForm(schema);
    expect(model.issues).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { first: 1, second: 9 })).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { first: 0, second: 10 })).toEqual([
      { path: '/first', code: 'minimum' }, { path: '/second', code: 'maximum' },
    ]);
  });
  const discriminated = {
    type: 'object',
    additionalProperties: false,
    properties: {
      choice: {
        oneOf: [
          { type: 'object', additionalProperties: false, required: ['kind', 'text'], properties: {
            kind: { const: 'text' }, text: { type: 'string', minLength: 2 },
          } },
          { type: 'object', additionalProperties: false, required: ['kind', 'count'], properties: {
            kind: { const: 'count' }, count: { type: 'integer', minimum: 1 },
          } },
        ],
        discriminator: { propertyName: 'kind' },
      },
    },
  };
  it('selects a discriminated oneOf branch explicitly and validates only that branch', () => {
    const model = readRecursiveSchemaForm(discriminated);
    expect(model.issues).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { choice: { kind: 'text', text: 'ok' } })).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { choice: { kind: 'count', count: 2 } })).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { choice: { kind: 'text', text: 'x' } })).toEqual([
      { path: '/choice/text', code: 'minLength' },
    ]);
    expect(validateRecursiveSchemaForm(model, { choice: { kind: 'count', count: 0 } })).toEqual([
      { path: '/choice/count', code: 'minimum' },
    ]);
    expect(validateRecursiveSchemaForm(model, {})).toEqual([]);
  });
  it('reports unselected and unknown discriminator values at the selector pointer', () => {
    const model = readRecursiveSchemaForm(discriminated);
    for (const choice of [{}, { kind: 'missing' }, { kind: 'constructor' }]) {
      expect(validateRecursiveSchemaForm(model, { choice })).toEqual([
        { path: '/choice/kind', code: 'oneOf-unselected' },
      ]);
    }
    if (model.node?.kind !== 'object') throw new Error('Expected compiled object');
    const choice = model.node.properties['choice'];
    if (!choice) throw new Error('Expected compiled oneOf');
    expect(selectRecursiveOneOfBranch(choice, { kind: 'text' })).toBe(0);
  });
  it('rejects missing discriminator, duplicate selectors and malformed branches without guessing', () => {
    const missing = readRecursiveSchemaForm({ properties: { choice: {
      oneOf: [{ type: 'object', properties: { kind: { const: 'a' } } }],
    } } });
    expect(missing.issues).toContainEqual({ path: '/choice/oneOf', code: 'oneOf-unsupported' });

    const ambiguous = readRecursiveSchemaForm({ properties: { choice: {
      oneOf: [
        { type: 'object', properties: { kind: { const: 'same' } } },
        { type: 'object', properties: { kind: { const: 'same' } } },
      ],
      discriminator: { propertyName: 'kind' },
    } } });
    expect(ambiguous.issues).toContainEqual({ path: '/choice/oneOf', code: 'oneOf-ambiguous' });
    const ambiguousChoice = ambiguous.node?.kind === 'object' ? ambiguous.node.properties['choice'] : undefined;
    if (ambiguousChoice?.kind !== 'oneOf') throw new Error('Expected ambiguous oneOf node');
    expect(selectRecursiveOneOfBranch(ambiguousChoice, { kind: 'same' })).toBe('oneOf-ambiguous');

    const malformed = readRecursiveSchemaForm({ properties: { choice: {
      oneOf: [{ type: 'object', properties: { kind: { type: 'string' } } }],
      discriminator: { propertyName: 'kind' },
    } } });
    expect(malformed.issues).toContainEqual({ path: '/choice/oneOf/0/kind', code: 'oneOf-invalid' });

    const mapping = readRecursiveSchemaForm({ properties: { choice: {
      oneOf: [{ type: 'object', properties: { kind: { const: 'a' } } }],
      discriminator: { propertyName: 'kind', mapping: {} },
    } } });
    expect(mapping.issues).toContainEqual({ path: '/choice/discriminator', code: 'oneOf-unsupported' });
  });
  it('expands internal references inside explicit oneOf branches', () => {
    const schema = { type: 'object', properties: { choice: {
      oneOf: [{ $ref: '#/$defs/text' }, { $ref: '#/$defs/count' }],
      discriminator: { propertyName: 'kind' },
    } }, $defs: {
      text: { type: 'object', required: ['kind', 'text'], properties: { kind: { const: 'text' }, text: { type: 'string' } } },
      count: { type: 'object', required: ['kind', 'count'], properties: { kind: { type: 'string', const: 'count' }, count: { type: 'number' } } },
    } };
    const model = readRecursiveSchemaForm(schema);
    expect(model.issues).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { choice: { kind: 'count', count: 2 } })).toEqual([]);
  });
  it('prunes stale unselected branch fields without mutating input or draft values', () => {
    const model = readRecursiveSchemaForm(discriminated);
    const input = { choice: { kind: 'count', text: 'stale', count: 2 } };
    const before = structuredClone(input);
    expect(validateRecursiveSchemaForm(model, input)).toEqual([]);
    expect(pruneRecursiveSchemaFormValue(model, input)).toEqual({ choice: { kind: 'count', count: 2 } });
    expect(input).toEqual(before);
    const choice = model.node?.kind === 'object' ? model.node.properties['choice'] : undefined;
    expect(choice?.kind).toBe('oneOf');
    if (choice?.kind !== 'oneOf') throw new Error('Expected oneOf node');
    expect(switchRecursiveOneOfBranch(choice, { kind: 'text', text: 'old' }, 1)).toEqual({ kind: 'count' });
  });
  it('does not execute oneOf accessors while rejecting malformed branches', () => {
    let invoked = 0;
    const schema = { properties: { choice: {
      oneOf: [{ type: 'object', properties: { kind: { get const() { invoked++; return 'a'; } } } }],
      discriminator: { propertyName: 'kind' },
    } } };
    expect(readRecursiveSchemaForm(schema).issues.length).toBeGreaterThan(0);
    expect(invoked).toBe(0);
  });
  it('does not execute discriminator accessors while rejecting malformed oneOf metadata', () => {
    let invoked = 0;
    const discriminator: Record<string, unknown> = {};
    Object.defineProperty(discriminator, 'propertyName', {
      enumerable: true,
      get() { invoked++; return 'kind'; },
    });
    const schema = { properties: { choice: {
      oneOf: [{ type: 'object', properties: { kind: { const: 'a' } } }],
      discriminator,
    } } };
    expect(readRecursiveSchemaForm(schema).issues).toContainEqual({ path: '/choice/discriminator', code: 'oneOf-invalid' });
    expect(invoked).toBe(0);
  });
  it('compiles a root-level explicit discriminator and validates only the selected branch', () => {
    const root = {
      type: 'object',
      additionalProperties: false,
      oneOf: [
        { type: 'object', additionalProperties: false, required: ['kind', 'text'], properties: {
          kind: { const: 'text' }, text: { type: 'string' },
        } },
        { type: 'object', additionalProperties: false, required: ['kind', 'count'], properties: {
          kind: { const: 'count' }, count: { type: 'integer' },
        } },
      ],
      discriminator: { propertyName: 'kind' },
    };
    const model = readRecursiveSchemaForm(root);
    expect(model.issues).toEqual([]);
    expect(model.node?.kind).toBe('oneOf');
    expect(validateRecursiveSchemaForm(model, { kind: 'text', text: 'ok' })).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { kind: 'count', count: 2 })).toEqual([]);
    expect(validateRecursiveSchemaForm(model, { kind: 'text', text: 1 })).toEqual([{ path: '/text', code: 'type' }]);
    expect(validateRecursiveSchemaForm(model, {})).toEqual([{ path: '/kind', code: 'oneOf-unselected' }]);
    expect(pruneRecursiveSchemaFormValue(model, { kind: 'count', text: 'stale', count: 2 })).toEqual({ kind: 'count', count: 2 });
    if (model.node?.kind !== 'oneOf') throw new Error('Expected root oneOf node');
    expect(switchRecursiveOneOfBranch(model.node, { kind: 'text', text: 'old' }, 1)).toEqual({ kind: 'count' });
  });
  it('fails closed on ambiguous root-level selectors and does not read discriminator accessors', () => {
    const ambiguous = readRecursiveSchemaForm({
      oneOf: [
        { type: 'object', properties: { kind: { const: 'same' } } },
        { type: 'object', properties: { kind: { const: 'same' } } },
      ],
      discriminator: { propertyName: 'kind' },
    });
    expect(ambiguous.issues).toContainEqual({ path: '/oneOf', code: 'oneOf-ambiguous' });
    expect(ambiguous.node?.kind).toBe('oneOf');
    if (ambiguous.node?.kind !== 'oneOf') throw new Error('Expected ambiguous root oneOf node');
    expect(selectRecursiveOneOfBranch(ambiguous.node, { kind: 'same' })).toBe('oneOf-ambiguous');

    let invoked = 0;
    const discriminator: Record<string, unknown> = {};
    Object.defineProperty(discriminator, 'propertyName', { enumerable: true, get() { invoked++; return 'kind'; } });
    const model = readRecursiveSchemaForm({
      oneOf: [{ type: 'object', properties: { kind: { const: 'a' } } }],
      discriminator,
    });
    expect(model.issues).toContainEqual({ path: '/discriminator', code: 'oneOf-invalid' });
    expect(invoked).toBe(0);
  });
  it('prunes stale branch fields recursively for nested oneOf values', () => {
    const schema = { properties: { group: { type: 'object', additionalProperties: false, properties: {
      choice: discriminated.properties.choice,
    } } } };
    const model = readRecursiveSchemaForm(schema);
    expect(model.issues).toEqual([]);
    const input = { group: { choice: { kind: 'count', text: 'stale', count: 2 } } };
    expect(validateRecursiveSchemaForm(model, input)).toEqual([]);
    expect(pruneRecursiveSchemaFormValue(model, input)).toEqual({ group: { choice: { kind: 'count', count: 2 } } });
    expect(input).toEqual({ group: { choice: { kind: 'count', text: 'stale', count: 2 } } });
  });
  it('does not mutate the input schema or execute reference accessors', () => {
    const schema = { properties: { amount: { $ref: '#/$defs/count' } }, $defs: { count: { type: 'number', default: 2 } } };
    const before = structuredClone(schema);
    Object.freeze(schema.properties.amount); Object.freeze(schema.$defs.count); Object.freeze(schema.$defs); Object.freeze(schema.properties); Object.freeze(schema);
    expect(readRecursiveSchemaForm(schema).issues).toEqual([]);
    expect(schema).toEqual(before);
    let invoked = 0;
    const accessor = { properties: { field: { $ref: '#/$defs/node' } }, $defs: { get node() { invoked++; return { type: 'string' }; } } };
    expect(readRecursiveSchemaForm(accessor).issues.length).toBeGreaterThan(0);
    expect(invoked).toBe(0);
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
