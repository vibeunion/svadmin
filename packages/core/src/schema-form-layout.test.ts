import { describe, expect, it } from 'bun:test';
import {
  assertSchemaFormSchema,
  prepareSchemaFormValue,
  resolveDeclaredFieldLayout,
  resolveSchemaFormLayout,
  type SchemaFormSchema,
} from './schema-form';

const gridSchema: SchemaFormSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', layout: { type: 'grid', columns: 2 } },
    code: { type: 'string', layout: { type: 'grid', span: 2, columns: 2 } },
    notes: { type: 'string' },
  },
};

const sectionSchema: SchemaFormSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', layout: { type: 'section', title: 'Identity' } },
    email: { type: 'string', layout: { type: 'section', title: 'Identity' } },
    plan: { type: 'string', layout: { type: 'section', title: 'Billing' } },
  },
};

const stepsSchema: SchemaFormSchema = {
  type: 'object',
  properties: {
    customer: { type: 'string', layout: { type: 'steps', step: 1, title: 'Customer' } },
    address: { type: 'string', layout: { type: 'steps', step: 2, title: 'Address' } },
  },
};

describe('schema form layout validation', () => {
  it('accepts grid, section and steps layouts', () => {
    expect(() => assertSchemaFormSchema(gridSchema)).not.toThrow();
    expect(() => assertSchemaFormSchema(sectionSchema)).not.toThrow();
    expect(() => assertSchemaFormSchema(stepsSchema)).not.toThrow();
  });

  it.each([
    ['section without title', { type: 'string', layout: { type: 'section' } }],
    ['steps without title', { type: 'string', layout: { type: 'steps', step: 1 } }],
    ['grid with step', { type: 'string', layout: { type: 'grid', step: 1 } }],
    ['columns on section', { type: 'string', layout: { type: 'section', title: 'A', columns: 2 } }],
    ['span on steps', { type: 'string', layout: { type: 'steps', title: 'A', step: 1, span: 2 } }],
    ['step out of range', { type: 'string', layout: { type: 'steps', title: 'A', step: 13 } }],
    ['unknown layout type', { type: 'string', layout: { type: 'columns' } }],
    ['unknown layout key', { type: 'string', layout: { type: 'grid', gap: 2 } }],
  ])('rejects %s', (_label, field) => {
    const invalid = field as SchemaFormSchema;
    expect(() => assertSchemaFormSchema({ type: 'object', properties: { field: invalid } })).toThrow(/Invalid schema form configuration/);
  });
});

describe('schema form layout resolution', () => {
  it('returns a single flat group when no layout is declared', () => {
    const plan = resolveSchemaFormLayout({ type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } } });
    expect(plan.kind).toBe('flat');
    expect(plan.columns).toBe(1);
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]?.fields.map((field) => field.key)).toEqual(['a', 'b']);
  });

  it('promotes grid columns and spans', () => {
    const plan = resolveSchemaFormLayout(gridSchema);
    expect(plan.kind).toBe('flat');
    expect(plan.columns).toBe(2);
    expect(plan.groups[0]?.fields).toEqual([
      { key: 'name', span: 1 },
      { key: 'code', span: 2 },
      { key: 'notes', span: 1 },
    ]);
  });

  it('groups consecutive sections and keeps titles', () => {
    const plan = resolveSchemaFormLayout(sectionSchema);
    expect(plan.kind).toBe('sections');
    expect(plan.groups.map((group) => group.title)).toEqual(['Identity', 'Billing']);
    expect(plan.groups[0]?.fields.map((field) => field.key)).toEqual(['name', 'email']);
    expect(plan.groups[1]?.fields.map((field) => field.key)).toEqual(['plan']);
  });

  it('keeps steps in declaration order with their step numbers', () => {
    const plan = resolveSchemaFormLayout(stepsSchema);
    expect(plan.kind).toBe('steps');
    expect(plan.groups.map((group) => group.step)).toEqual([1, 2]);
  });

  it('does not change the submitted projection', () => {
    const value = { name: 'Ada', code: 'A-1', notes: 'n' };
    expect(prepareSchemaFormValue(gridSchema, value).data).toEqual(value);
    expect(prepareSchemaFormValue(sectionSchema, { name: 'a', email: 'b', plan: 'c' }).errors).toEqual([]);
  });
});

it('rejects mixing section and steps in one object', () => {
  expect(() => assertSchemaFormSchema({
    type: 'object',
    properties: {
      a: { type: 'string', layout: { type: 'section', title: 'A' } },
      b: { type: 'string', layout: { type: 'steps', title: 'B', step: 1 } },
    },
  })).toThrow(/Invalid schema form configuration/);
});

it('field layout uses the same projection as schema layout', () => {
  expect(resolveDeclaredFieldLayout([{ key: 'name' }])).toBeUndefined();
  const plan = resolveDeclaredFieldLayout([
    { key: 'name', layout: { type: 'section', title: 'Identity' } },
    { key: 'email', layout: { type: 'section', title: 'Identity' } },
  ]);
  expect(plan?.kind).toBe('sections');
  expect(plan?.groups.map((group) => group.title)).toEqual(['Identity']);
  expect(plan?.groups[0]?.fields.map((field) => field.key)).toEqual(['name', 'email']);
});
