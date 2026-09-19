import { loadSurfaceSource } from './runtime.js';
import type { SurfaceAuthorizer } from './runtime.js';
import type {
  SurfaceDataError, SurfaceDataProvider, SurfaceDataSource, SurfacePolicy,
  SurfaceResourcePolicy, SurfaceSourceDataState, SurfaceSpec,
} from './types.js';

interface Entry {
  readonly source: SurfaceDataSource;
  readonly policy: SurfaceResourcePolicy;
  readonly provider: SurfaceDataProvider;
  readonly signature: string;
  active: boolean;
  pending: Promise<void>;
}

export interface SurfaceSourceControllerOptions {
  readonly authorize: SurfaceAuthorizer;
  readonly onState: (id: string, state: SurfaceSourceDataState | undefined) => void;
  readonly onError?: (error: SurfaceDataError) => void;
}

function signature(source: SurfaceDataSource, policy: SurfaceResourcePolicy): string {
  const query = source.type === 'resource-list'
    ? [source.type, source.resource, source.pageSize ?? 10,
        (source.sorters ?? []).map((sorter) => [sorter.field, sorter.order]),
        (source.filters ?? []).map((filter) => [filter.field, filter.operator, 'value' in filter ? filter.value : null])]
    : [source.type, source.resource, source.recordId];
  return JSON.stringify([query, [...policy.readFields].sort(), [...(policy.filterFields ?? [])].sort(),
    [...(policy.sortFields ?? [])].sort(), policy.allowGetOne === true, policy.maxPageSize ?? 100]);
}

/** 仅用于已通过整份 Surface 校验的定义；不缓存跨用户/租户的数据。 */
export function createSurfaceSourceController(options: SurfaceSourceControllerOptions) {
  const entries = new Map<string, Entry>();
  let scope: string | undefined;
  let disposed = false;

  function remove(id: string): void {
    const entry = entries.get(id);
    if (entry) entry.active = false;
    entries.delete(id);
    options.onState(id, undefined);
  }

  function clear(): void {
    for (const id of entries.keys()) remove(id);
    scope = undefined;
  }

  async function load(entry: Entry): Promise<void> {
    const id = entry.source.id;
    options.onState(id, { status: 'loading', sourceId: id });
    const result = await loadSurfaceSource({
      source: entry.source,
      resourcePolicy: entry.policy,
      provider: entry.provider,
      // 权限检查本身可能异步；被移除或换租户后，不能再启动网络请求。
      authorize: async (resource, action) => {
        if (!entry.active || disposed) return { can: false };
        const decision = await options.authorize(resource, action);
        return entry.active && !disposed ? decision : { can: false };
      },
    });
    if (!entry.active || disposed || entries.get(id) !== entry) return;
    options.onState(id, result);
    if (result.status === 'error') options.onError?.(result.error);
  }

  function start(source: SurfaceDataSource, policy: SurfaceResourcePolicy, provider: SurfaceDataProvider): Entry {
    const prior = entries.get(source.id);
    if (prior) prior.active = false;
    const entry: Entry = {
      // 校验后再制作独立请求快照，不让后续局部修改改写正在处理的请求。
      source: JSON.parse(JSON.stringify(source)) as SurfaceDataSource,
      policy: JSON.parse(JSON.stringify(policy)) as SurfaceResourcePolicy,
      signature: signature(source, policy), provider, active: true, pending: Promise.resolve(),
    };
    entries.set(source.id, entry);
    entry.pending = load(entry);
    return entry;
  }

  async function reconcile(
    spec: SurfaceSpec,
    policy: SurfacePolicy,
    providerFor: (resource: string) => SurfaceDataProvider,
    scopeKey = '',
  ): Promise<void> {
    if (disposed) return;
    const nextScope = JSON.stringify([spec.surfaceId, spec.catalogVersion, scopeKey]);
    if (scope !== nextScope) { clear(); scope = nextScope; }
    const ids = new Set(spec.dataSources.map((source) => source.id));
    for (const id of entries.keys()) if (!ids.has(id)) remove(id);
    const pending: Promise<void>[] = [];
    for (const source of spec.dataSources) {
      const rule = Object.hasOwn(policy.resources, source.resource) ? policy.resources[source.resource] : undefined;
      if (!rule) { remove(source.id); continue; }
      let provider: SurfaceDataProvider;
      try {
        provider = providerFor(source.resource);
      } catch (failure) {
        remove(source.id);
        const error: SurfaceDataError = { code: 'provider_failed', sourceId: source.id,
          message: failure instanceof Error ? failure.message : 'Data provider unavailable' };
        options.onState(source.id, { status: 'error', sourceId: source.id, error });
        options.onError?.(error);
        continue;
      }
      const existing = entries.get(source.id);
      if (existing && existing.provider === provider && existing.signature === signature(source, rule)) {
        pending.push(existing.pending);
      } else {
        pending.push(start(source, rule, provider).pending);
      }
    }
    await Promise.all(pending);
  }

  async function refresh(sourceId?: string): Promise<void> {
    if (disposed) return;
    const targets = [...entries.values()].filter((entry) => sourceId === undefined || entry.source.id === sourceId);
    await Promise.all(targets.map((entry) => start(entry.source, entry.policy, entry.provider).pending));
  }

  return {
    reconcile, refresh, clear,
    dispose() { disposed = true; clear(); },
  };
}
