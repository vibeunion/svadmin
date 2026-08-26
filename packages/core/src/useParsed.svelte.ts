/* eslint-disable @typescript-eslint/no-explicit-any */
// useParsed — parse current URL hash into structured route info

import { registerRouterSync } from './router';
import { captureAdminContext } from './context.svelte';
import { parseResourceActionSegments } from './route-parsing';

interface ParsedRoute {
  resource?: string;
  resourcePath?: string;
  action?: 'list' | 'create' | 'edit' | 'show' | 'clone';
  id?: string;
  /** Query params parsed from the URL search string (e.g. ?page=2). */
  params: Record<string, string>;
  /** Parent path params derived from nested routes (e.g. /teams/123/users -> teamId). */
  parentParams: Record<string, string>;
}

let routeVersion = $state(0);

export function resetGlobalPath(): void {
  routeVersion++;
}
export function syncGlobalPath(): void {
  routeVersion++;
}

/** 简单的英文名词单数化，处理常见复数模式（-ies, -ses, -es, -s） */
function singularize(word: string): string {
  if (word.endsWith('ies') && word.length > 3) return word.slice(0, -3) + 'y';
  if (word.endsWith('ses') && word.length > 3) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 2) return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 1) return word.slice(0, -1);
  return word;
}

registerRouterSync(syncGlobalPath);

if (typeof window !== 'undefined') {
  if (!(window as any).__svadminParsedInit) {
    (window as any).__svadminParsedInit = true;
    window.addEventListener('hashchange', syncGlobalPath);
    window.addEventListener('popstate', syncGlobalPath);
  }
}

/**
 * Parse the current hash URL into a structured route object.
 * Returns reactive properties that update when the URL changes.
 *
 * Usage:
 *   const parsed = useParsed();
 *   // parsed.resource === 'posts'
 *   // parsed.action === 'edit'
 *   // parsed.id === '123'
 *   // parsed.params contains query params only
 *   // parsed.parentParams contains nested route params such as teamId
 */
export function useParsed(): ParsedRoute {
  const adminContext = captureAdminContext();
  const resources = $derived(adminContext.resources);
  const activePath = $derived.by(() => {
    // Any router navigation increments routeVersion. Each tree then asks its
    // captured provider for its own path instead of consuming a global router.
    void routeVersion;
    return adminContext.currentPath();
  });

  const parsed = $derived.by(() => {
    const p = activePath;
    const result: ParsedRoute = { params: {}, parentParams: {} };

    // Parse query params from hash
    const [pathname, queryString] = p.split('?');
    if (queryString) {
      const sp = new URLSearchParams(queryString);
      for (const [k, v] of sp.entries()) {
        result.params[k] = v;
      }
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return result;

    // Find the rightmost segment that matches a known resource name
    const resourceNames = resources.map(r => r.name);
    let resourceIndex = -1;
    for (let i = segments.length - 1; i >= 0; i--) {
      if (resourceNames.includes(segments[i])) {
        resourceIndex = i;
        break;
      }
    }

    if (resourceIndex !== -1) {
      result.resource = segments[resourceIndex];
      result.resourcePath = segments.slice(0, resourceIndex + 1).join('/');

      // Add parent path params based on `<parentResource>/<parentId>` structure.
      // These are kept separate from query params so that downstream filter
      // injection only applies to path-derived parent params, never to
      // arbitrary query params like ?tenantId=1.
      for (let i = 0; i < resourceIndex; i += 2) {
        if (segments[i] && segments[i + 1]) {
          const parentName = segments[i];
          const singular = singularize(parentName);
          result.parentParams[`${singular}Id`] = segments[i + 1];
        }
      }

      Object.assign(result, parseResourceActionSegments(segments.slice(resourceIndex + 1)));
    } else {
      // Fallback if resource definitions are not loaded yet
      result.resource = segments[0];
      result.resourcePath = segments[0];

      Object.assign(result, parseResourceActionSegments(segments.slice(1)));
    }

    return result;
  });

  return {
    get resource() { return parsed.resource; },
    get resourcePath() { return parsed.resourcePath; },
    get action() { return parsed.action; },
    get id() { return parsed.id; },
    get params() { return parsed.params; },
    get parentParams() { return parsed.parentParams; },
  };
}
