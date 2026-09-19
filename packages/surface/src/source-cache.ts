import type {
  SurfaceDataSource,
  SurfaceResourcePolicy,
  SurfaceSourceDataState,
} from './types.js';

/** Only query/projection inputs belong in this key, never widget or layout data. */
export function snapshotSurfaceSource(source: SurfaceDataSource, policy: SurfaceResourcePolicy) {
  const snapshot: SurfaceDataSource = source.type === 'resource-one'
    ? { id: source.id, type: source.type, resource: source.resource, recordId: source.recordId }
    : {
        id: source.id,
        type: source.type,
        resource: source.resource,
        pageSize: source.pageSize ?? 10,
        sorters: (source.sorters ?? []).map(({ field, order }) => ({ field, order })),
        filters: (source.filters ?? []).map((filter) => {
          if (filter.operator === 'null' || filter.operator === 'nnull') {
            return { field: filter.field, operator: filter.operator };
          }
          if (filter.operator === 'in' || filter.operator === 'nin') {
            return { field: filter.field, operator: filter.operator, value: [...filter.value] };
          }
          return { ...filter };
        }),
      };
  const resourcePolicy: SurfaceResourcePolicy = {
    readFields: [...new Set(policy.readFields)].sort(),
    filterFields: [...new Set(policy.filterFields ?? [])].sort(),
    sortFields: [...new Set(policy.sortFields ?? [])].sort(),
    allowGetOne: policy.allowGetOne ?? false,
    ...(policy.maxPageSize === undefined ? {} : { maxPageSize: policy.maxPageSize }),
  };
  // Tuples give deterministic keys even when JSON object property order changes.
  // Array order (notably multi-column sorting) intentionally remains significant.
  const query = snapshot.type === 'resource-one'
    ? [snapshot.type, snapshot.resource, snapshot.recordId]
    : [
        snapshot.type, snapshot.resource, snapshot.pageSize,
        snapshot.sorters?.map(({ field, order }) => [field, order]),
        snapshot.filters?.map((filter) => [
          filter.field, filter.operator, 'value' in filter ? filter.value : null,
        ]),
      ];
  return {
    source: snapshot,
    resourcePolicy,
    key: JSON.stringify([query, resourcePolicy]),
  };
}

export interface SurfaceSourceRequest {
  readonly id: string;
  /** Values compare by Object.is; provider and permission identities are not serialized. */
  readonly identity: readonly unknown[];
  readonly load: (isCurrent: () => boolean) => Promise<SurfaceSourceDataState>;
  /** Also guards prop changes that happen before Svelte's next effect flush. */
  readonly isCurrent: () => boolean;
}

export function sameSourceIdentity(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}

interface SourceEntry {
  readonly identity: readonly unknown[];
  pending: Promise<void>;
}

interface SourceCacheSink {
  readonly set: (sourceId: string, state: SurfaceSourceDataState) => void;
  readonly remove: (sourceId: string) => void;
  readonly onError: (state: Extract<SurfaceSourceDataState, { status: 'error' }>) => void;
}

/** Per-renderer reconciliation, not a cross-user or cross-component data cache. */
export function createSurfaceSourceCache(sink: SourceCacheSink) {
  const entries = new Map<string, SourceEntry>();
  let disposed = false;

  function clear(): void {
    const ids = [...entries.keys()];
    entries.clear(); // Retire every pending owner before emitting state changes.
    for (const id of ids) sink.remove(id);
  }

  function start(request: SurfaceSourceRequest): Promise<void> {
    const entry: SourceEntry = { identity: [...request.identity], pending: Promise.resolve() };
    entries.set(request.id, entry);
    const current = () => {
      try {
        return !disposed && entries.get(request.id) === entry && request.isCurrent();
      } catch {
        return false;
      }
    };
    const retire = () => {
      if (entries.get(request.id) !== entry) return;
      entries.delete(request.id);
      sink.remove(request.id);
    };
    sink.set(request.id, { status: 'loading', sourceId: request.id });
    entry.pending = (async () => {
      if (!current()) { retire(); return; }
      let state: SurfaceSourceDataState;
      try {
        state = await request.load(current);
      } catch (failure) {
        state = {
          status: 'error', sourceId: request.id,
          error: {
            code: 'provider_failed', sourceId: request.id,
            message: failure instanceof Error ? failure.message : 'Data provider request failed',
          },
        };
      }
      if (!current()) { retire(); return; }
      sink.set(request.id, state);
      if (state.status === 'error') sink.onError(state);
    })();
    return entry.pending;
  }

  async function reconcile(
    requests: readonly SurfaceSourceRequest[],
    force?: true | string,
  ): Promise<void> {
    if (disposed) return;
    const activeIds = new Set(requests.map((request) => request.id));
    for (const id of entries.keys()) {
      if (!activeIds.has(id)) {
        entries.delete(id);
        sink.remove(id);
      }
    }
    const pending: Promise<void>[] = [];
    for (const request of requests) {
      const existing = entries.get(request.id);
      if (force === true || force === request.id || !existing
        || !sameSourceIdentity(existing.identity, request.identity)) {
        pending.push(start(request));
      } else if (force === undefined) {
        pending.push(existing.pending);
      }
    }
    await Promise.all(pending);
  }

  return {
    reconcile,
    clear,
    dispose() {
      disposed = true;
      clear();
    },
  };
}
