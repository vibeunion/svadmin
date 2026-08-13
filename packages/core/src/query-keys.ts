export const NAMESPACE = 'svadmin';
export const VERSION = 2;

export type QueryKind = 'data' | 'task' | 'access' | 'custom';
export type QueryDataAction = 'list' | 'infiniteList' | 'one' | 'many' | 'select' | 'selectDefaults';
export type QueryTaskAction = 'list' | 'one';
type TenantId = string | number;

type BaseDescriptor = {
  readonly namespace: typeof NAMESPACE;
  readonly version: typeof VERSION;
  readonly provider: string;
  readonly tenant?: TenantId;
  readonly resource?: string;
  readonly id?: string | number;
  readonly params?: unknown;
  readonly method?: string;
};

export type QueryDescriptorData = BaseDescriptor & { readonly kind: 'data'; readonly action: QueryDataAction };
export type QueryDescriptorTask = BaseDescriptor & { readonly kind: 'task'; readonly action: QueryTaskAction };
export type QueryDescriptorAccess = BaseDescriptor & { readonly kind: 'access'; readonly action?: 'can' };
export type QueryDescriptorCustom = BaseDescriptor & { readonly kind: 'custom'; readonly action?: string };
export type QueryDescriptor = QueryDescriptorData | QueryDescriptorTask | QueryDescriptorAccess | QueryDescriptorCustom;
export type QueryKey = readonly [descriptor: QueryDescriptor];

export type QueryKeysContext = { readonly provider?: string; readonly tenant?: TenantId; readonly resource?: string; readonly action?: string; readonly id?: string | number; readonly params?: unknown; readonly method?: string };
export type QueryMatcher = { readonly provider?: string; readonly tenant?: TenantId; readonly resource?: string; readonly action?: string; readonly id?: string | number; readonly method?: string; readonly kind?: QueryKind };
export type DataQueryMatcher = Omit<QueryMatcher, 'kind'> & { readonly resource: string };
export type QueryKeysBuilder = {
  data: { list(resource: string, params?: unknown): QueryKey; infiniteList(resource: string, params?: unknown): QueryKey; one(resource: string, id: string | number, params?: unknown): QueryKey; many(resource: string, params: unknown): QueryKey; select(resource: string, params?: unknown): QueryKey; selectDefaults(resource: string, params?: unknown): QueryKey; };
  task: { list(params?: unknown): QueryKey; one(id: string | number): QueryKey };
  access: { can(resource?: string, params?: unknown): QueryKey };
  custom: { call(resource: string, id: string | number, method?: string, params?: unknown): QueryKey };
};

function withDefaultProvider(value: string | undefined): string { return value === undefined ? 'default' : value; }
function assertProvider(provider: string): void { if (!provider.length) throw new Error('provider must be a non-empty string'); }

function makeDescriptor(value: { kind: 'data'; provider?: string; tenant?: TenantId; resource?: string; action: QueryDataAction; id?: string | number; params?: unknown; method?: string; }): QueryDescriptorData;
function makeDescriptor(value: { kind: 'task'; provider?: string; tenant?: TenantId; resource?: string; action: QueryTaskAction; id?: string | number; params?: unknown; method?: string; }): QueryDescriptorTask;
function makeDescriptor(value: { kind: 'access'; provider?: string; tenant?: TenantId; resource?: string; action?: 'can'; id?: string | number; params?: unknown; method?: string; }): QueryDescriptorAccess;
function makeDescriptor(value: { kind: 'custom'; provider?: string; tenant?: TenantId; resource?: string; id?: string | number; action?: string; params?: unknown; method?: string; }): QueryDescriptorCustom;
function makeDescriptor(value: { kind: QueryKind; provider?: string; tenant?: TenantId; resource?: string; action?: string; id?: string | number; params?: unknown; method?: string; }): QueryDescriptor {
  const provider = withDefaultProvider(value.provider);
  assertProvider(provider);

  const base = { namespace: NAMESPACE, version: VERSION, provider, tenant: value.tenant, resource: value.resource, id: value.id, params: value.params, method: value.method } as const;
  if (value.kind === 'data') return { ...base, kind: 'data', action: value.action } as QueryDescriptorData;
  if (value.kind === 'task') return { ...base, kind: 'task', action: value.action as QueryTaskAction } as QueryDescriptorTask;
  if (value.kind === 'access') return { ...base, kind: 'access', action: value.action as 'can' | undefined } as QueryDescriptorAccess;
  return { ...base, kind: 'custom', action: value.action } as QueryDescriptorCustom;
}

export function keys(context: QueryKeysContext = {}): QueryKeysBuilder {
  const base = { provider: withDefaultProvider(context.provider), tenant: context.tenant, resource: context.resource, id: context.id, params: context.params, method: context.method };
  return {
    data: {
      list: (resource, params = base.params) => [makeDescriptor({ kind: 'data', provider: base.provider, tenant: base.tenant, resource, action: 'list', id: base.id, params, method: base.method })],
      infiniteList: (resource, params = base.params) => [makeDescriptor({ kind: 'data', provider: base.provider, tenant: base.tenant, resource, action: 'infiniteList', id: base.id, params, method: base.method })],
      one: (resource, id, params = base.params) => [makeDescriptor({ kind: 'data', provider: base.provider, tenant: base.tenant, resource, action: 'one', id, params, method: base.method })],
      many: (resource, params) => [makeDescriptor({ kind: 'data', provider: base.provider, tenant: base.tenant, resource, action: 'many', params, method: base.method })],
      select: (resource, params = base.params) => [makeDescriptor({ kind: 'data', provider: base.provider, tenant: base.tenant, resource, action: 'select', id: base.id, params, method: base.method })],
      selectDefaults: (resource, params = base.params) => [makeDescriptor({ kind: 'data', provider: base.provider, tenant: base.tenant, resource, action: 'selectDefaults', id: base.id, params, method: base.method })],
    },
    task: {
      list: (params = base.params) => [makeDescriptor({ kind: 'task', provider: base.provider, tenant: base.tenant, resource: base.resource, action: 'list', id: base.id, params, method: base.method })],
      one: (id) => [makeDescriptor({ kind: 'task', provider: base.provider, tenant: base.tenant, resource: base.resource, action: 'one', id, method: base.method })],
    },
    access: { can: (resource = base.resource, params = base.params) => [makeDescriptor({ kind: 'access', provider: base.provider, tenant: base.tenant, resource, action: 'can', id: base.id, params, method: base.method })] },
    custom: { call: (resource, id, method, params) => [makeDescriptor({ kind: 'custom', provider: base.provider, tenant: base.tenant, resource, id, method, params, action: 'call' })] },
  };
}

export const queryKeys: QueryKeysBuilder = {
  data: {
    list: (resource, params) => keys().data.list(resource, params),
    infiniteList: (resource, params) => keys().data.infiniteList(resource, params),
    one: (resource, id, params) => keys().data.one(resource, id, params),
    many: (resource, params) => keys().data.many(resource, params),
    select: (resource, params) => keys().data.select(resource, params),
    selectDefaults: (resource, params) => keys().data.selectDefaults(resource, params),
  },
  task: { list: (params) => keys().task.list(params), one: (id) => keys().task.one(id) },
  access: { can: (resource, params) => keys().access.can(resource, params) },
  custom: { call: (resource, id, method, params) => keys().custom.call(resource, id, method, params) },
};

export function parseQueryKey(value: unknown): QueryDescriptor | undefined {
  if (!Array.isArray(value) || value.length !== 1) return;
  const candidate = value[0];
  if (!candidate || typeof candidate !== 'object') return;
  const descriptor = candidate as QueryDescriptor;
  if (descriptor.namespace !== NAMESPACE || descriptor.version !== VERSION || typeof descriptor.provider !== 'string' || !descriptor.provider.length) return;
  if (descriptor.tenant !== undefined && typeof descriptor.tenant !== 'string' && typeof descriptor.tenant !== 'number') return;
  if (descriptor.resource !== undefined && typeof descriptor.resource !== 'string') return;
  if (descriptor.id !== undefined && typeof descriptor.id !== 'string' && typeof descriptor.id !== 'number') return;
  if (descriptor.method !== undefined && typeof descriptor.method !== 'string') return;
  if (descriptor.kind === 'data' && ['list', 'infiniteList', 'one', 'many', 'select', 'selectDefaults'].includes(descriptor.action)) return descriptor;
  if (descriptor.kind === 'task' && ['list', 'one'].includes(descriptor.action)) return descriptor;
  if (descriptor.kind === 'access' && (descriptor.action === undefined || descriptor.action === 'can')) return descriptor;
  if (descriptor.kind === 'custom' && (descriptor.action === undefined || typeof descriptor.action === 'string')) return descriptor;
}

export function isQueryKey(value: unknown): value is QueryKey { return parseQueryKey(value) !== undefined; }

function has(value: QueryMatcher, key: keyof QueryMatcher): boolean { return Object.prototype.hasOwnProperty.call(value, key); }
function matchField(descriptor: QueryDescriptor, matcher: QueryMatcher, key: keyof QueryMatcher): boolean {
  if (!has(matcher, key)) return true;
  if (matcher[key] === undefined) return !(key in descriptor) || (descriptor as Record<string, unknown>)[key] === undefined;
  return (descriptor as Record<string, unknown>)[key] === matcher[key];
}

export function queryKeyMatches(queryKey: readonly unknown[], matcher: QueryMatcher = {}): boolean {
  const parsed = parseQueryKey(queryKey);
  if (!parsed) return false;
  if (matcher.kind !== undefined && matcher.kind !== parsed.kind) return false;
  if (has(matcher, 'provider')) {
    if (matcher.provider === undefined) return parsed.provider === 'default';
    if (matcher.provider !== parsed.provider) return false;
  }
  return matchField(parsed, matcher, 'tenant') && matchField(parsed, matcher, 'resource') && matchField(parsed, matcher, 'action') && matchField(parsed, matcher, 'id') && matchField(parsed, matcher, 'method');
}

export function dataQueryMatches(queryKey: readonly unknown[], matcher: DataQueryMatcher): boolean {
  return queryKeyMatches(queryKey, { ...matcher, kind: 'data' });
}
