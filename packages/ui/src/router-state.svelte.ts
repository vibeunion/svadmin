import { createContext } from 'svelte';
import { matchRoute } from '@svadmin/core/router';
import type { RouterProvider } from '@svadmin/core';

const ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/update-password',
  '/2fa',
  '/authentication/branded/2fa',
  '/authentication/error-404',
  '/authentication/error-500',
  '/404',
  '/500',
  '/settings',
  '/settings/:tab',
  '/',
  '/inventory-dashboard',
  '/public-profile',
  '/public-profile/projects/:columns',
  '/public-profile/activity',
  '/public-profile/teams',
  '/public-profile/profiles/:variant',
  '/account/get-started',
  '/account/home/get-started',
  '/account/home/user-profile',
  '/account/company-profile',
  '/account/home/company-profile',
  '/account/settings-plain',
  '/account/home/settings-plain',
  '/account/settings-sidebar',
  '/account/home/settings-sidebar',
  '/account/settings-enterprise',
  '/account/home/settings-enterprise',
  '/account/import-members',
  '/account/members/import-members',
  '/account/members-starter',
  '/account/members/members-starter',
  '/account/team-members',
  '/account/members/team-members',
  '/account/security-log',
  '/account/security/security-log',
  '/account/:tab',
  '/network/user-cards',
  '/network/user-cards/nft',
  '/network/team-crew',
  '/network/user-table/team-crew',
  '/:resource',
  '/:resource/create',
  '/:resource/edit/:id',
  '/:resource/show/:id',
  '/:resource/clone/:id',
  '/:resource/:id/edit',
  '/:resource/:id',
  '/:parent/:parentId/:resource',
  '/:parent/:parentId/:resource/create',
  '/:parent/:parentId/:resource/edit/:id',
  '/:parent/:parentId/:resource/show/:id',
  '/:parent/:parentId/:resource/clone/:id',
];

export interface RouterState {
  readonly route: string;
  readonly params: Record<string, string>;
  readonly path: string;
  readonly provider: RouterProvider | undefined;
  init: (provider: RouterProvider | undefined) => void;
  sync: () => void;
  destroy: () => void;
}

export function createRouterState(): RouterState {
  let route = $state('/');
  let params: Record<string, string> = $state({});
  let path = $state('/');
  let provider: RouterProvider | undefined;
  let listenersAttached = false;

  function sync() {
    let nextPath: string;
    let providerParams: Record<string, string> = {};

    if (provider) {
      const parsed = provider.parse();
      nextPath = parsed.pathname || '/';
      providerParams = parsed.params;
    } else {
      nextPath = typeof window !== 'undefined'
        ? window.location.hash.replace(/^#/, '') || '/'
        : '/';
    }

    const match = matchRoute(nextPath, ROUTES);
    route = match?.route ?? '/';
    path = nextPath;
    params = { ...providerParams, ...(match?.params ?? {}) };
  }

  function attachListeners() {
    if (listenersAttached || typeof window === 'undefined') return;
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    listenersAttached = true;
  }

  return {
    get route() { return route; },
    get params() { return params; },
    get path() { return path; },
    get provider() { return provider; },
    init(nextProvider) {
      provider = nextProvider;
      sync();
      attachListeners();
    },
    sync,
    destroy() {
      if (!listenersAttached || typeof window === 'undefined') return;
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
      listenersAttached = false;
    },
  };
}

const [getRequiredRouterState, setRouterState] = createContext<RouterState>();

/** Create and provide router state scoped to the current AdminApp tree. */
export function provideRouterState(provider: RouterProvider | undefined): RouterState {
  const state = createRouterState();
  state.init(provider);
  setRouterState(state);
  return state;
}

export function getRouterState(): RouterState | undefined {
  try {
    return getRequiredRouterState();
  } catch {
    return undefined;
  }
}

// Compatibility singleton for consumers that call initRouter outside AdminApp.
const legacyRouterState = createRouterState();

export function initRouter(provider?: RouterProvider) {
  legacyRouterState.init(provider);
}

export function getRoute(): string {
  return getRouterState()?.route ?? legacyRouterState.route;
}

export function getPath(): string {
  return getRouterState()?.path ?? legacyRouterState.path;
}

export function getParams(): Record<string, string> {
  return getRouterState()?.params ?? legacyRouterState.params;
}

export function getRouterProviderInstance(): RouterProvider | undefined {
  return getRouterState()?.provider ?? legacyRouterState.provider;
}
