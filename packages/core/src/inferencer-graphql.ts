/**
 * GraphQL Schema / Introspection → ResourceDefinition converter
 *
 * Parses a GraphQL introspection JSON result or schema definition and generates
 * ResourceDefinition[] by analyzing entity types, fields, enums, queries, and mutations.
 */
import type { FieldDefinition, ResourceDefinition } from './types';

// ─── GraphQL Introspection Types ─────────────────────────────

export interface GraphQLIntrospectionSchema {
  __schema?: GraphQLSchemaBody;
  data?: {
    __schema?: GraphQLSchemaBody;
  };
  types?: GraphQLTypeDescriptor[];
}

export interface GraphQLSchemaBody {
  queryType?: { name?: string | null } | null;
  mutationType?: { name?: string | null } | null;
  subscriptionType?: { name?: string | null } | null;
  types: GraphQLTypeDescriptor[];
}

export interface GraphQLTypeDescriptor {
  kind: 'SCALAR' | 'OBJECT' | 'INTERFACE' | 'UNION' | 'ENUM' | 'INPUT_OBJECT' | 'LIST' | 'NON_NULL';
  name: string | null;
  description?: string | null;
  fields?: GraphQLFieldDescriptor[] | null;
  inputFields?: GraphQLInputValueDescriptor[] | null;
  interfaces?: GraphQLTypeRef[] | null;
  enumValues?: Array<{ name: string; description?: string | null }> | null;
  possibleTypes?: GraphQLTypeRef[] | null;
}

export interface GraphQLFieldDescriptor {
  name: string;
  description?: string | null;
  args?: GraphQLInputValueDescriptor[];
  type: GraphQLTypeRef;
  isDeprecated?: boolean;
  deprecationReason?: string | null;
}

export interface GraphQLInputValueDescriptor {
  name: string;
  description?: string | null;
  type: GraphQLTypeRef;
  defaultValue?: string | null;
}

export interface GraphQLTypeRef {
  kind: 'SCALAR' | 'OBJECT' | 'INTERFACE' | 'UNION' | 'ENUM' | 'INPUT_OBJECT' | 'LIST' | 'NON_NULL';
  name?: string | null;
  ofType?: GraphQLTypeRef | null;
}

/**
 * Standard GraphQL introspection query string to fetch the schema from any GraphQL endpoint.
 */
export const GRAPHQL_INTROSPECTION_QUERY = `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        type {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
      enumValues(includeDeprecated: true) {
        name
        description
      }
    }
  }
}`;

// ─── Core Type Resolution ────────────────────────────────────

interface ResolvedTypeInfo {
  baseName: string;
  kind: string;
  isList: boolean;
  isRequired: boolean;
}

function unwrapType(typeRef: GraphQLTypeRef): ResolvedTypeInfo {
  let current: GraphQLTypeRef = typeRef;
  let isRequired = false;
  let isList = false;

  if (current.kind === 'NON_NULL') {
    isRequired = true;
    if (current.ofType) current = current.ofType;
  }

  if (current.kind === 'LIST') {
    isList = true;
    if (current.ofType) {
      current = current.ofType;
      if (current.kind === 'NON_NULL') {
        if (current.ofType) current = current.ofType;
      }
    }
  }

  return {
    baseName: current.name ?? 'String',
    kind: current.kind,
    isList,
    isRequired,
  };
}

function mapGraphQLTypeToFieldType(
  key: string,
  typeInfo: ResolvedTypeInfo,
  enumMap: Map<string, string[]>
): FieldDefinition['type'] {
  const { baseName, isList } = typeInfo;
  const lk = key.toLowerCase();

  // Enums
  if (enumMap.has(baseName)) return 'select';

  // Arrays / Lists
  if (isList) {
    if (lk.includes('image') || lk.includes('photo') || lk.includes('avatar') || lk.includes('picture')) {
      return 'images';
    }
    return 'tags';
  }

  // Built-in Scalars & Custom Scalars
  switch (baseName) {
    case 'Int':
    case 'Float':
    case 'Decimal':
    case 'BigInt':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'Date':
    case 'DateTime':
    case 'Time':
    case 'Timestamp':
      return 'date';
    case 'JSON':
    case 'JsonObject':
    case 'JSONObject':
    case 'Json':
      return 'json';
    case 'ID':
      return 'text';
    case 'String':
    default:
      break;
  }

  // String field heuristics based on key name
  if (lk.includes('email')) return 'email';
  if (lk.includes('phone') || lk.includes('tel') || lk.includes('mobile')) return 'phone';
  if (lk.includes('url') || lk.includes('link') || lk.includes('website')) return 'url';
  if (lk.includes('avatar') || lk.includes('image') || lk.includes('photo') || lk.includes('thumbnail') || lk.includes('logo')) return 'image';
  if (lk.includes('color') || lk.includes('colour')) return 'color';
  if (lk.includes('description') || lk.includes('content') || lk.includes('body') || lk.includes('bio') || lk.includes('summary')) return 'textarea';
  if (lk === 'created_at' || lk === 'updated_at' || lk.endsWith('_at') || lk.endsWith('_date') || /\bdate\b/.test(lk)) return 'date';

  return 'text';
}

// ─── GraphQL SDL Parser (Fallback for raw .graphql schemas) ──

function parseGraphQLSDL(sdl: string): GraphQLSchemaBody {
  const types: GraphQLTypeDescriptor[] = [];
  const queryType: { name: string } = { name: 'Query' };
  const mutationType: { name: string } = { name: 'Mutation' };

  // Remove comments
  const cleanSDL = sdl.replace(/#[^\n\r]*/g, '');

  // Extract enums: enum Status { DRAFT PUBLISHED ARCHIVED }
  const enumRegex = /enum\s+([A-Za-z0-9_]+)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = enumRegex.exec(cleanSDL)) !== null) {
    const enumName = match[1];
    const rawValues = match[2].split(/\s+/).filter(Boolean);
    types.push({
      kind: 'ENUM',
      name: enumName,
      enumValues: rawValues.map(v => ({ name: v })),
    });
  }

  // Extract types: type Post { id: ID! title: String ... }
  const typeRegex = /type\s+([A-Za-z0-9_]+)\s*(?:implements\s+[A-Za-z0-9_&,\s]+)?\s*\{([^}]+)\}/g;
  while ((match = typeRegex.exec(cleanSDL)) !== null) {
    const typeName = match[1];
    const fieldsBody = match[2];
    const fieldLines = fieldsBody.split('\n').map(l => l.trim()).filter(Boolean);
    const fields: GraphQLFieldDescriptor[] = [];

    for (const line of fieldLines) {
      // fieldName(args): TypeName!
      const fieldMatch = /^([A-Za-z0-9_]+)(?:\([^)]*\))?\s*:\s*([[\]A-Za-z0-9_!]+)/.exec(line);
      if (!fieldMatch) continue;

      const fName = fieldMatch[1];
      const rawType = fieldMatch[2];

      const isNonNullable = rawType.endsWith('!');
      const cleanType = isNonNullable ? rawType.slice(0, -1) : rawType;
      const isList = cleanType.startsWith('[') && cleanType.endsWith(']');
      const innerType = isList ? cleanType.slice(1, -1).replace(/!$/, '') : cleanType;

      let typeRef: GraphQLTypeRef = {
        kind: 'SCALAR',
        name: innerType,
      };

      if (isList) {
        typeRef = {
          kind: 'LIST',
          ofType: typeRef,
        };
      }

      if (isNonNullable) {
        typeRef = {
          kind: 'NON_NULL',
          ofType: typeRef,
        };
      }

      fields.push({
        name: fName,
        type: typeRef,
      });
    }

    types.push({
      kind: 'OBJECT',
      name: typeName,
      fields,
    });
  }

  return {
    queryType,
    mutationType,
    types,
  };
}

// ─── Core: inferFromGraphQL ──────────────────────────────────

export interface InferFromGraphQLOptions {
  /** Include only specific type names */
  include?: string[];
  /** Exclude specific type names */
  exclude?: string[];
  /** Custom primary key (default: 'id') */
  primaryKey?: string;
}

/**
 * Parses a GraphQL schema (introspection object or SDL string) and returns ResourceDefinition[].
 */
export function inferFromGraphQL(
  schemaOrIntrospection: GraphQLIntrospectionSchema | GraphQLSchemaBody | string | unknown,
  options: InferFromGraphQLOptions = {}
): ResourceDefinition[] {
  const { primaryKey = 'id', include, exclude } = options;

  let schemaBody: GraphQLSchemaBody;

  if (typeof schemaOrIntrospection === 'string') {
    schemaBody = parseGraphQLSDL(schemaOrIntrospection);
  } else if (
    schemaOrIntrospection &&
    typeof schemaOrIntrospection === 'object' &&
    'data' in schemaOrIntrospection &&
    (schemaOrIntrospection as { data?: { __schema?: GraphQLSchemaBody } }).data?.__schema
  ) {
    schemaBody = (schemaOrIntrospection as { data: { __schema: GraphQLSchemaBody } }).data.__schema;
  } else if (
    schemaOrIntrospection &&
    typeof schemaOrIntrospection === 'object' &&
    '__schema' in schemaOrIntrospection &&
    (schemaOrIntrospection as { __schema?: GraphQLSchemaBody }).__schema
  ) {
    schemaBody = (schemaOrIntrospection as { __schema: GraphQLSchemaBody }).__schema;
  } else if (
    schemaOrIntrospection &&
    typeof schemaOrIntrospection === 'object' &&
    'types' in schemaOrIntrospection &&
    Array.isArray((schemaOrIntrospection as GraphQLSchemaBody).types)
  ) {
    schemaBody = schemaOrIntrospection as GraphQLSchemaBody;
  } else {
    return [];
  }

  const types = schemaBody.types ?? [];
  const queryTypeName = schemaBody.queryType?.name ?? 'Query';
  const mutationTypeName = schemaBody.mutationType?.name ?? 'Mutation';
  const subscriptionTypeName = schemaBody.subscriptionType?.name ?? 'Subscription';

  // Build enum map
  const enumMap = new Map<string, string[]>();
  for (const t of types) {
    if (t.kind === 'ENUM' && t.name) {
      const values = (t.enumValues ?? []).map(ev => ev.name);
      enumMap.set(t.name, values);
    }
  }

  // Build object types map
  const objectTypeMap = new Map<string, GraphQLTypeDescriptor>();
  for (const t of types) {
    if (t.kind === 'OBJECT' && t.name) {
      objectTypeMap.set(t.name, t);
    }
  }

  // Find root query & mutation fields to detect capabilities
  const queryFields = new Set<string>();
  const queryType = objectTypeMap.get(queryTypeName);
  if (queryType?.fields) {
    for (const f of queryType.fields) queryFields.add(f.name.toLowerCase());
  }

  const mutationFields = new Set<string>();
  const mutationType = objectTypeMap.get(mutationTypeName);
  if (mutationType?.fields) {
    for (const f of mutationType.fields) mutationFields.add(f.name.toLowerCase());
  }

  const resources: ResourceDefinition[] = [];

  for (const typeObj of types) {
    const typeName = typeObj.name;
    if (!typeName) continue;

    // Filter out root types, internal types (__*), and input objects
    if (
      typeName.startsWith('__') ||
      typeName === queryTypeName ||
      typeName === mutationTypeName ||
      typeName === subscriptionTypeName ||
      typeObj.kind !== 'OBJECT' ||
      !typeObj.fields ||
      typeObj.fields.length === 0
    ) {
      continue;
    }

    // Apply include/exclude filters
    if (include && !include.includes(typeName)) continue;
    if (exclude && exclude.includes(typeName)) continue;

    const baseName = typeName.toLowerCase();
    const resourceName = baseName.endsWith('s') ? baseName : baseName + 's';

    const fields: FieldDefinition[] = [];

    for (const fieldDesc of typeObj.fields) {
      const fieldName = fieldDesc.name;
      const typeInfo = unwrapType(fieldDesc.type);

      let fieldType = mapGraphQLTypeToFieldType(fieldName, typeInfo, enumMap);
      let relatedResource: string | null = null;

      // Check if type references another Object entity in the schema
      if (objectTypeMap.has(typeInfo.baseName) && typeInfo.baseName !== typeName) {
        const target = typeInfo.baseName.toLowerCase();
        relatedResource = target.endsWith('s') ? target : target + 's';
        fieldType = 'relation';
      } else if (fieldName.endsWith('_id') || fieldName.endsWith('Id')) {
        const base = fieldName.replace(/_id$|Id$/, '');
        relatedResource = base.endsWith('s') ? base : base + 's';
        fieldType = 'relation';
      }

      const field: FieldDefinition = {
        key: fieldName,
        label: humanize(fieldName),
        type: relatedResource ? 'relation' : fieldType,
        required: typeInfo.isRequired,
        sortable: ['text', 'number', 'date'].includes(fieldType),
        searchable: ['text', 'email'].includes(fieldType),
        showInList: fieldName !== primaryKey && fieldType !== 'textarea' && fieldType !== 'json',
        showInForm: fieldName !== primaryKey,
      };

      if (relatedResource) {
        field.resource = relatedResource;
        field.optionLabel = 'name';
        field.optionValue = 'id';
      }

      if (enumMap.has(typeInfo.baseName)) {
        const enumValues = enumMap.get(typeInfo.baseName) ?? [];
        field.options = enumValues.map(val => ({
          label: humanize(val),
          value: val,
        }));
      }

      fields.push(field);
    }

    // Sort fields: primaryKey first, then alphabetically
    fields.sort((a, b) => {
      if (a.key === primaryKey) return -1;
      if (b.key === primaryKey) return 1;
      return a.key.localeCompare(b.key);
    });

    // Detect CRUD capabilities
    const canShow = queryFields.size === 0 ||
      queryFields.has(baseName) ||
      queryFields.has(resourceName) ||
      queryFields.has(`get${baseName}`) ||
      queryFields.has(`${baseName}byid`) ||
      queryFields.has(`find${baseName}`);

    const canCreate = mutationFields.size === 0 ||
      mutationFields.has(`create${baseName}`) ||
      mutationFields.has(`insert${baseName}`) ||
      mutationFields.has(`add${baseName}`) ||
      mutationFields.has(`insert_${resourceName}`) ||
      mutationFields.has(`create_${baseName}`);

    const canEdit = mutationFields.size === 0 ||
      mutationFields.has(`update${baseName}`) ||
      mutationFields.has(`edit${baseName}`) ||
      mutationFields.has(`update_${resourceName}`) ||
      mutationFields.has(`update_${baseName}`) ||
      mutationFields.has(`save${baseName}`);

    const canDelete = mutationFields.size === 0 ||
      mutationFields.has(`delete${baseName}`) ||
      mutationFields.has(`remove${baseName}`) ||
      mutationFields.has(`delete_${resourceName}`) ||
      mutationFields.has(`delete_${baseName}`);

    resources.push({
      name: resourceName,
      label: typeName,
      primaryKey,
      fields,
      canCreate,
      canEdit,
      canDelete,
      canShow,
    });
  }

  return resources;
}

// ─── Utilities ───────────────────────────────────────────────

function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}
