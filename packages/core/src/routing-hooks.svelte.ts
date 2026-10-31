import { definedOptions } from './defined-options';
import { captureAdminContext } from './context.svelte';
import { getAdminOptions, setAdminOptions } from './options.svelte';
import type { MutationMode } from './types';
import { getUnsavedChanges, setUnsavedChanges } from './unsaved-changes.svelte';
import { useParsed } from './useParsed.svelte';
import { sanitizeListQueryParams } from './url-sync';

// ─── routing-hooks.svelte.ts ───────────────────────────────────

export function useGetToPath() {
  const adminContext=captureAdminContext();
  const parsed=useParsed();

  return (options: { resource?: string; action?: 'list'|'create'|'edit'|'show'|'clone'; id?: string|number; meta?: Record<string,unknown> }) => {
    const { resource,action,id,meta }=options;
    if(!resource) return '/';

    // Support nested resources: use meta.parentPath or auto-detect from current URL
    let basePath: string;
    if(meta?.['parentPath']) {
      basePath=`${meta['parentPath']}/${resource}`;
    } else if(parsed.resourcePath&&parsed.resource===resource) {
      // Re-use the current nested path context (e.g., /teams/123/users)
      basePath=`/${parsed.resourcePath}`;
    } else {
      basePath=`/${resource}`;
    }

    let path=basePath;
    if(action==='create') path+='/create';
    else if(action==='edit'&&id) path+=`/edit/${id}`;
    else if(action==='show'&&id) path+=`/show/${id}`;
    else if(action==='clone'&&id) path+=`/clone/${id}`;

    const provider = adminContext.routerProvider;
    if (provider?.toPath) {
      return provider.toPath({
        path,
        ...definedOptions({ resource, action, id, meta }),
      });
    }
    return path;
  };
}

/** Refine migration hook: the configured mutation mode. */
export function useMutationMode(): MutationMode {
  return getAdminOptions().mutationMode ?? 'pessimistic';
}

/**
 * Refine migration hook for unsaved-change prompts.
 * `setWarnWhen` marks the form dirty; `setWarnWhenUnsavedChanges` toggles the guard.
 */
export function useWarnAboutChange() {
  return {
    get warnWhenUnsavedChanges() {
      return getAdminOptions().warnWhenUnsavedChanges ?? false;
    },
    setWarnWhen(value: boolean) {
      setUnsavedChanges(value);
    },
    setWarnWhenUnsavedChanges(value: boolean) {
      setAdminOptions({ warnWhenUnsavedChanges: value }, true);
    },
    get hasUnsavedChanges() {
      return getUnsavedChanges();
    },
  };
}

/** Refine migration hook: whether list state is synced to the URL, plus the current params. */
export function useSyncWithLocation() {
  const parsed = useParsed();
  return {
    get syncWithLocation() {
      return getAdminOptions().syncWithLocation ?? false;
    },
    get params() {
      return parsed.params;
    },
  };
}

/** Refine migration hook: resource meta merged with the current route. */
export function useMeta(resourceName?: string) {
  const resourceState = useResource(resourceName);
  const parsed = useParsed();
  return {
    get meta() {
      const resource = resourceState.resource;
      return {
        ...(resource?.meta ?? {}),
        ...(resourceState.parent ? { parent: resourceState.parent } : {}),
        route: parsed.resource,
        action: parsed.action,
        id: parsed.id,
      };
    },
  };
}

export function useGo() {
  const adminContext=captureAdminContext();
  const getToPath=useGetToPath();

  return (options: { to?: string; query?: Record<string,unknown>; type?: 'push'|'replace'; resource?: string; action?: 'list'|'create'|'edit'|'show'|'clone'; id?: string|number }) => {
    let targetUrl=options.to;
    if(!targetUrl&&options.resource) {
      targetUrl=getToPath({
        resource: options.resource,...definedOptions({
          action: options.action,
          id: options.id,
        }),
      });
    }
    if(!targetUrl) targetUrl='/';

    if(options.query&&Object.keys(options.query).length>0) {
      const qs=new URLSearchParams(Object.entries(options.query).map(([k,v]) => [k,String(v)])).toString();
      if(qs) {
        targetUrl+=targetUrl.includes('?')? `&${qs}`:`?${qs}`;
      }
    }

    void adminContext.navigate(targetUrl,options.type==='replace'? { replaceState: true }:undefined);
  };
}

export function useBack() {
  const adminContext=captureAdminContext();
  return () => adminContext.back();
}

/**
 * useLink replaces standard <a> tags with Svelte routing-aware links 
 * (to avoid full page reloads in SSR apps)
 */
export function useLink() {
  const adminContext=captureAdminContext();
  return () => {
    const provider=adminContext.routerProvider;
    if(!provider||!('Link' in provider)||provider.Link===undefined) return 'a';
    if(typeof provider.Link!=='string') throw new TypeError('Router Link must be a tag name');
    return provider.Link;
  };
}

export function useResource(resourceName?: string) {
  const adminContext=captureAdminContext();
  const parsed=useParsed();

  // Derived resource — re-evaluates when parsed.resource or resourceName changes
  const resolvedResource=$derived.by(() => {
    const target=resourceName??parsed.resource;
    if(!target) return undefined;
    try {
      return adminContext.getResource(target);
    } catch {
      return undefined;
    }
  });

  return {
    get resource() { return resolvedResource; },
    get resources() { return adminContext.resources; },
    get identifier() { return resolvedResource?.identifier??resolvedResource?.name; },
    /** Parent resource information parsed from the current nested-resource URL. */
    get parent() {
      const parentParams: Record<string,string>={};
      // Use only parent params parsed from the path and exclude query params.
      for(const [k,v] of Object.entries(parsed.parentParams)) {
        if(v) parentParams[k]=v;
      }
      return Object.keys(parentParams).length>0? parentParams:undefined;
    },
    /** Resolve a resource by name — useful for dynamic lookups inside callbacks */
    select: (name: string) => {
      try {
        const res=adminContext.getResource(name);
        return { resource: res,identifier: res.identifier??res.name };
      } catch {
        return { resource: undefined,identifier: undefined };
      }
    },
  };
}

export function useNavigation() {
  const go=useGo();
  const parsed=useParsed();
  const listQuery=(resource?: string) => {
    const target=resource??parsed.resourcePath??parsed.resource;
    const targetResource=target?.split('/').filter(Boolean).at(-1);
    if(targetResource&&parsed.resource&&targetResource!==parsed.resource) return {};
    return sanitizeListQueryParams(parsed.params??{});
  };

  return {
    create: (resource?: string) => go({
      type: 'push',...definedOptions({ resource: resource??parsed.resourcePath??parsed.resource }),action: 'create',...definedOptions({
        query: listQuery(resource)
      })
    }),
    edit: (resource?: string,id?: string|number) => go({
      type: 'push',...definedOptions({ resource: resource??parsed.resourcePath??parsed.resource }),action: 'edit',...definedOptions({
        id: id??parsed.id,query: listQuery(resource)
      })
    }),
    clone: (resource?: string,id?: string|number) => go({
      type: 'push',...definedOptions({ resource: resource??parsed.resourcePath??parsed.resource }),action: 'clone',...definedOptions({
        id: id??parsed.id,query: listQuery(resource)
      })
    }),
    show: (resource?: string,id?: string|number) => go({
      type: 'push',...definedOptions({ resource: resource??parsed.resourcePath??parsed.resource }),action: 'show',...definedOptions({
        id: id??parsed.id,query: listQuery(resource)
      })
    }),
    list: (resource?: string) => go({
      type: 'push',...definedOptions({ resource: resource??parsed.resourcePath??parsed.resource }),action: 'list',...definedOptions({
        query: listQuery(resource)
      })
    }),
    push: (url: string) => go({ to: url,type: 'push' }),
    replace: (url: string) => go({ to: url,type: 'replace' }),
    goBack: useBack(),
  };
}
