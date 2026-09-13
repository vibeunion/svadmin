import { Type } from '@sinclair/typebox';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  decodeGeneratedComponentProps,
  defineGeneratedComponent,
  type GeneratedComponentSchemaProps,
} from './generated-components.js';

describe('generated component TypeBox boundary', () => {
  const schema = Type.Object({
    warehouse: Type.String(),
    count: Type.Integer({ minimum: 0 }),
  });
  const component = (() => undefined) as never;
  const definition = defineGeneratedComponent({ component, schema });

  it('decodes valid component props', () => {
    expect(decodeGeneratedComponentProps(definition, { warehouse: 'north', count: 2 }))
      .toEqual({ warehouse: 'north', count: 2 });
  });

  it('rejects wrong types and undeclared properties', () => {
    expect(() => decodeGeneratedComponentProps(definition, { warehouse: 42, count: 2 })).toThrow();
    expect(() => decodeGeneratedComponentProps(definition, {
      warehouse: 'north',
      count: 2,
      secret: 'blocked',
    })).toThrow();
  });

  it('makes the root object strict even when callers omit additionalProperties', () => {
    expect(definition.schema.additionalProperties).toBe(false);
    expect(() => decodeGeneratedComponentProps({ component, schema }, {
      warehouse: 'north',
      count: 2,
      secret: 'blocked',
    })).toThrow();
  });

  it('derives a closed public prop type from the TypeBox schema', () => {
    type InventoryProps = GeneratedComponentSchemaProps<typeof schema>;
    expectTypeOf<InventoryProps>().toEqualTypeOf<{ warehouse: string; count: number }>();
    expectTypeOf<keyof InventoryProps>().toEqualTypeOf<'warehouse' | 'count'>();
    expectTypeOf<{ warehouse: string; count: number; secret: string }>()
      .not.toEqualTypeOf<InventoryProps>();
  });
});
