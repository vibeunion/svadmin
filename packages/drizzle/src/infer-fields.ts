/**
 * @svadmin/drizzle — Drizzle Schema → FieldDefinition auto-inference
 *
 * Automatically generates svadmin FieldDefinition arrays from Drizzle ORM table schemas,
 * reducing boilerplate when defining resources.
 *
 * @example
 * ```ts
 * import { inferFieldsFromDrizzle } from '@svadmin/drizzle';
 * import { users } from './schema';
 *
 * const fields = inferFieldsFromDrizzle(users);
 * // → [{ key: 'id', label: 'Id', type: 'number', ... }, { key: 'name', label: 'Name', type: 'text', ... }]
 * ```
 */

import type { FieldDefinition } from '@svadmin/core';
import { getTableColumns } from 'drizzle-orm/utils';
import { isTable, type Table } from 'drizzle-orm/table';
import { decodeColumns, type ColumnMetadata } from './column-metadata';

/** Options for field inference */
export interface InferFieldsOptions {
  /** Override labels per column key */
  labels?: Record<string, string>;
  /** Columns to exclude from output */
  exclude?: string[];
  /** Columns to mark as non-editable */
  readOnly?: string[];
  /** Columns to hide from list view */
  hideFromList?: string[];
}

/**
 * Map a Drizzle column type string to a svadmin FieldDefinition type.
 */
function mapColumnType(col: ColumnMetadata): FieldDefinition['type'] {
  const dt = `${col.dataType} ${col.columnType}`.toLowerCase();

  // Integer / serial / numeric types
  if (col.dataType.includes('bool')) return 'boolean';
  if (col.dataType.includes('date')) return 'date';
  if (dt.includes('int') || dt.includes('serial') || dt.includes('numeric') || dt.includes('real') || dt.includes('float') || dt.includes('double') || dt.includes('decimal') || dt.includes('number')) {
    return 'number';
  }
  // Boolean
  if (dt.includes('bool')) return 'boolean';
  // Date / time types
  if (dt.includes('date') || dt.includes('time') || dt.includes('timestamp')) return 'date';
  // JSON
  if (dt.includes('json')) return 'text'; // JSON fields render as text by default
  // Enum (Drizzle pgEnum / mysqlEnum)
  if (col.enumValues && col.enumValues.length > 0) return 'select';
  // Text / varchar / char
  if (dt.includes('text') || dt.includes('varchar') || dt.includes('char') || dt.includes('string')) {
    return 'text';
  }
  // UUID
  if (dt.includes('uuid')) return 'text';
  // Blob / bytea — not renderable, skip
  if (dt.includes('blob') || dt.includes('bytea')) return 'text';

  return 'text'; // fallback
}

/**
 * Format a column key into a human-readable label.
 * `created_at` → `Created At`, `userId` → `User Id`
 */
function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Infer FieldDefinition[] from a Drizzle ORM table schema.
 *
 * Uses Drizzle's runtime column API; `_` is type-only metadata, not a table
 * property. Malformed column metadata is rejected before deriving UI fields.
 */
export function inferFieldsFromDrizzle(
  table: Table,
  options: InferFieldsOptions = {},
): FieldDefinition[] {
  if (!isTable(table)) throw new TypeError('Expected a Drizzle table');
  const columns: unknown = getTableColumns(table);

  const fields: FieldDefinition[] = [];
  for (const [key, col] of decodeColumns(columns)) {
    if (options.exclude?.includes(key)) continue;
    fields.push(buildField(key, col, options));
  }
  return fields;
}

function buildField(
  key: string,
  col: ColumnMetadata,
  options: InferFieldsOptions,
): FieldDefinition {
  const type = mapColumnType(col);
  const field: FieldDefinition = {
    key,
    label: options.labels?.[key] ?? humanizeKey(key),
    type,
    required: col.notNull === true && !col.hasDefault,
  };

  // Primary key fields should be read-only and hidden from create forms
  if (col.primary) {
    field.showInForm = false;
  }

  // Read-only overrides
  if (options.readOnly?.includes(key)) {
    field.showInForm = false;
  }

  // Hide from list view
  if (options.hideFromList?.includes(key)) {
    field.showInList = false;
  }

  // Enum → select options
  if (col.enumValues && col.enumValues.length > 0) {
    field.type = 'select';
    field.options = col.enumValues.map(v => ({ label: humanizeKey(v), value: v }));
  }

  // Common timestamp patterns → mark as non-editable
  const lowerKey = key.toLowerCase();
  if (lowerKey === 'createdat' || lowerKey === 'created_at' || lowerKey === 'updatedat' || lowerKey === 'updated_at') {
    field.showInForm = false;
  }

  return field;
}
