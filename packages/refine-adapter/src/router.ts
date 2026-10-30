/**
 * Refine RouterProvider → svadmin RouterProvider.
 *
 * Refine exposes router bindings as function generators so UI packages can use
 * hooks inside `go`, `back` and `parse`. svadmin consumes plain functions, so
 * this adapter resolves the generators once per call and normalizes the result.
 */
import type { RouterProvider } from '@svadmin/core';

type RefineGoConfig = {
  to?: string;
  query?: Record<string, unknown>;
  hash?: string;
  type?: 'push' | 'replace' | 'path';
};

type RefineParsed = {
  resource?: { name?: string; identifier?: string } | string;
  action?: string;
  id?: string | number;
  params?: Record<string, unknown>;
  pathname?: string;
};

type RefineRouterSource = {
  go?: () => ((config: RefineGoConfig) => unknown);
  back?: () => (() => unknown);
  parse?: () => (() => RefineParsed);
};

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

function queryRecord(query: Record<string, string> | undefined): Record<string, unknown> | undefined {
  if (!query) return undefined;
  return Object.fromEntries(Object.entries(query).map(([key, value]) => [key, value]));
}

function resourceName(resource: RefineParsed['resource']): string | undefined {
  if (typeof resource === 'string') return resource;
  return resource?.identifier ?? resource?.name;
}

export function createRefineRouterAdapter(source: unknown): RouterProvider {
  if (!isObject(source)) {
    throw new TypeError('[svadmin] createRefineRouterAdapter: expected a Refine RouterProvider object');
  }
  const router = source as RefineRouterSource;

  return {
    go({ to, query, hash, type }) {
      if (!router.go) return false;
      const go = router.go();
      if (typeof go !== 'function') throw new TypeError('Refine RouterProvider go() must return a function');
      const normalizedType = type === 'replace' ? 'replace' : 'push';
      const queryValue = queryRecord(query);
      const result = go({
        ...(to === undefined ? {} : { to }),
        ...(queryValue === undefined ? {} : { query: queryValue }),
        ...(hash === undefined ? {} : { hash }),
        type: normalizedType,
      });
      if (typeof result === 'string') return false;
      return;
    },
    back() {
      if (!router.back) return;
      const back = router.back();
      if (typeof back !== 'function') throw new TypeError('Refine RouterProvider back() must return a function');
      back();
    },
    parse() {
      if (!router.parse) return { params: {}, pathname: '/' };
      const parse = router.parse();
      if (typeof parse !== 'function') throw new TypeError('Refine RouterProvider parse() must return a function');
      const parsed = parse();
      const params = Object.fromEntries(Object.entries(parsed.params ?? {}).map(([key, value]) => [key, String(value)]));
      const resource = resourceName(parsed.resource);
      return {
        ...(resource === undefined ? {} : { resource }),
        ...(parsed.action === undefined ? {} : { action: String(parsed.action) }),
        ...(parsed.id === undefined ? {} : { id: String(parsed.id) }),
        params,
        pathname: typeof parsed.pathname === 'string' ? parsed.pathname : '/',
      };
    },
  };
}
