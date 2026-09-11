import { Type,type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { definedOptions } from './defined-options';
import { snapshotPlainData, type JsonValue } from './plain-data';
import { HttpError } from './types';

export const NAMESPACE='svadmin';
export const VERSION=2;

const baseProperties={
  namespace: Type.Literal(NAMESPACE),
  version: Type.Literal(VERSION),
  provider: Type.String({ minLength: 1 }),
  contract: Type.Optional(Type.String({ minLength: 1 })),
  tenant: Type.Optional(Type.Union([Type.String(),Type.Number()])),
  resource: Type.Optional(Type.String()),
  id: Type.Optional(Type.Union([Type.String(),Type.Number()])),
  params: Type.Optional(Type.Unknown()),
  method: Type.Optional(Type.String()),
};
const identity=Type.Union([Type.String(),Type.Number()]);
const dataBase={
  ...baseProperties,
  kind: Type.Literal('data'),
  resource: Type.String(),
};
const dataSchema=Type.Union([Type.Object({
  ...dataBase,action: Type.Literal('one'),id: identity,
},{ additionalProperties: false }),Type.Object({
  ...dataBase,
  action: Type.Union([
    Type.Literal('list'),Type.Literal('infiniteList'),
    Type.Literal('many'),Type.Literal('select'),Type.Literal('selectDefaults'),
  ]),
},{ additionalProperties: false })]);
const taskSchema=Type.Union([Type.Object({
  ...baseProperties,
  kind: Type.Literal('task'),action: Type.Literal('one'),id: identity,
},{ additionalProperties: false }),Type.Object({
  ...baseProperties,kind: Type.Literal('task'),action: Type.Literal('list'),
},{ additionalProperties: false })]);
const accessSchema=Type.Object({
  ...baseProperties,kind: Type.Literal('access'),action: Type.Optional(Type.Literal('can')),
},{ additionalProperties: false });
const customSchema=Type.Object({
  ...baseProperties,kind: Type.Literal('custom'),action: Type.Optional(Type.String()),
  resource: Type.String(),id: identity,
},{ additionalProperties: false });
const keySchema=Type.Tuple([Type.Union([dataSchema,taskSchema,accessSchema,customSchema])]);

export type QueryDescriptorData=Readonly<Static<typeof dataSchema>>;
export type QueryDescriptorTask=Readonly<Static<typeof taskSchema>>;
export type QueryDescriptorAccess=Readonly<Static<typeof accessSchema>>;
export type QueryDescriptorCustom=Readonly<Static<typeof customSchema>>;
export type QueryDescriptor=QueryDescriptorData|QueryDescriptorTask|QueryDescriptorAccess|QueryDescriptorCustom;
export type QueryKey=readonly [descriptor: QueryDescriptor];
export type QueryKind=QueryDescriptor['kind'];
export type QueryDataAction=QueryDescriptorData['action'];
export type QueryTaskAction=QueryDescriptorTask['action'];

export type QueryKeysContext=Partial<Pick<QueryDescriptorCustom,'provider'|'contract'|'tenant'|'resource'|'id'|'params'|'method'>>;

// An absent matcher field is a wildcard; explicit undefined matches an unset field.
// The provider is special: explicit undefined selects the default provider.
export type QueryMatcher={
  readonly [K in keyof Omit<QueryDescriptorCustom,'namespace'|'version'|'params'|'kind'>]?: QueryDescriptorCustom[K]|undefined;
}&{ readonly kind?: QueryKind };
export type DataQueryMatcher=Omit<QueryMatcher,'kind'|'resource'>&{ readonly resource: string };
export type QueryKeysBuilder=Readonly<{
  data: Readonly<{
    list(resource: string,params?: unknown): QueryKey;
    infiniteList(resource: string,params?: unknown): QueryKey;
    one(resource: string,id: string|number,params?: unknown): QueryKey;
    many(resource: string,params: unknown): QueryKey;
    select(resource: string,params?: unknown): QueryKey;
    selectDefaults(resource: string,params?: unknown): QueryKey;
  }>;
  task: Readonly<{ list(params?: unknown): QueryKey; one(id: string|number): QueryKey }>;
  access: Readonly<{ can(resource?: string,params?: unknown): QueryKey }>;
  custom: Readonly<{ call(resource: string,id: string|number,method?: string,params?: unknown): QueryKey }>;
}>;

const contextSchema=Type.Object({
  provider: Type.Optional(baseProperties.provider),contract: baseProperties.contract,tenant: baseProperties.tenant,
  resource: baseProperties.resource,id: baseProperties.id,params: baseProperties.params,method: baseProperties.method,
},{ additionalProperties: false });
const matcherSchema=Type.Object({
  provider: Type.Optional(baseProperties.provider),contract: baseProperties.contract,tenant: baseProperties.tenant,
  resource: baseProperties.resource,id: baseProperties.id,method: baseProperties.method,
  action: Type.Optional(Type.String()),
  kind: Type.Optional(Type.Union([Type.Literal('data'),Type.Literal('task'),Type.Literal('access'),Type.Literal('custom')])),
},{ additionalProperties: false });

function invalidKey(): never {
  throw new HttpError('Invalid query key',422,undefined,{ code: 'INVALID_QUERY_KEY' });
}

function ownFields(value: unknown, allowed: readonly string[]): [string,unknown][] {
  if(typeof value!=='object'||value===null||Array.isArray(value)) return invalidKey();
  const prototype: unknown=Object.getPrototypeOf(value);
  if((prototype!==Object.prototype&&prototype!==null)||Object.getOwnPropertySymbols(value).length) return invalidKey();
  return Object.entries(Object.getOwnPropertyDescriptors(value)).map(([key,descriptor]) => {
    if(!allowed.includes(key)||!descriptor.enumerable||!('value' in descriptor)) return invalidKey();
    const field: unknown=descriptor.value;
    return [key,field];
  });
}

function freezeData(value: JsonValue): void {
  if(typeof value!=='object'||value===null) return;
  for(const field of Object.values(value)) freezeData(field);
  Object.freeze(value);
}

function snapshotKey(value: unknown): QueryKey|undefined {
  try {
    const candidate=snapshotPlainData(value);
    freezeData(candidate);
    return checkExact(keySchema,candidate)? candidate:undefined;
  } catch { return undefined; }
}

function build(descriptor: Record<string,unknown>): QueryKey {
  const key=snapshotKey([definedOptions(descriptor)]);
  return key??invalidKey();
}

function snapshotContext(value: unknown): QueryKeysContext {
  try {
    const fields=ownFields(value,['provider','contract','tenant','resource','id','params','method']);
    const candidate=snapshotPlainData(Object.fromEntries(fields.filter(([key,value]) => key!=='params'||value!==undefined)));
    freezeData(candidate);
    if(checkExact(contextSchema,candidate)) return candidate;
  } catch { /* Never expose rejected key data or reflection errors. */ }
  return invalidKey();
}

function snapshotMatcher(value: unknown): QueryMatcher|undefined {
  try {
    const fields=ownFields(value,['provider','contract','tenant','resource','id','action','method','kind']);
    if(fields.some(([key,value]) => key==='kind'&&value===undefined)) return undefined;
    const candidate=snapshotPlainData(Object.fromEntries(fields.filter(([,value]) => value!==undefined)));
    if(!checkExact(matcherSchema,candidate)) return undefined;
    const explicitUndefined=Object.fromEntries<undefined>(fields.filter(([,value]) => value===undefined).map(([key]) => [key,undefined]));
    return Object.freeze({ ...candidate,...explicitUndefined });
  } catch { return undefined; }
}

export function keys(context: QueryKeysContext={}): QueryKeysBuilder {
  const captured=snapshotContext(context);
  const provider=captured.provider??'default';
  const base=definedOptions({
    namespace: NAMESPACE,version: VERSION,provider,
    contract: captured.contract,tenant: captured.tenant,resource: captured.resource,
    id: captured.id,params: captured.params,method: captured.method,
  });
  const result: QueryKeysBuilder={
    data: Object.freeze({
      list: (resource,params=base.params) => build({ ...base,kind: 'data',action: 'list',resource,params }),
      infiniteList: (resource,params=base.params) => build({ ...base,kind: 'data',action: 'infiniteList',resource,params }),
      one: (resource,id,params=base.params) => build({ ...base,kind: 'data',action: 'one',resource,id,params }),
      many: (resource,params) => build({
        ...base,
        kind: 'data',
        action: 'many',
        resource,
        id: undefined,
        params,
      }),
      select: (resource,params=base.params) => build({ ...base,kind: 'data',action: 'select',resource,params }),
      selectDefaults: (resource,params=base.params) => build({ ...base,kind: 'data',action: 'selectDefaults',resource,params }),
    }),
    task: Object.freeze({
      list: (params=base.params) => build({ ...base,kind: 'task',action: 'list',params }),
      one: id => build({
        ...base,
        kind: 'task',
        action: 'one',
        id,
        params: undefined,
      }),
    }),
    access: Object.freeze({
      can: (resource=base.resource,params=base.params) => build({
        ...base,
        kind: 'access',
        action: 'can',
        resource,
        params,
      })
    }),
    custom: Object.freeze({
      call: (resource,id,method,params) => build({
        ...base,
        kind: 'custom',
        action: 'call',
        resource,
        id,
        method,
        params,
      })
    }),
  };
  return Object.freeze(result);
}

export const queryKeys: QueryKeysBuilder=keys();

export function parseQueryKey(value: unknown): QueryDescriptor|undefined {
  return snapshotKey(value)?.[0];
}

/** Inspect validity without granting a type to the original mutable or proxy-backed value. */
export function isQueryKey(value: unknown): boolean { return parseQueryKey(value)!==undefined; }

function matchField(descriptor: QueryDescriptor,matcher: QueryMatcher,key: keyof QueryMatcher): boolean {
  return !Object.hasOwn(matcher,key)||descriptor[key]===matcher[key];
}

function matches(queryKey: readonly unknown[],matcher: QueryMatcher): boolean {
  const parsed=parseQueryKey(queryKey);
  if(!parsed||parsed.contract!==matcher.contract) return false;
  if(matcher.kind!==undefined&&matcher.kind!==parsed.kind) return false;
  if(Object.hasOwn(matcher,'provider')&&parsed.provider!==(matcher.provider??'default')) return false;
  return matchField(parsed,matcher,'tenant')&&matchField(parsed,matcher,'resource')
    &&matchField(parsed,matcher,'action')&&matchField(parsed,matcher,'id')&&matchField(parsed,matcher,'method');
}

export function queryKeyMatches(queryKey: readonly unknown[],matcher: QueryMatcher={}): boolean {
  const captured=snapshotMatcher(matcher);
  return captured!==undefined&&matches(queryKey,captured);
}

export function dataQueryMatches(queryKey: readonly unknown[],matcher: DataQueryMatcher): boolean {
  const captured=snapshotMatcher(matcher);
  return captured!==undefined&&!Object.hasOwn(captured,'kind')&&typeof captured.resource==='string'&&
    matches(queryKey,{ ...captured,kind: 'data' });
}
