import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { checkExact, createExactSchemaValidator } from './schema-validation';
import { attachAbortSignal, detachAbortSignal, snapshotPlainData } from './plain-data';
import { decodeBaseRecord, decodeOneResult, decodeManyResult, decodeListResult } from './record-decoder';
import { HttpError } from './types';
import { captureResourceSchemas, captureResourceTransport } from './resource-transport-config';
import type {
  BaseRecord, DataProvider, GetListParams, GetOneParams, GetManyParams,
  CreateParams, CreateManyParams, UpdateParams, UpdateManyParams,
  DeleteParams, DeleteManyParams,
  ResourceInputOperation,
  GetOneResult, GetManyResult, GetListResult,
} from './types';

export interface ResourceSchemas {
  /** Schema for complete records returned by standard CRUD operations. */
  record: TSchema;
  /** Required to enable create/createMany. */
  create?: TSchema;
  /** Required to enable update/updateMany. */
  update?: TSchema;
  /** Without a schema, delete operations only accept undefined variables. */
  delete?: TSchema;
  /** Referenced schemas used by Type.Ref. */
  references?: readonly TSchema[];
}

export type ResourceSchemaMap = Readonly<Record<string, ResourceSchemas>>;
export type InferSchemaResourceMap<TSchemas extends ResourceSchemaMap> = {
  [R in keyof TSchemas]: unknown extends Static<TSchemas[R]['record']>
    ? BaseRecord : Static<TSchemas[R]['record']>;
};
export type InferSchemaInputMap<TSchemas extends ResourceSchemaMap> = {
  [R in keyof TSchemas]: {
    [O in ResourceInputOperation]: TSchemas[R] extends Record<O, infer Schema extends TSchema>
      ? unknown extends Static<Schema> ? unknown : Static<Schema>
      : O extends 'delete' ? undefined : never;
  };
};
type ResourceOperation = Exclude<keyof DataProvider, 'getApiUrl' | 'custom'>;
const identity = Type.Union([Type.String(), Type.Number()]);
const common = {
  resource: Type.String({ minLength: 1 }),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
};
const filter = Type.Recursive(Self => Type.Union([
  Type.Object({
    operator: Type.Union([Type.Literal('or'), Type.Literal('and')]),
    value: Type.Array(Self),
  }, { additionalProperties: false }),
  Type.Object({
    field: Type.String(),
    operator: Type.Union([
      Type.Literal('eq'), Type.Literal('ne'), Type.Literal('lt'), Type.Literal('gt'),
      Type.Literal('lte'), Type.Literal('gte'), Type.Literal('contains'), Type.Literal('ncontains'),
      Type.Literal('startswith'), Type.Literal('endswith'), Type.Literal('in'), Type.Literal('nin'),
      Type.Literal('null'), Type.Literal('nnull'), Type.Literal('between'), Type.Literal('nbetween'),
    ]),
    value: Type.Unknown(),
  }, { additionalProperties: false }),
]));
const requestSchemas = {
  getList: Type.Object({
    ...common,
    filters: Type.Optional(Type.Array(filter)),
    sorters: Type.Optional(Type.Array(Type.Object({
      field: Type.String(), order: Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
    }, { additionalProperties: false }))),
    pagination: Type.Optional(Type.Object({
      current: Type.Optional(Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER })),
      pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER })),
      mode: Type.Optional(Type.Union([Type.Literal('server'), Type.Literal('client'), Type.Literal('off')])),
    }, { additionalProperties: false })),
  }, { additionalProperties: false }),
  getOne: Type.Object({ ...common, id: identity }, { additionalProperties: false }),
  getMany: Type.Object({ ...common, ids: Type.Array(identity) }, { additionalProperties: false }),
  create: Type.Object({ ...common, variables: Type.Unknown() }, { additionalProperties: false }),
  createMany: Type.Object({ ...common, variables: Type.Array(Type.Unknown()) }, { additionalProperties: false }),
  update: Type.Object({ ...common, id: identity, variables: Type.Unknown() }, { additionalProperties: false }),
  updateMany: Type.Object({ ...common, ids: Type.Array(identity), variables: Type.Unknown() }, { additionalProperties: false }),
  deleteOne: Type.Object({ ...common, id: identity, variables: Type.Optional(Type.Unknown()) }, { additionalProperties: false }),
  deleteMany: Type.Object({ ...common, ids: Type.Array(identity), variables: Type.Optional(Type.Unknown()) }, { additionalProperties: false }),
};

function createSchemaBoundary(schemas: ResourceSchemaMap) {
  const definitions = captureResourceSchemas(schemas);
  const validators = new WeakMap<TSchema[], WeakMap<TSchema, ReturnType<typeof createExactSchemaValidator>>>();
  const registry = new Map([...definitions].map(([resource, definition]) => {
    // DataProvider records must remain objects even when a broad schema is supplied.
    const record = Type.Intersect([Type.Object({}), definition.record]);
    return [resource, {
      ...definition,
      references: [...(definition.references ?? [])],
      one: Type.Object({ data: record }),
      many: Type.Object({ data: Type.Array(record) }),
      list: Type.Object({ data: Type.Array(record), total: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }) }),
    }];
  }));

  function required(resource: string, operation: string): never {
    throw new HttpError('A resource schema is required for this operation', 400, undefined, {
      code: 'RESOURCE_SCHEMA_REQUIRED',
      details: { resource, operation, phase: 'input', writeMayHaveSucceeded: false },
    });
  }

  function resolve(resource: string, operation: ResourceOperation) {
    return registry.get(resource) ?? required(resource, operation);
  }

  function invalidData(operation: ResourceOperation, phase: 'input' | 'response', resource = '', writeMayHaveSucceeded = false): never {
    throw new HttpError(phase === 'input' ? 'Invalid resource input' : 'Invalid provider response',
      phase === 'input' ? 422 : 502, undefined, {
        code: phase === 'input' ? 'INVALID_RESOURCE_INPUT' : 'INVALID_PROVIDER_RESPONSE',
        details: { resource, operation, phase, writeMayHaveSucceeded },
      });
  }

  function captureRequest<S extends TSchema>(schema: S, value: unknown, operation: ResourceOperation): Static<S> {
    try {
      const detached = detachAbortSignal(value);
      const signal = detached.signal;
      let input = detached.rest;
      if ((operation === 'deleteOne' || operation === 'deleteMany') && typeof value === 'object' && value !== null) {
        // Undefined delete variables represent an absent body, not a JSON value.
        const descriptors = Object.getOwnPropertyDescriptors(value);
        const descriptor = descriptors['variables'];
        const variable: unknown = descriptor && 'value' in descriptor ? descriptor.value : null;
        if (descriptor?.enumerable && variable === undefined) {
          const prototype: unknown = Object.getPrototypeOf(value);
          if (Array.isArray(value) || (prototype !== Object.prototype && prototype !== null)) return invalidData(operation, 'input');
          delete descriptors['variables'];
          input = Object.defineProperties({}, descriptors);
        }
      }
      const candidate = snapshotPlainData(input);
      if (checkExact(schema, candidate) && typeof candidate === 'object' && candidate !== null) {
        return attachAbortSignal(candidate, signal);
      }
    } catch {
      // Capture failures are input errors and must not run submitted accessors.
    }
    return invalidData(operation, 'input');
  }

  function validate(
    schema: TSchema,
    references: TSchema[],
    value: unknown,
    resource: string,
    operation: ResourceOperation,
    phase: 'input' | 'response',
    writeMayHaveSucceeded = false,
  ): void {
    let issues: { path: string; message: string }[];
    try {
      let scopedValidators = validators.get(references);
      if (!scopedValidators) {
        scopedValidators = new WeakMap();
        validators.set(references, scopedValidators);
      }
      let validator = scopedValidators.get(schema);
      if (!validator) {
        validator = createExactSchemaValidator(schema, references);
        scopedValidators.set(schema, validator);
      }
      if (validator.Check(value)) return;
      // Do not include rejected values or raw responses in diagnostic details.
      issues = [...validator.Errors(value)]
        .map(({ path, message }) => ({ path, message }));
    } catch {
      throw new HttpError('Unable to evaluate resource schema', 500, undefined, {
        code: 'RESOURCE_SCHEMA_INVALID',
        details: { resource, operation, phase, writeMayHaveSucceeded },
      });
    }
    const errors = phase === 'input' ? Object.fromEntries(issues.map(({ path, message }) => [
      path.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~')).join('.') || '_root',
      message,
    ])) : undefined;
    throw new HttpError(
      phase === 'input' ? 'Invalid resource input' : 'Invalid provider response',
      phase === 'input' ? 422 : 502,
      errors,
      {
        code: phase === 'input' ? 'INVALID_RESOURCE_INPUT' : 'INVALID_PROVIDER_RESPONSE',
        details: { resource, operation, phase, issues, writeMayHaveSucceeded },
      },
    );
  }

  function input(
    resource: string,
    operation: ResourceOperation,
    kind: 'create' | 'update' | 'delete',
    variables: unknown,
    batch = false,
  ) {
    const definition = resolve(resource, operation);
    const schema = definition[kind] ?? (kind === 'delete' ? Type.Undefined() : required(resource, operation));
    validate(batch ? Type.Array(schema) : schema, definition.references, variables, resource, operation, 'input');
    return definition;
  }

  function output(definition: ReturnType<typeof resolve>, resource: string, operation: ResourceOperation,
    kind: 'one', result: unknown, writeMayHaveSucceeded?: boolean): GetOneResult;
  function output(definition: ReturnType<typeof resolve>, resource: string, operation: ResourceOperation,
    kind: 'many', result: unknown, writeMayHaveSucceeded?: boolean): GetManyResult;
  function output(definition: ReturnType<typeof resolve>, resource: string, operation: ResourceOperation,
    kind: 'list', result: unknown, writeMayHaveSucceeded?: boolean): GetListResult;
  function output(
    definition: ReturnType<typeof resolve>,
    resource: string,
    operation: ResourceOperation,
    kind: 'one' | 'many' | 'list',
    result: unknown,
    writeMayHaveSucceeded = false,
  ): GetOneResult | GetManyResult | GetListResult {
    let captured: unknown;
    try { captured = snapshotPlainData(result); }
    catch { return invalidData(operation, 'response', resource, writeMayHaveSucceeded); }
    validate(definition[kind], definition.references, captured, resource, operation, 'response', writeMayHaveSucceeded);
    switch (kind) {
      case 'one': return decodeOneResult(captured, decodeBaseRecord, writeMayHaveSucceeded);
      case 'many': return decodeManyResult(captured, decodeBaseRecord, writeMayHaveSucceeded);
      case 'list': return decodeListResult(captured, decodeBaseRecord);
    }
  }

  function prepare<O extends ResourceOperation>(operation: O, request: unknown) {
    if (typeof operation !== 'string' || !Object.hasOwn(requestSchemas, operation)) {
      throw new HttpError('Invalid resource operation', 422, undefined, {
        code: 'INVALID_RESOURCE_INPUT', details: { phase: 'input', writeMayHaveSucceeded: false },
      });
    }
    const params = captureRequest(requestSchemas[operation], request, operation);
    const definition = resolve(params.resource, operation);
    const variables = 'variables' in params ? params.variables : undefined;
    switch (operation) {
      case 'create': case 'createMany':
        input(params.resource, operation, 'create', variables, operation === 'createMany');
        break;
      case 'update': case 'updateMany':
        input(params.resource, operation, 'update', variables);
        break;
      case 'deleteOne': case 'deleteMany':
        input(params.resource, operation, 'delete', variables);
        break;
    }
    return { params, definition };
  }
  return { prepare, output, required };
}

/** Internal contract composition reuses input validation, never an unchecked transport. */
export function createResourceRequestValidator(schemas: ResourceSchemaMap) {
  const boundary = createSchemaBoundary(schemas);
  return <O extends ResourceOperation>(operation: O, request: unknown) => boundary.prepare(operation, request).params;
}

function providerFailure(cause: unknown, resource: string, operation: ResourceOperation): HttpError {
  let status = 502;
  try {
    if (typeof cause === 'object' && cause !== null) {
      const candidate: unknown = Object.getOwnPropertyDescriptor(cause, 'statusCode')?.value;
      if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 400 && candidate <= 599) {
        status = candidate;
      }
    }
  } catch {
    // Reflection failures do not expose provider values or supply authentication status.
  }
  return new HttpError('Resource provider failed', status, undefined, {
    code: 'RESOURCE_PROVIDER_FAILED',
    details: { resource, operation, phase: 'transport', writeMayHaveSucceeded: !operation.startsWith('get') },
  });
}

/**
 * Validates standard CRUD payloads and responses without coercing or stripping data.
 * Unregistered resources, unconfigured writes, and custom endpoints fail closed.
 */
export function withResourceSchemas(provider: DataProvider, schemas: ResourceSchemaMap): Readonly<DataProvider> {
  const { prepare, output, required } = createSchemaBoundary(schemas);
  const transport = captureResourceTransport(provider);
  async function dispatch(resource: string, operation: ResourceOperation, invoke: () => unknown): Promise<unknown> {
    try { return await invoke(); }
    catch (cause: unknown) { throw providerFailure(cause, resource, operation); }
  }

  const adapted: DataProvider = {
    getApiUrl: () => {
      try {
        const url = transport.getApiUrl();
        if (typeof url === 'string') return url;
      } catch {
        // Configuration diagnostics must not disclose arbitrary provider return values.
      }
      throw new HttpError('Invalid resource provider URL', 502, undefined, { code: 'INVALID_DATA_PROVIDER' });
    },
    getList: async (request: GetListParams) => {
      const { params, definition } = prepare('getList', request);
      return output(definition, params.resource, 'getList', 'list',
        await dispatch(params.resource, 'getList', () => transport.getList(params)));
    },
    getOne: async (request: GetOneParams) => {
      const { params, definition } = prepare('getOne', request);
      return output(definition, params.resource, 'getOne', 'one',
        await dispatch(params.resource, 'getOne', () => transport.getOne(params)));
    },
    create: async (request: CreateParams<unknown>) => {
      const { params, definition } = prepare('create', request);
      const resource = params.resource;
      return output(definition, resource, 'create', 'one',
        await dispatch(resource, 'create', () => transport.create(params)), true);
    },
    update: async (request: UpdateParams<unknown>) => {
      const { params, definition } = prepare('update', request);
      const resource = params.resource;
      return output(definition, resource, 'update', 'one',
        await dispatch(resource, 'update', () => transport.update(params)), true);
    },
    deleteOne: async (request: DeleteParams<unknown>) => {
      const { params, definition } = prepare('deleteOne', request);
      const resource = params.resource;
      return output(definition, resource, 'deleteOne', 'one',
        await dispatch(resource, 'deleteOne', () => transport.deleteOne(params)), true);
    },
  };

  const getMany = transport.getMany;
  if (getMany) {
    adapted.getMany = async (request: GetManyParams) => {
      const { params, definition } = prepare('getMany', request);
      return output(definition, params.resource, 'getMany', 'many',
        await dispatch(params.resource, 'getMany', () => getMany(params)));
    };
  }
  const createMany = transport.createMany;
  if (createMany) {
    adapted.createMany = async (request: CreateManyParams<unknown>) => {
      const { params, definition } = prepare('createMany', request);
      const resource = params.resource;
      return output(definition, resource, 'createMany', 'many',
        await dispatch(resource, 'createMany', () => createMany(params)), true);
    };
  }
  const updateMany = transport.updateMany;
  if (updateMany) {
    adapted.updateMany = async (request: UpdateManyParams<unknown>) => {
      const { params, definition } = prepare('updateMany', request);
      const resource = params.resource;
      return output(definition, resource, 'updateMany', 'many',
        await dispatch(resource, 'updateMany', () => updateMany(params)), true);
    };
  }
  const deleteMany = transport.deleteMany;
  if (deleteMany) {
    adapted.deleteMany = async (request: DeleteManyParams<unknown>) => {
      const { params, definition } = prepare('deleteMany', request);
      const resource = params.resource;
      return output(definition, resource, 'deleteMany', 'many',
        await dispatch(resource, 'deleteMany', () => deleteMany(params)), true);
    };
  }
  if (transport.custom) {
    adapted.custom = async () => required('', 'custom');
  }

  return Object.freeze(adapted);
}
