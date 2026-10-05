import { Type, type Static, type TSchema } from 'typebox';
import { Value } from 'typebox/value';

const CODEC_KEY = '~codec';

/** JSON Schema keywords that TypeBox 1.x stores but does not expose on every typed interface. */
interface SchemaMeta {
  $id?: string;
  $defs?: Record<string, TSchema>;
  properties?: Record<string, TSchema>;
  required?: readonly string[];
  additionalProperties?: TSchema | boolean;
  patternProperties?: Record<string, TSchema>;
  contains?: TSchema;
  unevaluatedProperties?: TSchema | boolean;
  anyOf?: TSchema[];
  allOf?: TSchema[];
  items?: TSchema | TSchema[];
  not?: TSchema;
}

/**
 * Strengthen optional-property presence with ordinary schemas, without changing
 * TypeBox's process-wide policy or maintaining a second value validator.
 */
function exactSchema(input: TSchema): TSchema {
  const schema = input as TSchema & SchemaMeta;
  if (typeof schema.not === 'object' && Type.IsSchema(schema.not)) {
    schema.not = exactSchema(schema.not);
  }
  if (Type.IsObject(input)) {
    const properties = schema.properties ?? {};
    schema.properties = Object.fromEntries(
      Object.entries(properties).map(([key, property]) => [key, exactSchema(property)]),
    );
    if (typeof schema.additionalProperties === 'object' && Type.IsSchema(schema.additionalProperties)) {
      schema.additionalProperties = exactSchema(schema.additionalProperties);
    }
    const optional = Object.entries(schema.properties)
      .filter(([key]) => !schema.required?.includes(key));
    if (optional.length === 0) return schema;

    const constraints = optional.map(([key, property]) => Type.Union([
      Type.Required(Type.Object({ [key]: property })),
      // TypeBox 1.x removed Type.Not; the JSON Schema `not` keyword is expressed through Unsafe.
      Type.Unsafe({ not: Type.Object({ [key]: Type.Unknown() }) }),
    ]));
    // The presence constraint owns each optional value's validation. Leaving it
    // in both places would validate deep optional objects exponentially often.
    for (const [key] of optional) schema.properties[key] = Type.Unknown();
    // References must resolve to the strengthened object, not its inner copy.
    const id = schema.$id;
    delete schema.$id;
    const codec = Object.getOwnPropertyDescriptor(schema, CODEC_KEY);
    Reflect.deleteProperty(schema, CODEC_KEY);
    const result = Type.Intersect([schema, ...constraints], id === undefined ? {} : { $id: id });
    if (codec !== undefined) Object.defineProperty(result, CODEC_KEY, codec);
    return result;
  }
  if (Type.IsArray(input)) {
    schema.items = exactSchema(schema.items as TSchema);
    if (typeof schema.contains === 'object' && Type.IsSchema(schema.contains)) {
      schema.contains = exactSchema(schema.contains);
    }
  } else if (Type.IsTuple(input)) {
    if (Array.isArray(schema.items)) schema.items = schema.items.map(exactSchema);
  } else if (Type.IsUnion(input)) {
    schema.anyOf = (schema.anyOf ?? []).map(exactSchema);
  } else if (Type.IsIntersect(input)) {
    schema.allOf = (schema.allOf ?? []).map(exactSchema);
    if (typeof schema.unevaluatedProperties === 'object' && Type.IsSchema(schema.unevaluatedProperties)) {
      schema.unevaluatedProperties = exactSchema(schema.unevaluatedProperties);
    }
  } else if (Type.IsRecord(input)) {
    schema.patternProperties = Object.fromEntries(
      Object.entries(schema.patternProperties ?? {}).map(([key, property]) => [key, exactSchema(property)]),
    );
    if (typeof schema.additionalProperties === 'object' && Type.IsSchema(schema.additionalProperties)) {
      schema.additionalProperties = exactSchema(schema.additionalProperties);
    }
  } else if (Type.IsCyclic(input)) {
    schema.$defs = Object.fromEntries(
      Object.entries(schema.$defs ?? {}).map(([key, definition]) => [key, exactSchema(definition)]),
    );
  }
  return schema;
}

/** TypeBox 1.x resolves references through a Context keyed by Ref name instead of a `references` array. */
function referenceContext(references: readonly TSchema[]): Record<string, TSchema> {
  const context: Record<string, TSchema> = {};
  for (const reference of references) {
    const id = (reference as SchemaMeta).$id;
    if (typeof id === 'string' && id.length > 0) context[id] = reference;
  }
  return context;
}

export function createExactSchemaValidator<S extends TSchema>(schema: S, references: readonly TSchema[] = []) {
  const checked = exactSchema(Value.Clone(schema));
  const checkedReferences = references.map(reference => exactSchema(Value.Clone(reference)));
  const context = referenceContext(checkedReferences);
  const hasReferences = Object.keys(context).length > 0;
  return {
    Check(value: unknown): value is Static<S> {
      return hasReferences
        ? Value.Check(context, checked, value)
        : Value.Check(checked, value);
    },
    Errors(value: unknown) {
      return hasReferences
        ? Value.Errors(context, checked, value)
        : Value.Errors(checked, value);
    },
  };
}

/** One normalized validation issue with a field-scoped JSON Pointer. */
export interface SchemaIssue {
  path: string;
  message: string;
}

interface SchemaErrorLike {
  instancePath?: string;
  path?: string;
  keyword?: string;
  params?: Record<string, unknown>;
  message: string;
}

function escapePointerSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}

/**
 * TypeBox 1.x reports Ajv-style errors that group missing properties into a single
 * `required` issue. Normalize every error back into one field-scoped issue so callers
 * can keep mapping messages onto individual form fields.
 */
export function schemaIssues(errors: Iterable<SchemaErrorLike>): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  for (const error of errors) {
    const base = error.instancePath ?? error.path ?? '';
    const required = error.params?.['requiredProperties'];
    if (error.keyword === 'required' && Array.isArray(required)) {
      for (const property of required) {
        if (typeof property !== 'string') continue;
        issues.push({
          path: `${base}/${escapePointerSegment(property)}`,
          message: `must have required property '${property}'`,
        });
      }
      continue;
    }
    const additional = error.params?.['additionalProperty'];
    issues.push({
      path: typeof additional === 'string' ? `${base}/${escapePointerSegment(additional)}` : base,
      message: error.message,
    });
  }
  return issues;
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