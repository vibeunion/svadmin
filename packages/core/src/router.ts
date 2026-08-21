// Router — path matching + navigation (supports hash & history via RouterProvider)

import type { RouterProvider } from './router-provider';

let _syncGlobalPath: () => void = () => {};
export function registerRouterSync(fn: () => void) {
  _syncGlobalPath = fn;
}
interface RouteMatch {
  route: string;
  params: Record<string, string>;
}

export type RouteGuard = (to: string, from: string) => boolean | Promise<boolean>;

let _routerProvider: RouterProvider | undefined;
let _beforeGuards: RouteGuard[] = [];
let _afterGuards: ((to: string, from: string) => void)[] = [];

export function setActiveRouterProvider(provider: RouterProvider | undefined) {
  _routerProvider = provider;
}

export function beforeEach(guard: RouteGuard): () => void {
  _beforeGuards.push(guard);
  return () => { _beforeGuards = _beforeGuards.filter(g => g !== guard); };
}

export function afterEach(guard: (to: string, from: string) => void): () => void {
  _afterGuards.push(guard);
  return () => { _afterGuards = _afterGuards.filter(g => g !== guard); };
}

// Parse route pattern like /products/edit/:id into regex
function compileRoute(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const regexStr = pattern
    .replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    })
    .replace(/\//g, '\\/');
  return { regex: new RegExp(`^${regexStr}$`), keys };
}

/**
 * Match a pathname against a list of route patterns.
 * Accepts both hash paths (#/foo) and plain paths (/foo).
 */
export function matchRoute(
  pathname: string,
  routes: string[]
): RouteMatch | null {
  const path = pathname.replace(/^#/, '').split('?')[0] || '/';

  for (const pattern of routes) {
    const { regex, keys } = compileRoute(pattern);
    const match = path.match(regex);
    if (match) {
      const params: Record<string, string> = {};
      keys.forEach((key, i) => {
        params[key] = match[i + 1];
      });
      return { route: pattern, params };
    }
  }
  return null;
}

/**
 * Navigate with an explicit tree-scoped provider while preserving the same
 * guards, path synchronization, and after hooks as the legacy active router.
 */
export async function navigateWithProvider(
  provider: RouterProvider | undefined,
  path: string,
  options?: { replaceState?: boolean },
): Promise<void> {
  const from = currentPathWithProvider(provider);
  for (const guard of _beforeGuards) {
    const allowed = await guard(path, from);
    if (!allowed) return;
  }
  if (provider) {
    const navigated = await provider.go({ to: path, type: options?.replaceState ? 'replace' : 'push' });
    if (navigated === false) return;
  } else if (typeof window !== 'undefined') {
    window.location.hash = '#' + path.replace(/^#/, '');
  }
  _syncGlobalPath();
  for (const guard of _afterGuards) {
    guard(path, from);
  }
}

export async function navigate(path: string, options?: { replaceState?: boolean }): Promise<void> {
  await navigateWithProvider(_routerProvider, path, options);
}

/**
 * Format a path into an href suitable for <a> tags.
 */
export function formatLink(path: string): string {
  return formatLinkWithProvider(_routerProvider, path);
}

export function formatLinkWithProvider(provider: RouterProvider | undefined, path: string): string {
  if (provider?.formatLink) {
    return provider.formatLink(path);
  }
  return '#' + path.replace(/^#/, '');
}

export function currentPath(): string {
  return currentPathWithProvider(_routerProvider);
}

export function currentPathWithProvider(provider: RouterProvider | undefined): string {
  if (provider) {
    const parsed = provider.parse();
    const pathname = parsed.pathname || '/';
    let qs = '';
    if (parsed.params && Object.keys(parsed.params).length > 0) {
      qs = '?' + new URLSearchParams(parsed.params).toString();
    }
    return pathname + qs;
  }
  if (typeof window === 'undefined') return '/';
  return window.location.hash.replace(/^#/, '') || '/';
}

export function resetRouter(): void {
  _routerProvider = undefined;
  _beforeGuards = [];
  _afterGuards = [];
}
