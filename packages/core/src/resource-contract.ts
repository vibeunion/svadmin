import { CloneType, Kind, TransformKind, Type, type Static, type TObject, type TSchema } from '@sinclair/typebox';
import { checkExact, createExactSchemaValidator } from './schema-validation';
import { TypeGuard } from '@sinclair/typebox/type';
import { DeleteManyPartialError, HttpError, type DataProvider, type KnownResources, type BaseRecord,
  type GetManyParams, type CreateManyParams, type UpdateManyParams, type DeleteManyParams,
  type GetOneResult, type GetManyResult } from './types';
import { withResourceSchemas, createResourceRequestValidator, type ResourceSchemas } from './resource-schemas';
import { decodeBaseRecord } from './record-decoder';
import { snapshotPlainData } from './plain-data';

export interface ContractSchemas extends ResourceSchemas {
  record: TObject;
}

const brand: unique symbol = Symbol('ResourceContract');
export interface ResourceContract<S extends ContractSchemas = ContractSchemas> {
  readonly name: KnownResources;
  readonly [brand]: S;
}

// Class instances preserve identity when a contract is stored in Svelte state.
class DefinedResource implements ResourceContract {
  readonly name: KnownResources;
  readonly [brand]: ContractSchemas;

  constructor(name: KnownResources, schemas: ContractSchemas) {
    this.name = name;
    this[brand] = schemas;
  }
}

type ErasedContractRecord = BaseRecord & { id: string | number };
export type ContractRecord<S extends ContractSchemas> = string extends keyof Static<S['record']> ? ErasedContractRecord
  : SchemaValue<S['record']> extends infer Row extends BaseRecord ? Row : BaseRecord;
export type ContractId<S extends ContractSchemas> = ContractRecord<S> extends { id: infer Id }
  ? Extract<Id, string | number> : never;
export type ContractInput<S extends ContractSchemas, O extends 'create' | 'update' | 'delete'> =
  S extends Record<O, infer Schema extends TSchema> ? SchemaValue<Schema>
    : O extends 'delete' ? undefined : never;
export type ContractFormInput<S extends ContractSchemas, A extends 'create' | 'edit'> =
  Extract<ContractInput<S, A extends 'edit' ? 'update' : 'create'>, Record<string, unknown>>;
export type ContractFormAction = 'create' | 'edit' | 'clone' | 'show';
export type ContractFormValues<S extends ContractSchemas, A extends ContractFormAction> =
  ContractSchemas extends S ? Record<string, unknown> : A extends 'show' ? ContractRecord<S>
    : ContractFormInput<S, A extends 'edit' ? 'edit' : 'create'>;
export type ContractFormDraft<S extends ContractSchemas, A extends ContractFormAction> =
  Partial<Record<Extract<keyof ContractFormValues<S, A>, string>, unknown>>;

type IsAny<T> = 0 extends (1 & T) ? true : false;
type Unsafe<T> = IsAny<T> extends true ? true
  : unknown extends T ? true
  : T extends readonly (infer Item)[] ? Unsafe<Item>
  : T extends object ? string extends keyof T ? true : true extends {
    [K in keyof T]-?: Unsafe<T[K]>
  }[keyof T] ? true : false
  : false;
export type SafeSchema<S extends TSchema> = true extends Unsafe<Static<S>> ? never : S;
type SafeValue<T> = IsAny<T> extends true ? unknown
  : T extends object ? { [K in keyof T]: SafeValue<T[K]> } : T;
export type SchemaValue<S extends TSchema> = SafeValue<Static<S>>;
type CheckedSchemas<S extends ContractSchemas> = {
  [K in keyof S]: S[K] extends TSchema ? SafeSchema<S[K]> : S[K];
} & (ContractRecord<S> extends { id: string | number } ? unknown : never);

interface Definition {
  schemas: ContractSchemas;
  key: string;
  providers: WeakMap<DataProvider, Readonly<DataProvider>>;
}
const definitions = new WeakMap<ResourceContract, Definition>();
let nextKey = 0;

// A deliberately closed JSON subset keeps runtime validation aligned with Static.
export function closeContractSchema<S extends TSchema>(schema: S): S {
  const copy = CloneType(schema);
  const visit = (node: TSchema): void => {
    if (TransformKind in node) {
      throw new HttpError('Contract transforms require a separate decoding boundary', 400, undefined, { code: 'INVALID_RESOURCE_CONTRACT' });
    }
    if (!TypeGuard.IsSchema(node) || !['Object', 'Array', 'Tuple', 'Union', 'String', 'Number', 'Integer', 'Boolean', 'Null', 'Literal', 'Never'].includes(node[Kind])) {
      throw new HttpError('Unsupported or unconstrained contract schema', 400, undefined, { code: 'INVALID_RESOURCE_CONTRACT' });
    }
    if (TypeGuard.IsObject(node)) {
      if (node.additionalProperties !== undefined && node.additionalProperties !== false) {
        throw new HttpError('Contract objects must be closed', 400, undefined, { code: 'INVALID_RESOURCE_CONTRACT' });
      }
      node.additionalProperties = false;
      for (const property of Object.values(node.properties)) visit(property);
    }
    if (TypeGuard.IsArray(node)) visit(node.items);
    if (TypeGuard.IsTuple(node)) for (const item of node.items ?? []) visit(item);
    if (TypeGuard.IsUnion(node)) for (const item of node.anyOf) visit(item);
  };
  visit(copy);
  return copy;
}

export function defineResource<const S extends ContractSchemas>(
  name: KnownResources,
  schemas: S & CheckedSchemas<S>,
): ResourceContract<S>;
export function defineResource(name: KnownResources, schemas: ContractSchemas): ResourceContract {
  const isId = (schema: TSchema): boolean => (
    ['String', 'Number', 'Integer'].includes(schema[Kind])
    || (TypeGuard.IsLiteral(schema) && ['string', 'number'].includes(typeof schema.const))
    || (TypeGuard.IsUnion(schema) && schema.anyOf.every(isId))
  );
  if (!name.trim() || schemas.record[Kind] !== 'Object'
    || !schemas.record.required?.includes('id')
    || !schemas.record.properties['id']
    || !isId(schemas.record.properties['id'])) {
    throw new HttpError('A resource contract requires a name and a required string/number id', 400, undefined, { code: 'INVALID_RESOURCE_CONTRACT' });
  }
  const record = closeContractSchema(schemas.record);
  const definition: ContractSchemas = {
    record,
    ...(schemas.create ? { create: closeContractSchema(schemas.create) } : {}),
    ...(schemas.update ? { update: closeContractSchema(schemas.update) } : {}),
    ...(schemas.delete ? { delete: closeContractSchema(schemas.delete) } : {}),
  };
  const contract: ResourceContract = Object.freeze(new DefinedResource(name, schemas));
  // Include the schema so persisted caches cannot reuse an ordinal after a contract revision.
  definitions.set(contract, { schemas: definition, key: JSON.stringify([++nextKey, name, definition]), providers: new WeakMap() });
  return contract;
}

function definitionOf(contract: ResourceContract): Definition {
  const definition = definitions.get(contract);
  if (!definition) throw new HttpError('Use defineResource to create a resource contract', 400, undefined, { code: 'INVALID_RESOURCE_CONTRACT' });
  return definition;
}

export function contractKey(contract: ResourceContract): string {
  return definitionOf(contract).key;
}

/** Resource metadata must carry a real contract, never a schema inferred from display fields. */
export function resolveResourceContract(resource: {
  name: string;
  identifier?: string;
  contract?: ResourceContract;
  primaryKey?: string;
}): ResourceContract {
  const contract = resource.contract;
  if (!contract || contract.name !== (resource.identifier ?? resource.name) || (resource.primaryKey !== undefined && resource.primaryKey !== 'id')) {
    throw new HttpError('Resource metadata requires a matching id-based contract', 400, undefined, { code: 'RESOURCE_CONTRACT_REQUIRED' });
  }
  definitionOf(contract);
  return contract;
}

export function validateContractId(contract: ResourceContract, value: unknown): void {
  check(idSchema(definitionOf(contract).schemas), value, 'id');
}

/** The private schema snapshot is the runtime evidence for the branded record type. */
export function parseContractRecord<S extends ContractSchemas>(contract: ResourceContract<S>, value: unknown): ContractRecord<S>;
export function parseContractRecord(contract: ResourceContract, value: unknown): BaseRecord {
  const schema = definitionOf(contract).schemas.record;
  try {
    const record = decodeBaseRecord(snapshotPlainData(value));
    if (checkExact(schema, record)) return record;
  } catch {
    // Malformed transport values must not escape as raw reflection errors.
  }
  throw new HttpError('Invalid provider response', 502, undefined, { code: 'INVALID_PROVIDER_RESPONSE' });
}

function idSchema(schemas: ContractSchemas): TSchema {
  const schema = schemas.record.properties['id'];
  if (!schema) throw new HttpError('Missing contract ID schema', 400, undefined, { code: 'INVALID_RESOURCE_CONTRACT' });
  return schema;
}

// The private definition is an immutable snapshot of the schema carried by the contract.
export function parseContractId<S extends ContractSchemas>(contract: ResourceContract<S>, value: unknown): ContractId<S>;
export function parseContractId(contract: ResourceContract, value: unknown): string | number {
  validateContractId(contract, value);
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new HttpError('Invalid contract ID', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
  }
  return value;
}

const routeIdPrefix = '~svadmin-id:';
const routeIdShape = Type.Union([
  Type.Tuple([Type.Literal('number'), Type.Number()]),
  Type.Tuple([Type.Literal('string'), Type.String()]),
]);

/** Newly generated links preserve the identity type even when both ID kinds are valid. */
export function formatContractRouteId<S extends ContractSchemas>(contract: ResourceContract<S>, value: ContractId<S>): string {
  const id = parseContractId(contract, value);
  return `${routeIdPrefix}${JSON.stringify([typeof id, id])}`;
}

/** Bare numeric-only links require an exact canonical conversion; tagged links preserve both types. */
export function parseContractRouteId<S extends ContractSchemas>(contract: ResourceContract<S>, value: string): ContractId<S> {
  if (value.startsWith(routeIdPrefix)) {
    try {
      const decoded: unknown = JSON.parse(value.slice(routeIdPrefix.length));
      if (!checkExact(routeIdShape, decoded)) {
        throw new Error('Invalid tagged identity');
      }
      return parseContractId(contract, decoded[1]);
    } catch {
      throw new HttpError('Invalid resource identity', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
    }
  }
  try { return parseContractId(contract, value); }
  catch {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || String(numeric) !== value) {
      throw new HttpError('Invalid resource identity', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
    }
    return parseContractId(contract, numeric);
  }
}

export type ContractDeleteInput<S extends ContractSchemas> =
  ContractSchemas extends S ? unknown : ContractInput<S, 'delete'>;
export type ContractUpdateInput<S extends ContractSchemas> =
  ContractSchemas extends S ? unknown : ContractInput<S, 'update'>;
export type ContractCreateInput<S extends ContractSchemas> =
  ContractSchemas extends S ? unknown : ContractInput<S, 'create'>;

export function requireContractCreateSchema(contract: ResourceContract): void {
  if (!definitionOf(contract).schemas.create) {
    throw new HttpError('A create schema is required', 400, undefined, { code: 'INVALID_RESOURCE_CONTRACT' });
  }
}

/** Imported metadata values require the private create schema before dispatch. */
export function parseContractCreateInput<S extends ContractSchemas>(
  contract: ResourceContract<S>, value: unknown,
): ContractCreateInput<S>;
export function parseContractCreateInput(contract: ResourceContract, value: unknown): unknown {
  requireContractCreateSchema(contract);
  const schema = definitionOf(contract).schemas.create ?? Type.Never();
  try {
    const candidate = snapshotPlainData(value);
    check(schema, candidate, 'variables');
    return candidate;
  } catch {
    throw new HttpError('Invalid create input', 422, undefined, {
      code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', writeMayHaveSucceeded: false },
    });
  }
}

/** Unknown metadata payloads must pass the private update schema before dispatch. */
export function parseContractUpdateInput<S extends ContractSchemas>(
  contract: ResourceContract<S>, value: unknown,
): ContractUpdateInput<S>;
export function parseContractUpdateInput(contract: ResourceContract, value: unknown): unknown {
  const schema = definitionOf(contract).schemas.update ?? Type.Never();
  try {
    const candidate = snapshotPlainData(value);
    check(schema, candidate, 'variables');
    return candidate;
  } catch {
    throw new HttpError('Invalid update input', 422, undefined, {
      code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', writeMayHaveSucceeded: false },
    });
  }
}

/** Erased metadata contracts keep deletion input unknown until the private schema checks it. */
export function parseContractDeleteInput<S extends ContractSchemas>(
  contract: ResourceContract<S>, value: unknown,
): ContractDeleteInput<S>;
export function parseContractDeleteInput(contract: ResourceContract, value: unknown): unknown {
  const schema = definitionOf(contract).schemas.delete ?? Type.Undefined();
  try {
    const candidate = value === undefined ? undefined : snapshotPlainData(value);
    check(schema, candidate, 'variables');
    return candidate;
  } catch {
    throw new HttpError('Invalid deletion input', 422, undefined, {
      code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', writeMayHaveSucceeded: false },
    });
  }
}

export function contractFormValues(contract: ResourceContract, action: string, value: Record<string, unknown>): Record<string, unknown> {
  const schemas = definitionOf(contract).schemas;
  const schema = action === 'edit' ? schemas.update : schemas.create;
  if (!schema || !TypeGuard.IsObject(schema)) {
    throw new HttpError('Forms require an object input schema for their action', 400, undefined, { code: 'INVALID_RESOURCE_CONTRACT' });
  }
  const projected = Object.fromEntries(Object.keys(schema.properties)
    .filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
  check(schema, projected, 'values');
  return projected;
}

function formSchema(contract: ResourceContract, action: ContractFormAction): TObject {
  const schemas = definitionOf(contract).schemas;
  const schema = action === 'show' ? schemas.record : action === 'edit' ? schemas.update : schemas.create;
  if (!schema || !TypeGuard.IsObject(schema)) {
    throw new HttpError('Forms require an object schema for their action', 400, undefined, { code: 'INVALID_RESOURCE_CONTRACT' });
  }
  return schema;
}

export function getContractFormFields<S extends ContractSchemas, A extends ContractFormAction>(
  contract: ResourceContract<S>, action: A,
): Extract<keyof ContractFormValues<S, A>, string>[];
export function getContractFormFields(contract: ResourceContract, action: ContractFormAction): string[] {
  return Object.keys(formSchema(contract, action).properties);
}

/** Drafts prove only plain-data shape and field ownership, never a complete business payload. */
export function snapshotContractFormDraft<S extends ContractSchemas, A extends ContractFormAction>(
  contract: ResourceContract<S>, action: A, value: unknown,
): ContractFormDraft<S, A>;
export function snapshotContractFormDraft(contract: ResourceContract, action: ContractFormAction, value: unknown): Record<string, unknown> {
  const fields = getContractFormFields(contract, action);
  try {
    if (typeof value !== 'object' || value === null || Array.isArray(value) ||
        Object.getOwnPropertySymbols(value).length ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Invalid draft');
    const entries: [string, unknown][] = [];
    for (const [key, property] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (!fields.includes(key) || !property.enumerable || !('value' in property)) throw new TypeError('Invalid field');
      const field: unknown = property.value;
      if (field !== undefined) entries.push([key, field]);
    }
    return decodeBaseRecord(snapshotPlainData(Object.fromEntries(entries)));
  } catch {
    throw new HttpError('Invalid form draft', 422, undefined, { code: 'INVALID_RESOURCE_INPUT' });
  }
}

/** Return field names rather than transport values or schema-generated error text. */
export function contractFormInvalidFields(contract: ResourceContract, action: ContractFormAction, value: unknown): string[] {
  const schema = formSchema(contract, action);
  const validator = createExactSchemaValidator(schema);
  const paths = Array.from(validator.Errors(value), error => error.path);
  const fields = Object.keys(schema.properties).filter(field => {
    const path = `/${field.replaceAll('~', '~0').replaceAll('/', '~1')}`;
    return paths.some(candidate => candidate === path || candidate.startsWith(`${path}/`));
  });
  return fields.length ? fields : validator.Check(value) ? [] : ['_root'];
}

/** The private input schema is the evidence for the operation-specific form type. */
export function parseContractFormInput<S extends ContractSchemas, A extends 'create' | 'edit'>(
  contract: ResourceContract<S>, action: A, value: unknown,
): ContractFormInput<S, A>;
export function parseContractFormInput(contract: ResourceContract, action: 'create' | 'edit', value: unknown): BaseRecord {
  const schemas = definitionOf(contract).schemas;
  const schema = action === 'edit' ? schemas.update : schemas.create;
  if (!schema || !TypeGuard.IsObject(schema)) {
    throw new HttpError('Forms require an object input schema for their action', 400, undefined, { code: 'INVALID_RESOURCE_CONTRACT' });
  }
  check(schema, value, 'values');
  return decodeBaseRecord(value);
}

function check(schema: TSchema, value: unknown, path: string): void {
  if (!checkExact(schema, value)) {
    throw new HttpError('Invalid resource request', 422, { [path]: 'Value does not match the resource contract' }, {
      code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', path, writeMayHaveSucceeded: false },
    });
  }
}

const mutationEnvelope = Type.Object({
  variables: Type.Optional(Type.Unknown()),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  dataProviderName: Type.Optional(Type.String()),
}, { additionalProperties: false });
const batchMutationEnvelope = Type.Object({
  ...mutationEnvelope.properties,
  ids: Type.Array(Type.Union([Type.String(), Type.Number()])),
}, { additionalProperties: false });

/** Contract-bound writes cannot override the resource, ID, or lifecycle policy. */
export function validateContractMutationParams(contract: ResourceContract | undefined, params: unknown, batch = false): void {
  if (!contract) return;
  definitionOf(contract);
  check(batch ? batchMutationEnvelope : mutationEnvelope, params, 'mutation');
}

const filterGroup = Type.Object({
  operator: Type.Union([Type.Literal('and'), Type.Literal('or')]),
  value: Type.Array(Type.Unknown()),
}, { additionalProperties: false });
const fieldFilter = Type.Object({
  field: Type.String(), operator: Type.String(), value: Type.Unknown(),
}, { additionalProperties: false });

function checkFilters(filters: unknown, record: TObject, depth = 0): void {
  if (depth > 32 || !checkExact(Type.Array(Type.Unknown()), filters)) {
    check(Type.Never(), filters, 'filters');
    return;
  }
  for (const filter of filters) {
    if (checkExact(filterGroup, filter)) {
      checkFilters(filter.value, record, depth + 1);
      continue;
    }
    if (!checkExact(fieldFilter, filter)) {
      check(Type.Never(), filter, 'filters');
      continue;
    }
    if (!Object.hasOwn(record.properties, filter.field)) {
      check(Type.Never(), filter, 'filters.field');
      continue;
    }
    const field = record.properties[filter.field];
    if (!field) {
      check(Type.Never(), filter, 'filters.field');
      continue;
    }
    const scalar = Type.Exclude(field, Type.Null());
    switch (filter.operator) {
      case 'eq': case 'ne': check(field, filter.value, filter.field); break;
      case 'in': case 'nin': check(Type.Array(field), filter.value, filter.field); break;
      case 'null': case 'nnull': check(Type.Null(), filter.value, filter.field); break;
      case 'contains': case 'ncontains': case 'startswith': case 'endswith':
        check(Type.Intersect([scalar, Type.String()]), filter.value, filter.field); break;
      case 'lt': case 'lte': case 'gt': case 'gte':
        check(Type.Intersect([scalar, Type.Union([Type.String(), Type.Number()])]), filter.value, filter.field); break;
      case 'between': case 'nbetween':
        check(Type.Tuple([
          Type.Intersect([scalar, Type.Union([Type.String(), Type.Number()])]),
          Type.Intersect([scalar, Type.Union([Type.String(), Type.Number()])]),
        ]), filter.value, filter.field); break;
      default: check(Type.Never(), filter, 'filters.operator');
    }
  }
}

/** Internal transport boundary; public hooks never accept a raw provider as proof of a contract. */
export function contractProvider(provider: DataProvider, contract: ResourceContract): Readonly<DataProvider> {
  const definition = definitionOf(contract);
  const cached = definition.providers.get(provider);
  if (cached) return cached;
  const { schemas } = definition;
  const registry = { [contract.name]: schemas };
  const checked = withResourceSchemas(provider, registry);
  const prepare = createResourceRequestValidator(registry);
  const id = idSchema(schemas);
  const distinctIds = Type.Array(id, { uniqueItems: true });
  type Operation = Exclude<keyof DataProvider, 'getApiUrl' | 'custom'>;
  function invalidReceipt(operation: Operation): never {
    throw new HttpError('Invalid provider response', 502, undefined, {
      code: 'INVALID_PROVIDER_RESPONSE',
      details: { resource: contract.name, operation, phase: 'response',
        writeMayHaveSucceeded: !['getList', 'getOne', 'getMany'].includes(operation) },
    });
  }
  function suppliedId(variables: unknown, expected?: string | number): string | number | undefined {
    const value: unknown = typeof variables === 'object' && variables !== null
      ? Object.getOwnPropertyDescriptor(variables, 'id')?.value : undefined;
    if (value === undefined) return undefined;
    const supplied = parseContractId(contract, value);
    if (expected !== undefined && supplied !== expected) check(Type.Never(), value, 'variables.id');
    return supplied;
  }
  function oneReceipt(result: GetOneResult, operation: Operation, expected: string | number | undefined) {
    if (expected !== undefined && result.data['id'] !== expected) return invalidReceipt(operation);
    return result;
  }
  function distinctRecords(records: readonly BaseRecord[], operation: Operation): void {
    if (new Set(records.map(record => record['id'])).size !== records.length) invalidReceipt(operation);
  }
  // Records are already detached and schema-checked by the captured inner provider.
  function manyReceipt(result: GetManyResult, operation: Operation,
    expected: readonly (string | number | undefined)[], match: 'identity-set' | 'create-order') {
    if (result.data.length !== expected.length) return invalidReceipt(operation);
    distinctRecords(result.data, operation);
    const expectedIds = new Set<unknown>(expected);
    for (const [index, record] of result.data.entries()) {
      if (match === 'identity-set' ? !expectedIds.has(record['id'])
        : expected[index] !== undefined && record['id'] !== expected[index]) return invalidReceipt(operation);
    }
    return result;
  }
  function preflight(params: { resource: string; filters?: unknown; sorters?: unknown; pagination?: unknown }) {
    if (params.resource !== contract.name) check(Type.Never(), params.resource, 'resource');
    if (params.filters !== undefined) checkFilters(params.filters, schemas.record);
    if (params.sorters !== undefined) {
      check(Type.Array(Type.Object({
        field: Type.Union(Object.keys(schemas.record.properties).map(key => Type.Literal(key))),
        order: Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
      }, { additionalProperties: false })), params.sorters, 'sorters');
    }
    if (params.pagination !== undefined) check(Type.Object({
      current: Type.Optional(Type.Integer({ minimum: 1 })),
      pageSize: Type.Optional(Type.Integer({ minimum: 1 })),
      mode: Type.Optional(Type.Union(['server', 'client', 'off'].map(mode => Type.Literal(mode)))),
    }, { additionalProperties: false }), params.pagination, 'pagination');
  }
  async function collectRecords(pending: Promise<{ data: BaseRecord }>[]) {
    const results = await Promise.allSettled(pending);
    return { data: results.map(result => {
      if (result.status === 'fulfilled') return result.value.data;
      const cause: unknown = result.reason;
      throw cause;
    }) };
  }
  // Validate the complete request locally. Only the inner provider invokes raw
  // methods and normalizes their failures; local validation keeps its diagnostics.
  const transport: DataProvider = {
    ...(checked.custom ? { custom: checked.custom } : {}),
    getApiUrl: checked.getApiUrl,
    getList: async request => {
      const params = prepare('getList', request);
      preflight(params);
      const result = await checked.getList(params);
      distinctRecords(result.data, 'getList');
      return result;
    },
    getOne: async request => {
      const params = prepare('getOne', request);
      preflight(params); check(id, params.id, 'id');
      return oneReceipt(await checked.getOne(params), 'getOne', params.id);
    },
    create: async request => {
      const params = prepare('create', request);
      preflight(params);
      const expected = suppliedId(params.variables);
      return oneReceipt(await checked.create(params), 'create', expected);
    },
    update: async request => {
      const params = prepare('update', request);
      preflight(params); check(id, params.id, 'id'); suppliedId(params.variables, params.id);
      return oneReceipt(await checked.update(params), 'update', params.id);
    },
    deleteOne: async request => {
      const params = prepare('deleteOne', request);
      preflight(params); check(id, params.id, 'id');
      return oneReceipt(await checked.deleteOne(params), 'deleteOne', params.id);
    },
    getMany: async (request: GetManyParams) => {
      const params = prepare('getMany', request);
      preflight(params); check(distinctIds, params.ids, 'ids');
      if (checked.getMany) return manyReceipt(await checked.getMany(params), 'getMany', params.ids, 'identity-set');
      const { ids, ...single } = params;
      return collectRecords(ids.map(async id => oneReceipt(await checked.getOne({ ...single, id }), 'getMany', id)));
    },
    createMany: async (request: CreateManyParams<unknown>) => {
      const params = prepare('createMany', request);
      preflight(params);
      const expected = params.variables.map(variables => suppliedId(variables));
      const supplied = expected.filter(value => value !== undefined);
      check(distinctIds, supplied, 'variables.id');
      const result = checked.createMany ? await checked.createMany(params)
        : await collectRecords(params.variables.map(async (variables, index) =>
          oneReceipt(await checked.create({ ...params, variables }), 'createMany', expected[index])));
      return manyReceipt(result, 'createMany', expected, 'create-order');
    },
    updateMany: async (request: UpdateManyParams<unknown>) => {
      const params = prepare('updateMany', request);
      preflight(params); check(distinctIds, params.ids, 'ids');
      const supplied = suppliedId(params.variables);
      if (supplied !== undefined && params.ids.some(id => id !== supplied)) check(Type.Never(), supplied, 'variables.id');
      if (checked.updateMany) return manyReceipt(await checked.updateMany(params), 'updateMany', params.ids, 'identity-set');
      const { ids, ...single } = params;
      return collectRecords(ids.map(async id => oneReceipt(await checked.update({ ...single, id }), 'updateMany', id)));
    },
    deleteMany: async (request: DeleteManyParams<unknown>) => {
      const params = prepare('deleteMany', request);
      preflight(params); check(distinctIds, params.ids, 'ids');
      if (checked.deleteMany) return manyReceipt(await checked.deleteMany(params), 'deleteMany', params.ids, 'identity-set');
      const { ids, ...single } = params;
      const results = await Promise.all(ids.map(async item => {
        try {
          const result = oneReceipt(await checked.deleteOne({ ...single, id: item }), 'deleteMany', item);
          return { id: item, ok: true, data: result.data } as const;
        }
        catch (cause: unknown) { return { id: item, ok: false, cause } as const; }
      }));
      const succeeded: (string | number)[] = [];
      const failed: (string | number)[] = [];
      const causes: unknown[] = [];
      const data = results.flatMap(result => {
        if (result.ok) { succeeded.push(result.id); return [result.data]; }
        failed.push(result.id); causes.push(result.cause); return [];
      });
      if (failed.length) throw new DeleteManyPartialError(succeeded, failed, causes);
      return { data };
    },
  };
  const adapted = Object.freeze(transport);
  definition.providers.set(provider, adapted);
  return adapted;
}
