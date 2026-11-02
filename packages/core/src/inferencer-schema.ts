/**
 * @svadmin/inferencer-schema
 *
 * Infers ResourceDefinition + FieldDefinition[] from database column metadata
 * (e.g. Supabase, PostgreSQL information_schema, Drizzle, Prisma)
 * or JSON Schema / OpenAPI component definitions.
 */
import type { FieldDefinition, ResourceDefinition } from './types';
import type { InferResult, InferReviewWarning } from './inferencer';
import { generateResourceBundle } from './inferencer';

// ─── Database Column Types ───────────────────────────────────

export interface DatabaseColumnMeta {
  name: string;
  type: string;
  nullable?: boolean;
  isPrimary?: boolean;
  defaultValue?: unknown;
  isForeignKey?: boolean;
  referencesResource?: string;
  description?: string;
}

export interface InferFromDatabaseOptions {
  primaryKey?: string;
  label?: string;
}

// ─── JSON Schema Types ───────────────────────────────────────

export interface JSONSchemaProperty {
  type?: string | string[];
  format?: string;
  title?: string;
  description?: string;
  enum?: unknown[];
  items?: Record<string, unknown>;
  default?: unknown;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface JSONSchemaInput {
  title?: string;
  description?: string;
  type?: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

const RELATION_SUFFIXES = ['_id', 'Id', '_ID'];

function isLikelyRelation(key: string): string | null {
  for (const suffix of RELATION_SUFFIXES) {
    if (key.endsWith(suffix)) {
      const resource = key.slice(0, -suffix.length);
      return resource.endsWith('s') ? resource : resource + 's';
    }
  }
  return null;
}

// ─── Database Column Inferencer ──────────────────────────────

/**
 * Infer ResourceDefinition and code bundle from database column metadata.
 */
export function inferFromDatabaseColumns(
  resourceName: string,
  columns: DatabaseColumnMeta[],
  options: InferFromDatabaseOptions = {},
): InferResult {
  const primaryKey = options.primaryKey ?? columns.find(c => c.isPrimary)?.name ?? 'id';
  const label = options.label ?? capitalize(resourceName);
  const fields: FieldDefinition[] = [];
  const warnings: InferReviewWarning[] = [];

  for (const col of columns) {
    const rawType = (col.type ?? '').toLowerCase().replace(/\(.*\)/, '').trim();
    let type: FieldDefinition['type'];

    if (col.isPrimary || col.name === primaryKey) {
      type = /int|serial|numeric|decimal|float|bigint/.test(rawType) ? 'number' : 'text';
    } else if (col.isForeignKey || col.referencesResource || isLikelyRelation(col.name)) {
      type = 'relation';
    } else if (/bool|boolean/.test(rawType)) {
      type = 'boolean';
    } else if (/int|integer|numeric|decimal|real|float|double|serial|bigint|smallint|money/.test(rawType)) {
      type = 'number';
    } else if (/timestamptz|timestamp|date|time/.test(rawType)) {
      type = 'date';
    } else if (/json|jsonb/.test(rawType)) {
      type = 'json';
    } else {
      const lk = col.name.toLowerCase();
      if (lk.includes('email')) type = 'email';
      else if (lk.includes('phone') || lk.includes('tel') || lk.includes('mobile')) type = 'phone';
      else if (lk.includes('url') || lk.includes('link') || lk.includes('website')) type = 'url';
      else if (lk.includes('avatar') || lk.includes('image') || lk.includes('photo') || lk.includes('logo')) type = 'image';
      else if (lk.includes('description') || lk.includes('content') || lk.includes('body') || lk.includes('summary') || /text|longtext/.test(rawType)) type = 'textarea';
      else if (col.isForeignKey || isLikelyRelation(col.name)) type = 'relation';
      else type = 'text';
    }

    const field: FieldDefinition = {
      key: col.name,
      label: humanize(col.name),
      type,
    };

    if (col.description) {
      field.description = col.description;
    }

    if (col.isPrimary || col.name === primaryKey) {
      field.showInCreate = false;
      field.sortable = true;
      field.filterable = true;
    } else {
      if (col.nullable === false && col.defaultValue === undefined) {
        field.required = true;
      }
      if (col.defaultValue !== undefined) {
        field.defaultValue = col.defaultValue;
      }
    }

    if (type === 'relation') {
      const relTarget = col.referencesResource ?? isLikelyRelation(col.name);
      if (relTarget) {
        field.resource = relTarget;
      }
      field.optionLabel = 'title';
      field.sortable = true;
      field.filterable = true;
    }

    fields.push(field);
  }

  const resource: ResourceDefinition = {
    name: resourceName,
    label,
    primaryKey,
    fields,
  };

  const bundle = generateResourceBundle(resource);
  bundle.review = {
    needsReview: warnings.length > 0,
    confidence: 'high',
    sampleSize: columns.length,
    warnings,
  };
  return bundle;
}

// ─── JSON Schema Inferencer ──────────────────────────────────

/**
 * Infer ResourceDefinition and code bundle from a JSON Schema / OpenAPI schema object.
 */
export function inferFromJSONSchema(
  resourceName: string,
  schema: JSONSchemaInput,
  options: { primaryKey?: string; label?: string } = {},
): InferResult {
  const primaryKey = options.primaryKey ?? 'id';
  const label = options.label ?? schema.title ?? capitalize(resourceName);
  const fields: FieldDefinition[] = [];
  const warnings: InferReviewWarning[] = [];
  const requiredSet = new Set(schema.required ?? []);
  const properties = schema.properties ?? {};

  for (const [key, prop] of Object.entries(properties)) {
    const rawType = Array.isArray(prop.type) ? prop.type[0] : prop.type;
    let type: FieldDefinition['type'];
    let fieldOptions: { label: string; value: string | number }[] | undefined;

    if (prop.enum && Array.isArray(prop.enum) && prop.enum.length > 0) {
      type = 'select';
      fieldOptions = prop.enum.map(val => ({ label: humanize(String(val)), value: val as string | number }));
    } else if (rawType === 'boolean') {
      type = 'boolean';
    } else if (rawType === 'number' || rawType === 'integer') {
      type = 'number';
    } else if (rawType === 'array') {
      const items = prop.items as { type?: string; format?: string } | undefined;
      if (items?.type === 'string' && items.format === 'uri') {
        type = 'images';
      } else {
        type = 'tags';
      }
    } else if (rawType === 'object') {
      type = 'json';
    } else {
      if (prop.format === 'date-time' || prop.format === 'date') {
        type = 'date';
      } else if (prop.format === 'email') {
        type = 'email';
      } else if (prop.format === 'uri' || prop.format === 'url') {
        type = 'url';
      } else {
        const lk = key.toLowerCase();
        if (lk.includes('email')) type = 'email';
        else if (lk.includes('phone') || lk.includes('tel') || lk.includes('mobile')) type = 'phone';
        else if (lk.includes('url') || lk.includes('link') || lk.includes('website')) type = 'url';
        else if (lk.includes('avatar') || lk.includes('image') || lk.includes('photo') || lk.includes('logo')) type = 'image';
        else if (lk.includes('description') || lk.includes('content') || lk.includes('body') || lk.includes('summary')) type = 'textarea';
        else if (isLikelyRelation(key)) type = 'relation';
        else type = 'text';
      }
    }

    const field: FieldDefinition = {
      key,
      label: prop.title || humanize(key),
      type,
    };

    if (prop.description) field.description = prop.description;
    if (requiredSet.has(key)) field.required = true;
    if (prop.default !== undefined) field.defaultValue = prop.default;
    if (fieldOptions) field.options = fieldOptions;

    if (key === primaryKey) {
      field.showInCreate = false;
      field.sortable = true;
      field.filterable = true;
    }

    if (type === 'relation') {
      const relTarget = isLikelyRelation(key);
      if (relTarget) {
        field.resource = relTarget;
      }
      field.optionLabel = 'title';
      field.sortable = true;
      field.filterable = true;
    }

    fields.push(field);
  }

  const resource: ResourceDefinition = {
    name: resourceName,
    label,
    primaryKey,
    fields,
  };

  const bundle = generateResourceBundle(resource);
  bundle.review = {
    needsReview: warnings.length > 0,
    confidence: 'high',
    sampleSize: Object.keys(properties).length,
    warnings,
  };
  return bundle;
}
