import { describe, expect, test } from 'bun:test';
import { Type, type TSchema } from '@sinclair/typebox';
import { TypeSystemPolicy } from '@sinclair/typebox/system';
import { createExactSchemaValidator } from './schema-validation';

describe('exact optional schema validation', () => {
  test('distinguishes missing properties, explicit undefined, and explicitly allowed undefined', () => {
    const schema = Type.Object({
      label: Type.Optional(Type.String()),
      nullable: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      clearable: Type.Optional(Type.Union([Type.String(), Type.Undefined()])),
    });
    const policy = TypeSystemPolicy.ExactOptionalPropertyTypes;
    const validator = createExactSchemaValidator(schema);
    expect(validator.Check({})).toBe(true);
    expect(validator.Check({ label: 'valid', nullable: null, clearable: undefined })).toBe(true);
    expect(validator.Check({ label: undefined })).toBe(false);
    expect(validator.Check({ nullable: undefined })).toBe(false);
    expect([...validator.Errors({ label: undefined })].length).toBeGreaterThan(0);
    expect(TypeSystemPolicy.ExactOptionalPropertyTypes).toBe(policy);
    expect(schema.required).toBeUndefined();
  });

  test('preserves union branch selection, negation, arrays, tuples and dictionaries', () => {
    const child = Type.Object({ label: Type.Optional(Type.String()) }, { additionalProperties: false });
    const validator = createExactSchemaValidator(Type.Object({
      union: Type.Union([child, Type.Object({ number: Type.Number() }, { additionalProperties: false })]),
      array: Type.Array(child),
      tuple: Type.Tuple([child]),
      dictionary: Type.Record(Type.String(), child),
    }));
    const valid = { union: { number: 1 }, array: [{}], tuple: [{}], dictionary: { a: {} } };
    expect(validator.Check(valid)).toBe(true);
    for (const field of ['union', 'array', 'tuple', 'dictionary'] as const) {
      const invalid = field === 'union' ? { label: undefined }
        : field === 'dictionary' ? { a: { label: undefined } } : [{ label: undefined }];
      expect(validator.Check({ ...valid, [field]: invalid })).toBe(false);
    }
    const negation = createExactSchemaValidator(Type.Not(child));
    expect(negation.Check({})).toBe(false);
    expect(negation.Check({ label: undefined })).toBe(true);
  });

  test('enforces referenced and recursive optional properties without mutating source schemas', () => {
    const reference = Type.Object({ label: Type.Optional(Type.String()) }, { $id: 'Label' });
    const ref = createExactSchemaValidator(Type.Ref(reference), [reference]);
    expect(ref.Check({})).toBe(true);
    expect(ref.Check({ label: undefined })).toBe(false);
    expect(reference.$id).toBe('Label');

    const recursive = Type.Recursive(self => Type.Object({
      label: Type.Optional(Type.String()),
      children: Type.Optional(Type.Array(self)),
    }));
    const tree = createExactSchemaValidator(recursive);
    expect(tree.Check({ children: [{ label: 'child' }] })).toBe(true);
    expect(tree.Check({ children: [{ label: undefined }] })).toBe(false);
    expect(tree.Check({ children: undefined })).toBe(false);
  });

  test('validates additional object properties, intersections, imports and transforms', () => {
    const child = Type.Object({ label: Type.Optional(Type.String()) });
    const extra = createExactSchemaValidator(Type.Object({}, { additionalProperties: child }));
    expect(extra.Check({ nested: {} })).toBe(true);
    expect(extra.Check({ nested: { label: undefined } })).toBe(false);
    const intersect = createExactSchemaValidator(Type.Intersect([child, Type.Object({ id: Type.Number() })]));
    expect(intersect.Check({ id: 1 })).toBe(true);
    expect(intersect.Check({ id: 1, label: undefined })).toBe(false);
    const imported = createExactSchemaValidator(Type.Module({ Child: child }).Import('Child'));
    expect(imported.Check({})).toBe(true);
    expect(imported.Check({ label: undefined })).toBe(false);
    const transformed = createExactSchemaValidator(Type.Transform(child).Decode(value => value).Encode(value => value));
    expect(transformed.Check({})).toBe(true);
    expect(transformed.Check({ label: undefined })).toBe(false);
  });

  test('validates deep optional structures without exponential repeated traversal', () => {
    let schema: TSchema = Type.String();
    let value: unknown = 'leaf';
    let reads = 0;
    for (let depth = 0; depth < 32; depth++) {
      schema = Type.Object({ child: Type.Optional(schema) });
      const child = value;
      value = { get child() { reads++; return child; } };
    }
    expect(createExactSchemaValidator(schema).Check(value)).toBe(true);
    expect(reads).toBeLessThanOrEqual(32 * 5);
  });

  test('takes a schema snapshot instead of accepting subsequent weakening', () => {
    const schema = Type.Object({ label: Type.Optional(Type.String({ minLength: 3 })) });
    const validator = createExactSchemaValidator(schema);
    schema.properties.label.minLength = 0;
    expect(validator.Check({ label: 'a' })).toBe(false);
    expect(validator.Check({ label: 'valid' })).toBe(true);
  });
});
