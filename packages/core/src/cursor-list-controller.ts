import { createCursorPageCache, type CursorProvider } from './cursor-provider';

export interface CursorListRequestOptions {
  signal: AbortSignal;
  bypassCache: boolean;
}

export interface CursorListState<TQuery, TItem> {
  readonly query: TQuery;
  readonly queryKey: string;
  readonly items: readonly TItem[];
  readonly page: number;
  readonly initialized: boolean;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
  readonly loading: boolean;
  readonly requestedPage: number | null;
  readonly error: unknown;
}

export interface CursorListController<TQuery, TItem> {
  readonly state: CursorListState<TQuery, TItem>;
  /** Svelte store-compatible subscription; the first snapshot is synchronous. */
  subscribe(listener: (state: CursorListState<TQuery, TItem>) => void): () => void;
  next(): Promise<boolean>;
  previous(): Promise<boolean>;
  /** Include resource, filters, sort, page size and authorization scope in this stable key. */
  setQuery(query: TQuery, queryKey: string): Promise<boolean>;
  refresh(options?: { resetToFirstPage?: boolean }): Promise<boolean>;
  retry(): Promise<boolean>;
  cancel(): void;
  dispose(): void;
}

/**
 * An opt-in cursor list store, independent of Svelte, transport and DOM APIs.
 * Query values must be immutable; callers own the semantic query/scope key.
 * Returns true only when a request or cached navigation commits a page.
 */
export function createCursorListController<TQuery, TItem>(options: {
  provider: CursorProvider<TQuery, TItem, CursorListRequestOptions>;
  query: TQuery;
  queryKey: string;
}): CursorListController<TQuery, TItem> {
  const cache = createCursorPageCache<TItem>();
  const listeners = new Set<(state: CursorListState<TQuery, TItem>) => void>();
  let state: CursorListState<TQuery, TItem> = {
    query: options.query, queryKey: options.queryKey, items: [], page: 1,
    initialized: false, hasPrevious: false, hasNext: false,
    loading: false, requestedPage: null, error: null,
  };
  let generation = 0;
  let pending: AbortController | null = null;
  let failedRequest: { page: number; bypassCache: boolean } | null = null;
  let disposed = false;

  function publish(patch: Partial<CursorListState<TQuery, TItem>>): void {
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state);
  }

  function abort(): void {
    generation += 1;
    pending?.abort();
    pending = null;
  }

  async function load(page: number, bypassCache = false): Promise<boolean> {
    if (disposed || state.loading) return false;
    const cursor = cache.cursorForPage(page);
    if (cursor === undefined) return false;
    const request = new AbortController();
    const currentGeneration = ++generation;
    const query = state.query;
    pending = request;
    failedRequest = null;
    publish({ loading: true, requestedPage: page, error: null });
    try {
      const cached = bypassCache ? undefined : cache.page(page);
      const result = cached ?? await options.provider.getList({
        query, cursor, options: { signal: request.signal, bypassCache },
      });
      if (disposed || currentGeneration !== generation || request.signal.aborted) return false;
      if (result.nextCursor !== null && result.nextCursor === cursor) {
        throw new Error('Cursor did not advance. Refresh the list before retrying.');
      }
      if (!cached) cache.save(page, result);
      publish({
        items: result.items, page, initialized: true,
        hasPrevious: page > 1, hasNext: Boolean(result.nextCursor),
        loading: false, requestedPage: null, error: null,
      });
      return true;
    } catch (error) {
      if (disposed || currentGeneration !== generation || request.signal.aborted) return false;
      failedRequest = { page, bypassCache };
      publish({ loading: false, requestedPage: null, error });
      return false;
    } finally {
      if (currentGeneration === generation) pending = null;
    }
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
      return state.hasNext ? load(state.page + 1) : Promise.resolve(false);
    },
    previous() {
      return state.hasPrevious ? load(state.page - 1) : Promise.resolve(false);
    },
    setQuery(query, queryKey) {
      if (disposed || queryKey === state.queryKey) return Promise.resolve(false);
      abort();
      cache.reset();
      failedRequest = null;
      publish({ query, queryKey, items: [], page: 1, initialized: false,
        hasPrevious: false, hasNext: false, loading: false, requestedPage: null, error: null });
      return load(1);
    },
    refresh(refreshOptions = {}) {
      return load(refreshOptions.resetToFirstPage ? 1 : state.page, true);
    },
    retry() {
      return failedRequest ? load(failedRequest.page, failedRequest.bypassCache) : Promise.resolve(false);
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
