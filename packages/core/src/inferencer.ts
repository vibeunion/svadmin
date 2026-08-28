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
  componentCode: {
    list: string;
    create: string;
    edit: string;
    show: string;
  };
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
      code: `// No data available to infer fields for "${resourceName}".`,
      typeboxCode: generateTypeBoxSchemaCode(emptyResource),
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
  for (const key of keySet) {
    // Collect non-null values
    const values = sampleData
      .map(r => r[key])
      .filter(v => v !== null && v !== undefined);

    const sampleValue = values[0];
    let inferredType = inferFieldType(key, sampleValue);

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

    // Check for relation
    const relatedResource = isLikelyRelation(key);

    // Check if it looks like a select (few unique string values)
    const uniqueStrings = new Set(values.filter(v => typeof v === 'string') as string[]);
    const isSelect = inferredType === 'text' && uniqueStrings.size > 1 && uniqueStrings.size <= 10 && values.length >= 5;

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

  return { fields, resource, code, typeboxCode, componentCode };
}

// ─── Code Generation ─────────────────────────────────────────

function generateCode(resource: ResourceDefinition): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const fieldsCode = resource.fields.map((f: FieldDefinition) => {
    const lines = [
      `    { key: '${esc(f.key)}', label: '${esc(f.label)}', type: '${f.type}'`,
    ];
    if (f.sortable) lines.push(`      sortable: true`);
    if (f.searchable) lines.push(`      searchable: true`);
    if (f.showInList === false) lines.push(`      showInList: false`);
    if (f.showInForm === false) lines.push(`      showInForm: false`);
    if (f.resource) {
      lines.push(`      resource: '${f.resource}'`);
      lines.push(`      optionLabel: '${f.optionLabel}'`);
      lines.push(`      optionValue: '${f.optionValue}'`);
    }
    if (f.options) {
      lines.push(`      options: ${JSON.stringify(f.options)}`);
    }

    return lines.join(',\n') + ' }';
  }).join(',\n');

  return `import type { ResourceDefinition } from '@svadmin/core';

export const ${resource.name}Resource: ResourceDefinition = {
  name: '${resource.name}',
  label: '${resource.label}',
  primaryKey: '${resource.primaryKey ?? 'id'}',
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canShow: true,
  fields: [
${fieldsCode}
  ],
};
`;
}

/**
 * Generate Svelte 5 ListPage component code for a resource.
 */
export function generateListPageCode(resource: ResourceDefinition): string {
  return `<script lang="ts">
  import { ListPage, AutoTable } from '@svadmin/ui';
</script>

<ListPage resourceName="${resource.name}">
  <AutoTable resourceName="${resource.name}" />
</ListPage>
`;
}

/**
 * Generate Svelte 5 CreatePage component code for a resource.
 */
export function generateCreatePageCode(resource: ResourceDefinition): string {
  return `<script lang="ts">
  import { CreatePage, AutoForm } from '@svadmin/ui';
</script>

<CreatePage resourceName="${resource.name}">
  <AutoForm resourceName="${resource.name}" mode="create" />
</CreatePage>
`;
}

/**
 * Generate Svelte 5 EditPage component code for a resource.
 */
export function generateEditPageCode(resource: ResourceDefinition): string {
  return `<script lang="ts">
  import { EditPage, AutoForm } from '@svadmin/ui';

  interface Props {
    id?: string | number;
  }

  let { id }: Props = $props();
</script>

<EditPage resourceName="${resource.name}" {id}>
  <AutoForm resourceName="${resource.name}" {id} mode="edit" />
</EditPage>
`;
}

/**
 * Generate Svelte 5 ShowPage component code for a resource.
 */
export function generateShowPageCode(resource: ResourceDefinition): string {
  return `<script lang="ts">
  import { ShowPage, AutoForm } from '@svadmin/ui';

  interface Props {
    id?: string | number;
  }

  let { id }: Props = $props();
</script>

<ShowPage resourceName="${resource.name}" {id}>
  <AutoForm resourceName="${resource.name}" {id} mode="show" />
</ShowPage>
`;
}

/**
 * Generate TypeScript code for ResourceDefinition.
 */
export function generateResourceCode(resource: ResourceDefinition): string {
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
        typeDef = 'Type.Record(Type.String(), Type.Unknown())';
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
      case 'textarea':
      case 'richtext':
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

  return `import { Type, type Static } from '@sinclair/typebox';

export const ${typeName}Schema = Type.Object({
${schemaProps}
});

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
