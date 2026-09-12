import { CloneType, TransformKind, Type, type Static, type TSchema } from '@sinclair/typebox';
import { TypeGuard } from '@sinclair/typebox/type';
import { Value } from '@sinclair/typebox/value';

/**
 * Strengthen optional-property presence with ordinary schemas, without changing
 * TypeBox's process-wide policy or maintaining a second value validator.
 */
function exactSchema(schema: TSchema): TSchema {
  if (TypeGuard.IsObject(schema)) {
    schema.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, property]) => [key, exactSchema(property)]),
    );
    if (TypeGuard.IsSchema(schema.additionalProperties)) {
      schema.additionalProperties = exactSchema(schema.additionalProperties);
    }
    const optional = Object.entries(schema.properties)
      .filter(([key]) => !schema.required?.includes(key));
    if (optional.length === 0) return schema;

    const constraints = optional.map(([key, property]) => Type.Union([
      Type.Required(Type.Object({ [key]: property })),
      Type.Not(Type.Object({ [key]: Type.Unknown() })),
    ]));
    // The presence constraint owns each optional value's validation. Leaving it
    // in both places would validate deep optional objects exponentially often.
    for (const [key] of optional) schema.properties[key] = Type.Unknown();
    // References must resolve to the strengthened object, not its inner copy.
    const id = schema.$id;
    delete schema.$id;
    const transform = Object.getOwnPropertyDescriptor(schema, TransformKind);
    Reflect.deleteProperty(schema, TransformKind);
    const result = Type.Intersect([schema, ...constraints], id === undefined ? {} : { $id: id });
    if (transform !== undefined) Object.defineProperty(result, TransformKind, transform);
    return result;
  }
  if (TypeGuard.IsArray(schema)) {
    schema.items = exactSchema(schema.items);
    if (TypeGuard.IsSchema(schema.contains)) schema.contains = exactSchema(schema.contains);
  } else if (TypeGuard.IsTuple(schema)) {
    if (schema.items) schema.items = schema.items.map(exactSchema);
  } else if (TypeGuard.IsUnion(schema)) {
    schema.anyOf = schema.anyOf.map(exactSchema);
  } else if (TypeGuard.IsIntersect(schema)) {
    schema.allOf = schema.allOf.map(exactSchema);
    if (TypeGuard.IsSchema(schema.unevaluatedProperties)) {
      schema.unevaluatedProperties = exactSchema(schema.unevaluatedProperties);
    }
  } else if (TypeGuard.IsNot(schema)) {
    schema.not = exactSchema(schema.not);
  } else if (TypeGuard.IsRecord(schema)) {
    schema.patternProperties = Object.fromEntries(
      Object.entries(schema.patternProperties).map(([key, property]) => [key, exactSchema(property)]),
    );
    if (TypeGuard.IsSchema(schema.additionalProperties)) {
      schema.additionalProperties = exactSchema(schema.additionalProperties);
    }
  } else if (TypeGuard.IsImport(schema)) {
    schema.$defs = Object.fromEntries(
      Object.entries(schema.$defs).map(([key, definition]) => {
        if (!TypeGuard.IsSchema(definition)) throw new TypeError('Invalid imported schema definition');
        return [key, exactSchema(definition)];
      }),
    );
  }
  return schema;
}

export function createExactSchemaValidator<S extends TSchema>(schema: S, references: readonly TSchema[] = []) {
  const checked = exactSchema(CloneType(schema));
  const checkedReferences = references.map(reference => exactSchema(CloneType(reference)));
  return {
    Check(value: unknown): value is Static<S> {
      return Value.Check(checked, checkedReferences, value);
    },
    Errors(value: unknown) {
      return Value.Errors(checked, checkedReferences, value);
    },
  };
}

const validators = new WeakMap<TSchema, ReturnType<typeof createExactSchemaValidator>>();

/** Schemas are snapshotted on first use; later edits cannot weaken a live boundary. */
export function checkExact<S extends TSchema>(schema: S, value: unknown): value is Static<S> {
  let validator = validators.get(schema);
  if (!validator) {
    validator = createExactSchemaValidator(schema);
    validators.set(schema, validator);
  }
  return validator.Check(value);
}
