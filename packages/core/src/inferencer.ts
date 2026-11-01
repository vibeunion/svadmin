/**
 * @svadmin/inferencer
 *
 * Analyzes API response data and infers ResourceDefinition + FieldDefinition[].
 * Can also generate copy-paste-ready Svelte component code.
 */
import type { FieldDefinition, ResourceDefinition } from './types';

// ─── Field Type Inference ────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\//;
const IMAGE_RE = /\.(png|jpe?g|gif|svg|webp|avif|ico)(\?.*)?$/i;
const PHONE_RE = /^\+?[\d\s\-()]{7,}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/;
const COLOR_RE = /^#([0-9a-fA-F]{3,8})$/;

type InferredType = FieldDefinition['type'];

/**
 * Infer the svadmin field type from a single sample value.
 */
export function inferFieldType(key: string, value: unknown): InferredType {
  if (value === null || value === undefined) return 'text';

  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';

  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'string') {
      if (value.every(v => typeof v === 'string' && IMAGE_RE.test(v))) return 'images';
      return 'tags';
    }
    if (value.length > 0 && typeof value[0] === 'number') return 'tags';
    return 'json';
  }

  if (typeof value === 'object') return 'json';

  if (typeof value === 'string') {
    if (COLOR_RE.test(value)) return 'color';
    if (EMAIL_RE.test(value)) return 'email';
    if (IMAGE_RE.test(value)) return 'image';
    if (URL_RE.test(value)) return 'url';
    if (PHONE_RE.test(value)) return 'phone';
    if (ISO_DATE_RE.test(value)) return 'date';
    if (value.length > 200) return 'textarea';

    // Heuristic: key name hints
    const lk = key.toLowerCase();
    if (lk.includes('email')) return 'email';
    if (lk.includes('phone') || lk.includes('tel') || lk.includes('mobile')) return 'phone';
    if (lk.includes('url') || lk.includes('link') || lk.includes('website')) return 'url';
    if (lk.includes('avatar') || lk.includes('image') || lk.includes('photo') || lk.includes('thumbnail') || lk.includes('logo')) return 'image';
    if (lk.includes('color') || lk.includes('colour')) return 'color';
    if (lk.includes('description') || lk.includes('content') || lk.includes('body') || lk.includes('bio') || lk.includes('summary')) return 'textarea';
    if (lk === 'created_at' || lk === 'updated_at' || lk.endsWith('_at') || lk.endsWith('_date') || /\bdate\b/.test(lk)) return 'date';

    return 'text';
  }

  return 'text';
}

// ─── Relation Detection ──────────────────────────────────────

const RELATION_SUFFIXES = ['_id', 'Id', '_ID'];

function isLikelyRelation(key: string): string | null {
  for (const suffix of RELATION_SUFFIXES) {
    if (key.endsWith(suffix)) {
      const resource = key.slice(0, -suffix.length);
      // Pluralize naively
      return resource.endsWith('s') ? resource : resource + 's';
    }
  }
  return null;
}

// ─── Core: Infer from Sample Data ────────────────────────────

export interface InferResult {
  fields: FieldDefinition[];
  resource: ResourceDefinition;
  code: string;
  typeboxCode: string;
  review: InferReview;
  componentCode: {
    list: string;
    create: string;
    edit: string;
    show: string;
  };
}

export type InferReviewWarningCode =
  | 'empty-sample'
  | 'nullable-field'
  | 'mixed-types'
  | 'heuristic-relation'
  | 'heuristic-select'
  | 'unconstrained-field';

export interface InferReviewWarning {
  code: InferReviewWarningCode;
  field?: string;
  message: string;
}

export interface InferReview {
  needsReview: boolean;
  confidence: 'high' | 'medium' | 'low';
  sampleSize: number;
  warnings: InferReviewWarning[];
}

/**
 * Analyze a sample data array and produce a ResourceDefinition.
 * @param resourceName - Name of the resource (e.g. "posts")
 * @param sampleData  - An array of records from the API
 * @param options      - Additional configuration
 */
export function inferResource(
  resourceName: string,
  sampleData: Record<string, unknown>[],
  options: {
    primaryKey?: string;
    label?: string;
  } = {}
): InferResult {
  const primaryKey = options.primaryKey ?? 'id';
  const label = options.label ?? capitalize(resourceName);

  if (!sampleData.length) {
    const emptyResource: ResourceDefinition = { name: resourceName, label, fields: [], primaryKey };
    return {
      fields: [],
      resource: emptyResource,
      code: `// No data available to infer fields for "${resourceName}".\n${generateCode(emptyResource)}`,
      typeboxCode: generateTypeBoxSchemaCode(emptyResource),
      review: {
        needsReview: true,
        confidence: 'low',
        sampleSize: 0,
        warnings: [{
          code: 'empty-sample',
          message: `No sample records were available for "${resourceName}".`,
        }],
      },
      componentCode: {
        list: generateListPageCode(emptyResource),
        create: generateCreatePageCode(emptyResource),
        edit: generateEditPageCode(emptyResource),
        show: generateShowPageCode(emptyResource),
      },
    };
  }

  // Gather all unique keys across all records
  const keySet = new Set<string>();
  for (const row of sampleData) {
    for (const k of Object.keys(row)) keySet.add(k);
  }

  // For each key, infer from all non-null values
  const fields: FieldDefinition[] = [];
  const warnings: InferReviewWarning[] = [];
  for (const key of keySet) {
    // Collect non-null values
    const values = sampleData
      .map(r => r[key])
      .filter(v => v !== null && v !== undefined);

    const sampleValue = values[0];
    let inferredType = inferFieldType(key, sampleValue);
    if (values.length === 0) {
      warnings.push({
        code: 'nullable-field',
        field: key,
        message: `Field "${key}" contains only null or undefined values in the sample.`,
      });
    }

    // Cross-validate: if most values for this key are of a different type, use majority
    const typeCounts = new Map<InferredType, number>();
    for (const v of values) {
      const t = inferFieldType(key, v);
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
    let maxCount = 0;
    for (const [t, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        inferredType = t;
      }
    }
    if (typeCounts.size > 1) {
      warnings.push({
        code: 'mixed-types',
        field: key,
        message: `Field "${key}" contains multiple inferred types; the majority type was selected.`,
      });
    }

    // Check for relation
    const relatedResource = isLikelyRelation(key);
    if (relatedResource) {
      warnings.push({
        code: 'heuristic-relation',
        field: key,
        message: `Relation "${key}" was inferred from its field name.`,
      });
    }

    // Check if it looks like a select (few unique string values)
    const uniqueStrings = new Set(values.filter(v => typeof v === 'string') as string[]);
    const isSelect = inferredType === 'text' && uniqueStrings.size > 1 && uniqueStrings.size <= 10 && values.length >= 5;
    if (isSelect) {
      warnings.push({
        code: 'heuristic-select',
        field: key,
        message: `Select options for "${key}" were inferred from repeated sample values.`,
      });
    }

    const field: FieldDefinition = {
      key,
      label: humanize(key),
      type: relatedResource ? 'relation' : isSelect ? 'select' : inferredType,
      sortable: inferredType === 'text' || inferredType === 'number' || inferredType === 'date',
      searchable: inferredType === 'text' || inferredType === 'email',
      showInList: key !== primaryKey && inferredType !== 'textarea' && inferredType !== 'json' && inferredType !== 'richtext',
      showInForm: key !== primaryKey,
    };

    if (relatedResource) {
      field.resource = relatedResource;
      field.optionLabel = 'name';
      field.optionValue = 'id';
    }

    if (isSelect) {
      field.options = [...uniqueStrings].map(v => ({ label: capitalize(v), value: v }));
    }

    if (field.type === 'json' || field.type === 'richtext') {
      const observed = sampleData.flatMap((row) => (
        Object.prototype.hasOwnProperty.call(row, key) ? [row[key]] : []
      ));
      const expression = closedValueExpression(observed, 0, new WeakSet());
      if (expression) {
        rememberContractExpression(field, expression);
      } else if (field.type === 'richtext') {
        rememberContractExpression(field, 'Type.String()');
      } else {
        warnings.push({
          code: 'unconstrained-field',
          field: key,
          message: `Field "${key}" is omitted from the strict ResourceContract because its sample shape is not a closed JSON value. Author the contract by hand.`,
        });
      }
    }

    fields.push(field);
  }

  // Sort: primaryKey first, then alphabetically
  fields.sort((a, b) => {
    if (a.key === primaryKey) return -1;
    if (b.key === primaryKey) return 1;
    return a.key.localeCompare(b.key);
  });

  const resource: ResourceDefinition = {
    name: resourceName,
    label,
    primaryKey,
    fields,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canShow: true,
  };

  const code = generateCode(resource);
  const typeboxCode = generateTypeBoxSchemaCode(resource);
  const componentCode = {
    list: generateListPageCode(resource),
    create: generateCreatePageCode(resource),
    edit: generateEditPageCode(resource),
    show: generateShowPageCode(resource),
  };

  return {
    fields,
    resource,
    code,
    typeboxCode,
    review: {
      needsReview: warnings.length > 0,
      confidence: warnings.some((warning) => warning.code === 'mixed-types' || warning.code === 'nullable-field')
        ? 'low'
        : warnings.length > 0
          ? 'medium'
          : 'high',
      sampleSize: sampleData.length,
      warnings,
    },
    componentCode,
  };
}

// ─── Code Generation ─────────────────────────────────────────

function propertyKey(key: string): string {
  // 对象字面量里的 __proto__ 会改原型，必须写成字符串键。
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') return JSON.stringify(key);
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

const contractExpressions = new WeakMap<FieldDefinition, string>();
const JSON_SCHEMA_DEPTH = 6;

function unionExpressions(expressions: string[]): string | null {
  const unique = [...new Set(expressions)];
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0] ?? null;
  return `Type.Union([${unique.join(', ')}])`;
}

function valueKind(value: unknown): 'string' | 'boolean' | 'number' | 'array' | 'object' | 'other' {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'other';
}

/** 从样本值生成 closeContractSchema 接受的封闭 TypeBox 表达式。无法封闭时返回 null。 */
function closedValueExpression(values: unknown[], depth: number, seen: WeakSet<object>): string | null {
  if (depth > JSON_SCHEMA_DEPTH) return null;
  const defined = values.filter((value) => value !== undefined);
  if (defined.length === 0) return null;
  const nonNull = defined.filter((value) => value !== null);
  const expression = nonNull.length === 0
    ? 'Type.Null()'
    : closedNonNullExpression(nonNull, depth, seen);
  if (!expression) return null;
  if (nonNull.length !== defined.length && expression !== 'Type.Null()') {
    return `Type.Union([${expression}, Type.Null()])`;
  }
  return expression;
}

function closedNonNullExpression(values: unknown[], depth: number, seen: WeakSet<object>): string | null {
  const kinds = [...new Set(values.map(valueKind))];
  if (kinds.length !== 1) {
    const parts: string[] = [];
    for (const kind of kinds) {
      const expression = closedNonNullExpression(values.filter((value) => valueKind(value) === kind), depth, seen);
      if (!expression) return null;
      parts.push(expression);
    }
    return unionExpressions(parts);
  }
  switch (kinds[0]) {
    case 'string':
      return 'Type.String()';
    case 'boolean':
      return 'Type.Boolean()';
    case 'number':
      return values.every((value) => typeof value === 'number' && Number.isFinite(value)) ? 'Type.Number()' : null;
    case 'array':
      return closedArrayExpression(values.filter(Array.isArray), depth, seen);
    case 'object':
      return closedObjectExpression(values.filter((value): value is Record<string, unknown> => valueKind(value) === 'object'), depth, seen);
    default:
      return null;
  }
}

function closedArrayExpression(values: unknown[][], depth: number, seen: WeakSet<object>): string | null {
  for (const value of values) {
    if (seen.has(value)) return null;
  }
  for (const value of values) seen.add(value);
  try {
    const items = values.flat();
    if (items.length === 0) return null;
    const item = closedValueExpression(items, depth + 1, seen);
    return item ? `Type.Array(${item})` : null;
  } finally {
    for (const value of values) seen.delete(value);
  }
}

function closedObjectExpression(objects: Record<string, unknown>[], depth: number, seen: WeakSet<object>): string | null {
  for (const value of objects) {
    if (seen.has(value)) return null;
  }
  for (const value of objects) seen.add(value);
  try {
    const keys = [...new Set(objects.flatMap((value) => Object.keys(value)))].sort();
    const properties: string[] = [];
    for (const key of keys) {
      const present = objects.filter((value) => Object.prototype.hasOwnProperty.call(value, key));
      const expression = closedValueExpression(present.map((value) => value[key]), depth + 1, seen);
      if (!expression) return null;
      const rendered = present.length === objects.length ? expression : `Type.Optional(${expression})`;
      properties.push(`${propertyKey(key)}: ${rendered}`);
    }
    const body = properties.length > 0 ? ` ${properties.join(', ')} ` : ' ';
    return `Type.Object({${body}}, { additionalProperties: false })`;
  } finally {
    for (const value of objects) seen.delete(value);
  }
}

function rememberContractExpression(field: FieldDefinition, expression: string | null): void {
  if (expression) contractExpressions.set(field, expression);
}

function moduleName(resource: ResourceDefinition): string {
  const safe = resource.name.replace(/[^A-Za-z0-9_$]/g, '_');
  return /^[A-Za-z_$]/.test(safe) ? safe : `resource_${safe}`;
}

/** Closed TypeBox expression, or null when the value cannot be a strict contract field. */
function contractTypeExpression(field: FieldDefinition): string | null {
  const esc = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  switch (field.type) {
    case 'number':
      return 'Type.Number()';
    case 'boolean':
      return 'Type.Boolean()';
    case 'date':
      return "Type.String({ format: 'date-time' })";
    case 'email':
      return "Type.String({ format: 'email' })";
    case 'url':
    case 'image':
      return "Type.String({ format: 'uri' })";
    case 'phone':
      return "Type.String({ pattern: '^\\\\+?[\\\\d\\\\s\\\\-()]{7,}$' })";
    case 'tags':
      return 'Type.Array(Type.String())';
    case 'images':
      return "Type.Array(Type.String({ format: 'uri' }))";
    case 'select':
      if (field.options && field.options.length > 0) {
        const literals = field.options.map((option) => `Type.Literal('${esc(String(option.value))}')`).join(', ');
        return `Type.Union([${literals}])`;
      }
      return 'Type.String()';
    case 'relation':
      return 'Type.Union([Type.String(), Type.Number()])';
    case 'daterange':
      return 'Type.Union([Type.Object({ start: Type.Union([Type.String(), Type.Null()]), end: Type.Union([Type.String(), Type.Null()]) }, { additionalProperties: false }), Type.Null()])';
    case 'json':
      return contractExpressions.get(field) ?? null;
    case 'richtext':
      return contractExpressions.get(field) ?? 'Type.String()';
    case 'datetime':
    case 'time':
    case 'textarea':
    case 'text':
    case 'color':
    default:
      return 'Type.String()';
  }
}

function idTypeExpression(field: FieldDefinition | undefined): string {
  if (!field) return 'Type.String()';
  if (field.type === 'number') return 'Type.Number()';
  if (field.type === 'relation') return 'Type.Union([Type.String(), Type.Number()])';
  return 'Type.String()';
}

function schemaProperty(key: string, expression: string, optional: boolean): string {
  const value = optional ? `Type.Optional(${expression})` : expression;
  return `  ${propertyKey(key)}: ${value},`;
}

function objectConst(name: string, properties: string[]): string {
  const body = properties.length > 0 ? `\n${properties.join('\n')}\n` : '\n';
  return `const ${name} = Type.Object({${body}}, { additionalProperties: false });`;
}

function definitionFieldLines(fields: FieldDefinition[]): string {
  const esc = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return fields.map((field) => {
    const lines = [`    { key: '${esc(field.key)}', label: '${esc(field.label)}', type: '${field.type}'`];
    if (field.sortable) lines.push('      sortable: true');
    if (field.searchable) lines.push('      searchable: true');
    if (field.showInList === false) lines.push('      showInList: false');
    if (field.showInForm === false) lines.push('      showInForm: false');
    if (field.resource) {
      lines.push(`      resource: '${esc(field.resource)}'`);
      lines.push(`      optionLabel: '${esc(field.optionLabel ?? 'name')}'`);
      lines.push(`      optionValue: '${esc(field.optionValue ?? 'id')}'`);
    }
    if (field.options) lines.push(`      options: ${JSON.stringify(field.options)}`);
    return `${lines.join(',\n')} }`;
  }).join(',\n');
}

function contractParts(resource: ResourceDefinition): { idField: FieldDefinition | undefined; writable: FieldDefinition[] } {
  const sourceKey = resource.primaryKey ?? 'id';
  const idField = resource.fields.find((field) => field.key === sourceKey) ?? resource.fields.find((field) => field.key === 'id');
  const writable = resource.fields.filter((field) => (
    field.key !== sourceKey
    && field.key !== 'id'
    && field.showInForm !== false
    && contractTypeExpression(field) !== null
  ));
  return { idField, writable };
}

function definitionFields(resource: ResourceDefinition): FieldDefinition[] {
  const sourceKey = resource.primaryKey ?? 'id';
  const idField = resource.fields.find((field) => field.key === sourceKey) ?? resource.fields.find((field) => field.key === 'id');
  const rest = resource.fields.filter((field) => field.key !== sourceKey && field.key !== 'id');
  const idDefinition: FieldDefinition = idField
    ? { ...idField, key: 'id', showInForm: false }
    : { key: 'id', label: 'ID', type: 'text', showInForm: false, showInList: false };
  return [idDefinition, ...rest];
}

function handAuthoredContractNotes(resource: ResourceDefinition): string {
  const notes = resource.fields.flatMap((field) => {
    if (field.type !== 'json' && field.type !== 'richtext') return [];
    if (contractTypeExpression(field) !== null) return [];
    return [
      `// @svadmin hand-authored-contract ${JSON.stringify(field.key)}: ${field.type} is omitted from the strict contract because its sample shape is not a closed JSON value. Author a closed Type.Object schema before records containing this field can pass validation.`,
    ];
  });
  return notes.length > 0 ? `${notes.join('\n')}\n` : '';
}

function generateCode(resource: ResourceDefinition): string {
  const name = moduleName(resource);
  const literalName = resource.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const literalLabel = resource.label.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const { idField, writable } = contractParts(resource);
  const idType = idTypeExpression(idField);
  const recordProps = [
    schemaProperty('id', idType, false),
    ...writable.map((field) => schemaProperty(field.key, contractTypeExpression(field) ?? 'Type.String()', field.required !== true)),
  ];
  const createProps = writable.map((field) => schemaProperty(field.key, contractTypeExpression(field) ?? 'Type.String()', field.required !== true));
  const updateProps = writable.map((field) => schemaProperty(field.key, contractTypeExpression(field) ?? 'Type.String()', true));
  const sourceKey = resource.primaryKey ?? 'id';
  const projection = sourceKey === 'id'
    ? ''
    : `// Source primary key "${sourceKey.replace(/"/g, '\\"')}" is projected onto the contract id.\n`;
  return `import { Type } from 'typebox';
import { defineResource, type AdminResourceDefinition } from '@svadmin/core';

${projection}${handAuthoredContractNotes(resource)}${objectConst(`${name}RecordSchema`, recordProps)}

${objectConst(`${name}CreateSchema`, createProps)}

${objectConst(`${name}UpdateSchema`, updateProps)}

${objectConst(`${name}DeleteSchema`, [schemaProperty('id', idType, false)])}

/** Runtime contract consumed by AutoTable and AutoForm through resolveResourceContract(). */
export const ${name}Resource = defineResource('${literalName}', {
  record: ${name}RecordSchema,
  create: ${name}CreateSchema,
  update: ${name}UpdateSchema,
  delete: ${name}DeleteSchema,
});

/** Register this definition on the admin config resources array. */
export const ${name}Definition: AdminResourceDefinition = {
  name: '${literalName}',
  label: '${literalLabel}',
  primaryKey: 'id',
  canCreate: ${resource.canCreate ?? true},
  canEdit: ${resource.canEdit ?? true},
  canDelete: ${resource.canDelete ?? true},
  canShow: ${resource.canShow ?? true},
  contract: ${name}Resource,
  fields: [
${definitionFieldLines(definitionFields(resource))}
  ],
};
`;
}

/**
 * Generate Svelte 5 ListPage component code for a resource.
 */
export function generateListPageCode(resource: ResourceDefinition): string {
  const name = moduleName(resource);
  return `<script lang="ts">
  import { ListPage, AutoTable } from '@svadmin/ui';
  import { ${name}Definition } from '../${resource.name}.resource';

  const resourceName = ${name}Definition.name;
</script>

<ListPage {resourceName}>
  <AutoTable {resourceName} />
</ListPage>
`;
}

/**
 * Generate Svelte 5 CreatePage component code for a resource.
 */
export function generateCreatePageCode(resource: ResourceDefinition): string {
  const name = moduleName(resource);
  return `<script lang="ts">
  import { CreatePage, AutoForm } from '@svadmin/ui';
  import { ${name}Definition } from '../${resource.name}.resource';

  const resourceName = ${name}Definition.name;
</script>

<CreatePage {resourceName}>
  <AutoForm {resourceName} mode="create" />
</CreatePage>
`;
}

/**
 * Generate Svelte 5 EditPage component code for a resource.
 */
export function generateEditPageCode(resource: ResourceDefinition): string {
  const name = moduleName(resource);
  return `<script lang="ts">
  import { EditPage, AutoForm } from '@svadmin/ui';
  import { ${name}Definition } from '../${resource.name}.resource';

  interface Props {
    id?: string | number;
  }

  let { id }: Props = $props();
  const resourceName = ${name}Definition.name;
</script>

<EditPage {resourceName} {id}>
  <AutoForm {resourceName} {id} mode="edit" />
</EditPage>
`;
}

/**
 * Generate Svelte 5 ShowPage component code for a resource.
 */
export function generateShowPageCode(resource: ResourceDefinition): string {
  const name = moduleName(resource);
  return `<script lang="ts">
  import { ShowPage, AutoForm } from '@svadmin/ui';
  import { ${name}Definition } from '../${resource.name}.resource';

  interface Props {
    id?: string | number;
  }

  let { id }: Props = $props();
  const resourceName = ${name}Definition.name;
</script>

<ShowPage {resourceName} {id}>
  <AutoForm {resourceName} {id} mode="show" />
</ShowPage>
`;
}

/**
 * Generate TypeScript code for ResourceDefinition.
 */
export function generateResourceCode(resource: ResourceDefinition): string {
  return generateCode(resource);
}

/** Alias that makes the ResourceContract output explicit for callers. */
export function generateResourceContractCode(resource: ResourceDefinition): string {
  return generateCode(resource);
}

/**
 * Generate TypeScript code for TypeBox schema definition.
 */
export function generateTypeBoxSchemaCode(resource: ResourceDefinition): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const schemaProps = resource.fields.map((f: FieldDefinition) => {
    let typeDef: string;
    const isRequired = f.required === true;

    switch (f.type) {
      case 'number':
        typeDef = 'Type.Number()';
        break;
      case 'boolean':
        typeDef = 'Type.Boolean()';
        break;
      case 'date':
        typeDef = "Type.String({ format: 'date-time' })";
        break;
      case 'datetime':
      case 'time':
        // 原生输入没有强制时区，不把本地时间误标为 RFC3339 date-time。
        typeDef = 'Type.String()';
        break;
      case 'daterange':
        // 与 DateRangeInput 一致：两个端点明确存在，未选择时为 null。
        typeDef = 'Type.Union([Type.Object({ start: Type.Union([Type.String(), Type.Null()]), end: Type.Union([Type.String(), Type.Null()]) }, { additionalProperties: false }), Type.Null()])';
        break;
      case 'email':
        typeDef = "Type.String({ format: 'email' })";
        break;
      case 'url':
        typeDef = "Type.String({ format: 'uri' })";
        break;
      case 'phone':
        typeDef = "Type.String({ pattern: '^\\\\+?[\\\\d\\\\s\\\\-()]{7,}$' })";
        break;
      case 'tags':
        typeDef = 'Type.Array(Type.String())';
        break;
      case 'images':
        typeDef = "Type.Array(Type.String({ format: 'uri' }))";
        break;
      case 'json':
        typeDef = contractExpressions.get(f) ?? 'Type.Record(Type.String(), Type.Unknown())';
        break;
      case 'select':
        if (f.options && f.options.length > 0) {
          const literals = f.options.map(o => `Type.Literal('${esc(String(o.value))}')`).join(', ');
          typeDef = `Type.Union([${literals}])`;
        } else {
          typeDef = 'Type.String()';
        }
        break;
      case 'relation':
        typeDef = 'Type.Union([Type.String(), Type.Number()])';
        break;
      case 'richtext':
        typeDef = contractExpressions.get(f) ?? 'Type.String()';
        break;
      case 'textarea':
      case 'text':
      default:
        typeDef = 'Type.String()';
        break;
    }

    if (!isRequired && f.key !== (resource.primaryKey ?? 'id')) {
      typeDef = `Type.Optional(${typeDef})`;
    }

    return `  ${f.key}: ${typeDef},`;
  }).join('\n');

  const baseName = resource.name.endsWith('s') ? resource.name.slice(0, -1) : resource.name;
  const typeName = capitalize(baseName);

  return `import { Type, type Static } from 'typebox';

export const ${typeName}Schema = Type.Object({
${schemaProps}
}, { additionalProperties: false });

export type ${typeName} = Static<typeof ${typeName}Schema>;
`;
}

/**
 * Universal code generator for resource definition or Svelte page components.
 */
export function generateComponentCode(
  resource: ResourceDefinition,
  kind: 'resource' | 'typebox' | 'list' | 'create' | 'edit' | 'show'
): string {
  switch (kind) {
    case 'resource':
      return generateResourceCode(resource);
    case 'typebox':
      return generateTypeBoxSchemaCode(resource);
    case 'list':
      return generateListPageCode(resource);
    case 'create':
      return generateCreatePageCode(resource);
    case 'edit':
      return generateEditPageCode(resource);
    case 'show':
      return generateShowPageCode(resource);
  }
}

// ─── Utilities ───────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Generate a complete InferResult bundle from an existing ResourceDefinition.
 */
export function generateResourceBundle(resource: ResourceDefinition): InferResult {
  return {
    fields: resource.fields,
    resource,
    code: generateResourceCode(resource),
    typeboxCode: generateTypeBoxSchemaCode(resource),
    review: {
      needsReview: false,
      confidence: 'high',
      sampleSize: 0,
      warnings: [],
    },
    componentCode: {
      list: generateListPageCode(resource),
      create: generateCreatePageCode(resource),
      edit: generateEditPageCode(resource),
      show: generateShowPageCode(resource),
    },
  };
}

export { inferFromOpenAPI } from './inferencer-openapi';
export type { InferFromOpenAPIOptions } from './inferencer-openapi';
export { inferFromGraphQL, GRAPHQL_INTROSPECTION_QUERY } from './inferencer-graphql';
export type { InferFromGraphQLOptions, GraphQLIntrospectionSchema, GraphQLTypeDescriptor } from './inferencer-graphql';

export type { FieldDefinition, ResourceDefinition } from './types';
