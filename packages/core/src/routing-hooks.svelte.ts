import { captureAdminContext } from './context.svelte';
import { useParsed } from './useParsed.svelte';
import { sanitizeListQueryParams } from './url-sync';

// ─── routing-hooks.svelte.ts ───────────────────────────────────

export function useGetToPath() {
  const adminContext = captureAdminContext();
  const parsed = useParsed();

  return (options: { resource?: string; action?: 'list' | 'create' | 'edit' | 'show' | 'clone'; id?: string | number; meta?: Record<string, unknown> }) => {
    const { resource, action, id, meta } = options;
    if (!resource) return '/';

    // Support nested resources: use meta.parentPath or auto-detect from current URL
    let basePath: string;
    if (meta?.parentPath) {
      basePath = `${meta.parentPath}/${resource}`;
    } else if (parsed.resourcePath && parsed.resource === resource) {
      // Re-use the current nested path context (e.g., /teams/123/users)
      basePath = `/${parsed.resourcePath}`;
    } else {
      basePath = `/${resource}`;
    }

    let path = basePath;
    if (action === 'create') path += '/create';
    else if (action === 'edit' && id) path += `/edit/${id}`;
    else if (action === 'show' && id) path += `/show/${id}`;
    else if (action === 'clone' && id) path += `/clone/${id}`;

    // Apply router mapping if the router provider defines custom path transformers
    if (adminContext.routerProvider?.go) {
      // SvelteKit path generation can be injected here.
    }
    return path;
  };
}

export function useGo() {
  const adminContext = captureAdminContext();
  const getToPath = useGetToPath();

  return (options: { to?: string; query?: Record<string, unknown>; type?: 'push' | 'replace'; resource?: string; action?: 'list' | 'create' | 'edit' | 'show' | 'clone'; id?: string | number }) => {
    let targetUrl = options.to;
    if (!targetUrl && options.resource) {
      targetUrl = getToPath({ resource: options.resource, action: options.action, id: options.id });
    }
    if (!targetUrl) targetUrl = '/';

    if (options.query && Object.keys(options.query).length > 0) {
      const qs = new URLSearchParams(Object.entries(options.query).map(([k, v]) => [k, String(v)])).toString();
      if (qs) {
        targetUrl += targetUrl.includes('?') ? `&${qs}` : `?${qs}`;
      }
    }

    void adminContext.navigate(targetUrl, options.type === 'replace' ? { replaceState: true } : undefined);
  };
}

export function useBack() {
  const adminContext = captureAdminContext();
  return () => adminContext.back();
}

/**
 * useLink replaces standard <a> tags with Svelte routing-aware links 
 * (to avoid full page reloads in SSR apps)
 */
export function useLink() {
  const adminContext = captureAdminContext();
  return () => {
    const routerProvider = adminContext.routerProvider as unknown as Record<string, unknown> | undefined;
    return (routerProvider?.Link as string) ?? 'a';
  };
}

export function useResource(resourceName?: string) {
  const adminContext = captureAdminContext();
  const parsed = useParsed();

  // Derived resource — re-evaluates when parsed.resource or resourceName changes
  const resolvedResource = $derived.by(() => {
    const target = resourceName ?? parsed.resource;
    if (!target) return undefined;
    try {
      return adminContext.getResource(target);
    } catch {
      return undefined;
    }
  });

  return {
    get resource() { return resolvedResource; },
    get resources() { return adminContext.resources; },
    get identifier() { return resolvedResource?.identifier ?? resolvedResource?.name; },
    /** 当前 URL 解析出的 parent 资源信息（嵌套资源路由） */
    get parent() {
      const parentParams: Record<string, string> = {};
      // 只取路径解析出的 parent params，排除 query params 的误判
      for (const [k, v] of Object.entries(parsed.parentParams)) {
        if (v) parentParams[k] = v;
      }
      return Object.keys(parentParams).length > 0 ? parentParams : undefined;
    },
    /** Resolve a resource by name — useful for dynamic lookups inside callbacks */
    select: (name: string) => {
      try {
        const res = adminContext.getResource(name);
        return { resource: res, identifier: res.identifier ?? res.name };
      } catch {
        return { resource: undefined, identifier: undefined };
      }
    },
  };
}

export function useNavigation() {
  const go = useGo();
  const parsed = useParsed();
  const listQuery = (resource?: string) => {
    const target = resource ?? parsed.resourcePath ?? parsed.resource;
    const targetResource = target?.split('/').filter(Boolean).at(-1);
    if (targetResource && parsed.resource && targetResource !== parsed.resource) return {};
    return sanitizeListQueryParams(parsed.params ?? {});
  };

  return {
    create: (resource?: string) => go({ type: 'push', resource: resource ?? parsed.resourcePath ?? parsed.resource, action: 'create', query: listQuery(resource) }),
    edit: (resource?: string, id?: string | number) => go({ type: 'push', resource: resource ?? parsed.resourcePath ?? parsed.resource, action: 'edit', id: id ?? parsed.id, query: listQuery(resource) }),
    clone: (resource?: string, id?: string | number) => go({ type: 'push', resource: resource ?? parsed.resourcePath ?? parsed.resource, action: 'clone', id: id ?? parsed.id, query: listQuery(resource) }),
    show: (resource?: string, id?: string | number) => go({ type: 'push', resource: resource ?? parsed.resourcePath ?? parsed.resource, action: 'show', id: id ?? parsed.id, query: listQuery(resource) }),
    list: (resource?: string) => go({ type: 'push', resource: resource ?? parsed.resourcePath ?? parsed.resource, action: 'list', query: listQuery(resource) }),
    push: (url: string) => go({ to: url, type: 'push' }),
    replace: (url: string) => go({ to: url, type: 'replace' }),
    goBack: useBack(),
  };
}
