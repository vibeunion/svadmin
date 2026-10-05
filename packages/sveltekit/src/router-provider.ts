import { definedOptions } from '@svadmin/core/options';
/// <reference types="@sveltejs/kit" />
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { resolve } from '$app/paths';
import type { RouterProvider } from '@svadmin/core';

function normalizeInternalPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function runtimeResolveArgs(path: string): Parameters<typeof resolve> {
  // RouterProvider receives concrete runtime paths, while SvelteKit types resolve() from app route IDs.
  return [normalizeInternalPath(path)] as unknown as Parameters<typeof resolve>;
}

/**
 * SvelteKit 3 removed the `base` export from `$app/paths`. Derive the configured
 * base from the public `resolve()` helper by resolving the app root, which is
 * returned as `${base}/` (or `/` when no base is configured).
 */
function deriveConfiguredBase(): string {
  try {
    const resolvedRoot = resolve(...runtimeResolveArgs('/'));
    const base = resolvedRoot.endsWith('/') ? resolvedRoot.slice(0, -1) : resolvedRoot;
    return base.startsWith('/') ? base : '';
  } catch {
    return '';
  }
}

function stripConfiguredBase(pathname: string): string {
  const configuredBase = deriveConfiguredBase();

  if (!configuredBase || configuredBase === '/') return pathname;
  if (pathname === configuredBase) return '/';
  if (pathname.startsWith(`${configuredBase}/`)) {
    return pathname.slice(configuredBase.length) || '/';
  }
  return pathname;
}

export function createSvelteKitRouterProvider(): RouterProvider {
  return {
    go({ to, query, hash, type = 'push' }) {
      let path = normalizeInternalPath(to);
      if (query) {
        const params = new URLSearchParams(query).toString();
        if (params) path += path.includes('?') ? `&${params}` : `?${params}`;
      }
      if (hash) {
        path += `#${hash}`;
      }
      const url = resolve(...runtimeResolveArgs(path));

      const gotoPromise = type === 'replace'
        ? goto(url, {
          replace: true,
          reset: false,
          refreshAll: false,
        })
        : goto(url);

      gotoPromise.then(() => {
        if (typeof window !== 'undefined' && typeof PopStateEvent !== 'undefined') {
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }).catch((e) => {
        console.error('[svadmin] SvelteKit navigation failed:', e);
      });
    },
    back() {
      if (typeof window !== 'undefined') {
        history.back();
      }
    },
    formatLink(path: string) {
      return resolve(...runtimeResolveArgs(path));
    },
    parse() {
      let pathname = '/';
      const params: Record<string, string> = {};

      try {
        if (page.url) {
          pathname = stripConfiguredBase(page.url.pathname);
        }
        if (page.url?.searchParams) {
          page.url.searchParams.forEach((v: string, k: string) => {
            params[k] = v;
          });
        }
      } catch {
        if (typeof window !== 'undefined') {
          pathname = window.location.pathname;
          new URLSearchParams(window.location.search).forEach((v, k) => {
            params[k] = v;
          });
        }
      }

      let p_params: Record<string, string> = {};
      try { p_params = (page.params ?? {}) as Record<string, string>; } catch { /* intentional */ }

      return definedOptions({
        resource: p_params?.['resource'],
        action: p_params?.['action'],
        id: p_params?.['id'],
        pathname,
        params
      });
    }
  };
}
