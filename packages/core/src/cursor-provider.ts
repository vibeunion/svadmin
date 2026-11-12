/**
 * Shared cursor pagination contracts for providers whose backend does not expose
 * a stable total count. A cursor is opaque to the UI and must only be reused
 * with the query that produced it.
 */

export interface CursorPage<TItem> {
  items: TItem[];
  nextCursor: string | null;
}

export interface CursorProviderInput<TQuery, TOptions = unknown> {
  query: TQuery;
  cursor?: string | null;
  options?: TOptions;
}

export interface CursorProvider<TQuery, TItem, TOptions = unknown> {
  getList(input: CursorProviderInput<TQuery, TOptions>): Promise<CursorPage<TItem>>;
}

export type CursorPageFetcher<TQuery, TItem, TOptions = unknown> =
  (input: CursorProviderInput<TQuery, TOptions>) => Promise<CursorPage<TItem>>;

/** Creates a typed cursor provider without coupling projects to a transport. */
export function createCursorProvider<TQuery, TItem, TOptions = unknown>(
  fetchPage: CursorPageFetcher<TQuery, TItem, TOptions>,
): CursorProvider<TQuery, TItem, TOptions> {
  return { getList: fetchPage };
}

export interface CursorPageCache<TItem> {
  reset(): void;
  cursorForPage(page: number): string | null | undefined;
  page(page: number): CursorPage<TItem> | undefined;
  save(page: number, value: CursorPage<TItem>): void;
}

/** Keeps visited pages and the opaque cursor chain needed to reach them. */
export function createCursorPageCache<TItem>(): CursorPageCache<TItem> {
  let pages = new Map<number, CursorPage<TItem>>();
  let cursors = new Map<number, string | null>([[1, null]]);

  return {
    reset() {
      pages = new Map();
      cursors = new Map([[1, null]]);
    },
    cursorForPage(page) {
      return cursors.get(page);
    },
    page(page) {
      return pages.get(page);
    },
    save(page, value) {
      pages.set(page, value);
      for (const key of pages.keys()) {
        if (key > page) pages.delete(key);
      }
      for (const key of cursors.keys()) {
        if (key > page + 1) cursors.delete(key);
      }
      if (value.nextCursor) cursors.set(page + 1, value.nextCursor);
      else cursors.delete(page + 1);
    },
  };
}
