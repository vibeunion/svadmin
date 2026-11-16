import { createCursorPageCache, type CursorPage, type CursorPageCache, type CursorProvider } from './cursor-provider';

export interface CursorListRequestOptions {
  signal: AbortSignal;
  bypassCache: boolean;
}

export interface CursorListState<TQuery, TItem> {
  /** 最近成功应用的查询；范围变更后的首次成功读取之前 initialized 为 false。 */
  readonly query: TQuery;
  readonly queryKey: string;
  readonly scopeKey: string;
  readonly items: readonly TItem[];
  readonly page: number;
  readonly initialized: boolean;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
  readonly loading: boolean;
  readonly requestedPage: number | null;
  readonly error: unknown;
}

/** code 可供宿主本地化；message 仅作为 provider 协议错误的诊断。 */
export class CursorListError extends Error {
  readonly code = 'CURSOR_NOT_ADVANCING';
  constructor() {
    super('The provider returned a non-advancing cursor.');
    this.name = 'CursorListError';
  }
}

export interface CursorListController<TQuery, TItem> {
  readonly state: CursorListState<TQuery, TItem>;
  /** Svelte store-compatible subscription; the first snapshot is synchronous. */
  subscribe(listener: (state: CursorListState<TQuery, TItem>) => void): () => void;
  next(): Promise<boolean>;
  previous(): Promise<boolean>;
  /** queryKey 包含有效筛选、排序和每页条数；scopeKey 变化立即清除旧范围。 */
  setQuery(query: TQuery, queryKey: string, scopeKey?: string): Promise<boolean>;
  /** 显式查询/清除入口：即使条件不变也重新读取第一页。 */
  resetQuery(query: TQuery, queryKey: string, scopeKey?: string): Promise<boolean>;
  refresh(options?: { resetToFirstPage?: boolean }): Promise<boolean>;
  retry(): Promise<boolean>;
  cancel(): void;
  dispose(): void;
}

interface PageRequest<TQuery, TItem> {
  query: TQuery;
  queryKey: string;
  scopeKey: string;
  page: number;
  bypassCache: boolean;
  cache: CursorPageCache<TItem>;
}

/**
 * An opt-in cursor list store, independent of Svelte, transport and DOM APIs.
 * Query values must be immutable; callers own the semantic query and scope keys.
 * Returns true only when a request or cached navigation commits a page.
 */
export function createCursorListController<TQuery, TItem>(options: {
  provider: CursorProvider<TQuery, TItem, CursorListRequestOptions>;
  query: TQuery;
  queryKey: string;
  /** 资源、provider 或授权范围变化时必须更换此键。 */
  scopeKey: string;
}): CursorListController<TQuery, TItem> {
  let cache = createCursorPageCache<TItem>();
  const listeners = new Set<(state: CursorListState<TQuery, TItem>) => void>();
  let state: CursorListState<TQuery, TItem> = {
    query: options.query, queryKey: options.queryKey, scopeKey: options.scopeKey,
    items: [], page: 1, initialized: false, hasPrevious: false, hasNext: false,
    loading: false, requestedPage: null, error: null,
  };
  let generation = 0;
  let pending: { controller: AbortController; cancel: () => void; intent: PageRequest<TQuery, TItem> } | null = null;
  let failedRequest: PageRequest<TQuery, TItem> | null = null;
  let disposed = false;

  function publish(patch: Partial<CursorListState<TQuery, TItem>>): void {
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state);
  }

  function abort(): void {
    generation += 1;
    const request = pending;
    pending = null;
    request?.cancel();
    request?.controller.abort();
  }

  function currentPageRequest(page: number, bypassCache = false): PageRequest<TQuery, TItem> {
    return { query: state.query, queryKey: state.queryKey, scopeKey: state.scopeKey, page, bypassCache, cache };
  }

  function matchesApplied(intent: PageRequest<TQuery, TItem>): boolean {
    return intent.queryKey === state.queryKey && intent.scopeKey === state.scopeKey;
  }

  async function load(intent: PageRequest<TQuery, TItem>): Promise<boolean> {
    if (disposed || state.loading) return false;
    const { query, queryKey, scopeKey, page, bypassCache } = intent;
    const cursor = intent.cache.cursorForPage(page);
    if (cursor === undefined) return false;
    const request = new AbortController();
    const currentGeneration = ++generation;
    let settleCancellation: () => void = () => {};
    const cancelled = new Promise<null>(resolve => { settleCancellation = () => resolve(null); });
    const current = () => !disposed && currentGeneration === generation && !request.signal.aborted;
    pending = { controller: request, cancel: settleCancellation, intent };
    failedRequest = null;
    publish({ loading: true, requestedPage: page, error: null });
    try {
      if (!current()) return false;
      const cached = bypassCache ? undefined : intent.cache.page(page);
      // 取消先结束控制器动作；迟到的 provider 响应或异常仍由 race 接收，不提交状态。
      const result: CursorPage<TItem> | null = cached ?? await Promise.race([
        options.provider.getList({ query, cursor, options: { signal: request.signal, bypassCache } }),
        cancelled,
      ]);
      if (!result || !current()) return false;
      if (result.nextCursor !== null && result.nextCursor === cursor) throw new CursorListError();
      if (!cached) intent.cache.save(page, result);
      cache = intent.cache;
      // 页码、查询、记录与游标链在同一有效成功响应后一起提交。
      publish({
        query, queryKey, scopeKey, items: result.items, page, initialized: true,
        hasPrevious: page > 1, hasNext: Boolean(result.nextCursor),
        loading: false, requestedPage: null, error: null,
      });
      return true;
    } catch (error) {
      if (!current()) return false;
      failedRequest = intent;
      publish({ loading: false, requestedPage: null, error });
      return false;
    } finally {
      if (currentGeneration === generation) pending = null;
    }
  }

  function applyQuery(query: TQuery, queryKey: string, scopeKey: string, force = false): Promise<boolean> {
    if (disposed) return Promise.resolve(false);
    if (pending?.intent.queryKey === queryKey && pending.intent.scopeKey === scopeKey
      && (!force || pending.intent.page === 1)) return Promise.resolve(false);
    if (!force && queryKey === state.queryKey && scopeKey === state.scopeKey) {
      // 用户回到已应用查询时取消另一个在途查询，不让其稍后覆盖当前结果。
      if ((pending && !matchesApplied(pending.intent)) || (failedRequest && !matchesApplied(failedRequest))) {
        abort();
        failedRequest = null;
        publish({ loading: false, requestedPage: null, error: null });
      }
      return Promise.resolve(false);
    }
    abort();
    const nextCache = createCursorPageCache<TItem>();
    failedRequest = null;
    if (scopeKey !== state.scopeKey) {
      cache = nextCache;
      publish({ query, queryKey, scopeKey, items: [], page: 1, initialized: false,
        hasPrevious: false, hasNext: false, loading: false, requestedPage: null, error: null });
    } else {
      publish({ loading: false, requestedPage: null, error: null });
    }
    return load({ query, queryKey, scopeKey, page: 1, bypassCache: force, cache: nextCache });
  }

  return {
    get state() { return state; },
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      listener(state);
      return () => { listeners.delete(listener); };
    },
    next() {
      return state.hasNext ? load(currentPageRequest(state.page + 1)) : Promise.resolve(false);
    },
    previous() {
      return state.hasPrevious ? load(currentPageRequest(state.page - 1)) : Promise.resolve(false);
    },
    setQuery(query, queryKey, scopeKey = state.scopeKey) {
      return applyQuery(query, queryKey, scopeKey);
    },
    resetQuery(query, queryKey, scopeKey = state.scopeKey) {
      return applyQuery(query, queryKey, scopeKey, true);
    },
    refresh(refreshOptions = {}) {
      return load(currentPageRequest(refreshOptions.resetToFirstPage ? 1 : state.page, true));
    },
    retry() {
      return failedRequest ? load(failedRequest) : Promise.resolve(false);
    },
    cancel() {
      if (disposed) return;
      abort();
      publish({ loading: false, requestedPage: null });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      abort();
      listeners.clear();
      state = { ...state, loading: false, requestedPage: null };
    },
  };
}
