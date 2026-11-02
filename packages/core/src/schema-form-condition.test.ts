import { describe, expect, it } from 'bun:test';
import {
  applySchemaFormComputed,
  assertSchemaFormSchema,
  matchesSchemaFormCondition,
  type SchemaFormSchema,
} from './schema-form';

const schema: SchemaFormSchema = {
  type: 'object',
  properties: {
    kind: { type: 'string' },
    tier: { type: 'string' },
    quantity: { type: 'number' },
    price: { type: 'number' },
    first: { type: 'string' },
    last: { type: 'string' },
    total: { type: 'number', computed: { from: ['quantity', 'price'], op: 'sum' } },
    itemCount: { type: 'number', computed: { from: ['first', 'last'], op: 'count' } },
    label: { type: 'string', computed: { from: ['first', 'last'], op: 'concat', separator: ' ' } },
    preview: {
      type: 'string',
      visibleWhen: {
        all: [
          { path: ['kind'], equals: 'paid' },
          { not: { path: ['tier'], equals: 'blocked' } },
        ],
      },
    },
  },
};

describe('schema form condition combinators', () => {
  it('evaluates all/any/not', () => {
    expect(matchesSchemaFormCondition({ all: [{ path: ['a'], equals: 1 }, { path: ['b'], equals: 2 }] }, { a: 1, b: 2 })).toBe(true);
    expect(matchesSchemaFormCondition({ all: [{ path: ['a'], equals: 1 }, { path: ['b'], equals: 2 }] }, { a: 1, b: 3 })).toBe(false);
    expect(matchesSchemaFormCondition({ any: [{ path: ['a'], equals: 1 }, { path: ['b'], equals: 2 }] }, { a: 0, b: 2 })).toBe(true);
    expect(matchesSchemaFormCondition({ not: { path: ['a'], equals: 1 } }, { a: 2 })).toBe(true);
  });

  it('compares against another field value', () => {
    expect(matchesSchemaFormCondition({ path: ['a'], equalsField: ['b'] }, { a: 4, b: 4 })).toBe(true);
    expect(matchesSchemaFormCondition({ path: ['a'], equalsField: ['b'] }, { a: 4, b: 5 })).toBe(false);
  });

  it('keeps unknown keys and empty combinators out of the contract', () => {
    expect(() => assertSchemaFormSchema({ type: 'object', properties: { a: { type: 'string' } }, visibleWhen: { path: ['a'] } } as SchemaFormSchema)).toThrow();
    expect(() => assertSchemaFormSchema({
      type: 'object',
      properties: { a: { type: 'string', visibleWhen: { all: [] } } },
    })).toThrow(/Invalid schema form configuration/);
    expect(() => assertSchemaFormSchema({
      type: 'object',
      properties: { a: { type: 'string', visibleWhen: { path: ['a'], all: [{ path: ['a'], exists: true }] } } },
    })).toThrow(/Invalid schema form configuration/);
    expect(() => assertSchemaFormSchema({
      type: 'object',
      properties: { a: { type: 'string', visibleWhen: { path: ['missing'], equals: 1 } } },
    })).toThrow(/Invalid schema form configuration/);
  });

  it('accepts the composed schema and validates it', () => {
    expect(() => assertSchemaFormSchema(schema)).not.toThrow();
  });
});

describe('schema form computed fields', () => {
  it('derives sum, count and concat without mutating the input', () => {
    const value = { quantity: 2, price: 3.5, first: 'Ada', last: 'Lovelace' };
    const result = applySchemaFormComputed(schema, value) as Record<string, unknown>;
    expect(result['total']).toBe(5.5);
    expect(result['itemCount']).toBe(2);
    expect(result['label']).toBe('Ada Lovelace');
    expect(value).not.toHaveProperty('total');
  });

  it('ignores non-numeric sources instead of producing NaN', () => {
    const result = applySchemaFormComputed(schema, { quantity: '2', price: 'n/a' }) as Record<string, unknown>;
    expect(result['total']).toBe(2);
  });

  it('rejects computed output on object and array targets', () => {
    expect(() => assertSchemaFormSchema({
      type: 'object',
      properties: {
        list: { type: 'array', items: { type: 'string' }, computed: { from: ['x'], op: 'count' } },
        x: { type: 'string' },
      },
    })).toThrow(/Invalid schema form configuration/);
  });

  it('rejects unknown operators and separators on non-concat ops', () => {
    expect(() => assertSchemaFormSchema({
      type: 'object',
      properties: {
        x: { type: 'string' },
        y: { type: 'string', computed: { from: ['x'], op: 'multiply' as 'sum' } },
      },
    })).toThrow(/Invalid schema form configuration/);
    expect(() => assertSchemaFormSchema({
      type: 'object',
      properties: {
        x: { type: 'string' },
        y: { type: 'string', computed: { from: ['x'], op: 'first', separator: ' ' } },
      },
    })).toThrow(/Invalid schema form configuration/);
  });
});