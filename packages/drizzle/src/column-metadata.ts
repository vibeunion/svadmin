import { Type, type Static } from '@sinclair/typebox';
import { createExactSchemaValidator } from '@svadmin/core/schema';

const columnSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  dataType: Type.String({ minLength: 1 }),
  columnType: Type.String({ minLength: 1 }),
  notNull: Type.Boolean(),
  hasDefault: Type.Boolean(),
  primary: Type.Boolean(),
  enumValues: Type.Optional(Type.Array(Type.String())),
});
const columnValidator = createExactSchemaValidator(columnSchema);

export type ColumnMetadata = Static<typeof columnSchema>;

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Project only consumed metadata; Drizzle columns contain circular table links. */
export function decodeColumnMetadata(value: unknown): ColumnMetadata {
  if (!isObject(value)) throw new TypeError('Invalid Drizzle column metadata');
  const candidate = {
    name: value['name'],
    dataType: value['dataType'],
    columnType: value['columnType'],
    notNull: value['notNull'],
    hasDefault: value['hasDefault'],
    primary: value['primary'],
    ...(value['enumValues'] === undefined ? {} : { enumValues: value['enumValues'] }),
  };
  if (!columnValidator.Check(candidate)) {
    throw new TypeError('Invalid Drizzle column metadata');
  }
  return {
    ...candidate,
    ...(candidate.enumValues === undefined ? {} : { enumValues: [...candidate.enumValues] }),
  };
}

export function decodeColumns(value: unknown): [string, ColumnMetadata][] {
  if (!isObject(value)) throw new TypeError('Invalid Drizzle table columns');
  return Object.entries(value).map(([key, column]) => [key, decodeColumnMetadata(column)]);
}
