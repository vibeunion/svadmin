// Router Provider — abstracts routing strategy (hash, history, SvelteKit, etc.)

export type RouterNavigationResult = false | ReturnType<() => void>;

export interface RouterProvider {
  /** Navigate to a path */
  go: (options: {
    to: string;
    query?: Record<string, string>;
    hash?: string;
    type?: 'push' | 'replace';
  }) => RouterNavigationResult | Promise<RouterNavigationResult>;
  /** Navigate back */
  back: () => void;
  /** Parse current URL into structured route info */
  parse: () => {
    resource?: string;
    action?: string;
    id?: string;
    params: Record<string, string>;
    pathname: string;
  };
  /** Formats an internal path into an href string for <a> tags */
  formatLink?: (path: string) => string;
}

// ─── Hash Router (default) ──────────────────────────────────

export function createHashRouterProvider(): RouterProvider {
  return {
    go({ to, query, hash, type = 'push' }) {
      if (typeof window === 'undefined') return;
      let url = to;
      if (query) {
        const params = new URLSearchParams(query).toString();
        if (params) url += url.includes('?') ? `&${params}` : `?${params}`;
      }
      if (hash) url += `#${hash}`;
      if (type === 'replace') {
        const urlObj = new URL(window.location.href);
        urlObj.hash = url;
        window.history.replaceState(null, '', urlObj.href);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        window.location.hash = url;
      }
    },
    back() {
      if (typeof window === 'undefined') return;
      history.back();
    },
    parse() {
      if (typeof window === 'undefined') {
        return { resource: undefined, action: undefined, id: undefined, params: {}, pathname: '/' };
      }
      const hash = window.location.hash.slice(1) || '/';
      const [pathname, queryString] = hash.split('?');
      const params: Record<string, string> = {};
      if (queryString) {
        for (const [k, v] of new URLSearchParams(queryString).entries()) {
          params[k] = v;
        }
      }
      const segments = pathname.split('/').filter(Boolean);
      return {
        resource: segments[0],
        action: segments[1],
        id: segments[2],
        params,
        pathname,
      };
    },
    formatLink(path) {
      return '#' + path.replace(/^#/, '');
    },
  };
}

// ─── History Router (HTML5 pushState) ───────────────────────

export function createHistoryRouterProvider(basePath = ''): RouterProvider {
  const normalizedBase = basePath.endsWith('/') && basePath.length > 1 ? basePath.slice(0, -1) : basePath;
  return {
    go({ to, query, hash, type = 'push' }) {
      if (typeof window === 'undefined') return;
      let url = `${normalizedBase}${to}`;
      if (query) {
        const params = new URLSearchParams(query).toString();
        if (params) url += url.includes('?') ? `&${params}` : `?${params}`;
      }
      if (hash) url += `#${hash}`;
      if (type === 'replace') {
        history.replaceState(null, '', url);
      } else {
        history.pushState(null, '', url);
      }
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    back() {
      if (typeof window === 'undefined') return;
      history.back();
    },
    parse() {
      if (typeof window === 'undefined') {
        return { resource: undefined, action: undefined, id: undefined, params: {}, pathname: '/' };
      }
      const fullPath = window.location.pathname;
      const pathname = (normalizedBase && fullPath.startsWith(normalizedBase)
        && (fullPath.length === normalizedBase.length || fullPath[normalizedBase.length] === '/')
        ? fullPath.slice(normalizedBase.length) || '/'
        : window.location.pathname);
      const params: Record<string, string> = {};
      for (const [k, v] of new URLSearchParams(window.location.search).entries()) {
        params[k] = v;
      }
      const segments = pathname.split('/').filter(Boolean);
      return {
        resource: segments[0],
        action: segments[1],
        id: segments[2],
        params,
        pathname,
      };
    },
    formatLink(path) {
      return normalizedBase + path;
    },
  };
}
