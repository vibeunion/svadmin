import { parseQueryKey } from '@svadmin/core';
import {
  installDevtoolsPageBridge,
  type DevtoolsPageBridge,
} from '@vibeunion/devtools-devframe';
import { DEV } from 'esm-env';
import type {
  DevtoolsCacheActionRequest,
  DevtoolsCacheActionResult,
  DevtoolsQueryDiagnostic,
  SvadminDevtoolsSnapshot,
} from '@svadmin/devtools-contract';

export type {
  DevtoolsCacheDiagnostics,
  DevtoolsProviderDiagnostic,
  DevtoolsQueryDiagnostic,
  SvadminDevtoolsSnapshot,
} from '@svadmin/devtools-contract';

export type {
  DevtoolsCacheActionRequest,
  DevtoolsCacheActionResult,
  DevtoolsCacheMutation,
} from '@svadmin/devtools-contract';

export type DevtoolsQuerySelector = Partial<Pick<DevtoolsQueryDiagnostic, 'provider' | 'resource' | 'operation'>>;

type QueryClientLike = {
  getQueryCache: () => {
    getAll: () => Array<{ queryKey: readonly unknown[]; queryHash: string }>;
    clear: () => void;
  };
  invalidateQueries: (filters: { queryKey?: readonly unknown[] }) => Promise<void>;
  cancelQueries: (filters: { queryKey?: readonly unknown[] }) => Promise<void>;
  refetchQueries: (filters: { queryKey?: readonly unknown[] }) => Promise<void>;
  removeQueries: (filters: { queryKey?: readonly unknown[] }) => void;
  resetQueries: (filters: { queryKey?: readonly unknown[] }) => Promise<void>;
  getMutationCache: () => { clear: () => void; getAll?: () => readonly unknown[] };
};

/**
 * Page-script protocol as seen by a panel. It mirrors the shared DevTools wire
 * (`getSnapshot` + `cacheAction`); the shared bridge installs the same shape on
 * `window.__VIBEUNION_DEVTOOLS__`.
 */
export type SvadminDevframeProtocol = {
  functions: {
    pageScript: {
      getSnapshot: () => SvadminDevtoolsSnapshot | null;
      cacheAction: (request: DevtoolsCacheActionRequest) => Promise<DevtoolsCacheActionResult>;
    };
  };
};

const listeners = new Set<(snapshot: SvadminDevtoolsSnapshot) => void>();
let snapshot: SvadminDevtoolsSnapshot | null = null;
let queryClient: QueryClientLike | null = null;

export function publishSvadminDevtoolsSnapshot(next: SvadminDevtoolsSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener(next);
}

export function getSvadminDevtoolsSnapshot(): SvadminDevtoolsSnapshot | null {
  return snapshot;
}

export function subscribeSvadminDevtools(
  listener: (next: SvadminDevtoolsSnapshot) => void,
): () => void {
  listeners.add(listener);
  if (snapshot) listener(snapshot);
  return () => listeners.delete(listener);
}

function matchesSelector(query: { queryKey: readonly unknown[] }, selector?: DevtoolsQuerySelector): boolean {
  if (!selector || Object.keys(selector).length === 0) return true;
  const descriptor = parseQueryKey(query.queryKey);
  if (!descriptor) return false;
  const operation = `${descriptor.kind}:${descriptor.action ?? 'call'}`;
  return (selector.provider === undefined || selector.provider === descriptor.provider)
    && (selector.resource === undefined || selector.resource === descriptor.resource)
    && (selector.operation === undefined || selector.operation === operation);
}

function matchingQueryKeys(selector?: DevtoolsQuerySelector): (readonly unknown[])[] {
  return (queryClient?.getQueryCache().getAll() ?? [])
    .filter((query) => matchesSelector(query, selector))
    .map((query) => query.queryKey);
}

function withMatchingQueries(
  operation: (queryKey: readonly unknown[]) => Promise<void> | void,
  selector?: DevtoolsQuerySelector,
): Promise<void> {
  return Promise.all(matchingQueryKeys(selector).map((queryKey) => operation(queryKey))).then(() => undefined);
}

export function attachSvadminDevtoolsQueryClient(client: QueryClientLike): void {
  queryClient = client;
}

export function createSvadminDevtoolsCacheActions() {
  return {
    cancel: (selector?: DevtoolsQuerySelector) => withMatchingQueries(
      (queryKey) => queryClient?.cancelQueries({ queryKey }),
      selector,
    ),
    invalidate: (selector?: DevtoolsQuerySelector) => withMatchingQueries(
      (queryKey) => queryClient?.invalidateQueries({ queryKey }),
      selector,
    ),
    refetch: (selector?: DevtoolsQuerySelector) => withMatchingQueries(
      (queryKey) => queryClient?.refetchQueries({ queryKey }),
      selector,
    ),
    remove: (selector?: DevtoolsQuerySelector) => {
      for (const queryKey of matchingQueryKeys(selector)) queryClient?.removeQueries({ queryKey });
    },
    reset: (selector?: DevtoolsQuerySelector) => withMatchingQueries(
      (queryKey) => queryClient?.resetQueries({ queryKey }),
      selector,
    ),
    clear: () => {
      queryClient?.getQueryCache().clear();
    },
    clearMutations: () => queryClient?.getMutationCache().clear(),
  };
}

/**
 * Executes a shared-protocol cache action against the attached query client and
 * reports how many entries matched. Only the operations svadmin implements are
 * accepted; mutation-variant operations the panel never advertises throw.
 */
export async function runSvadminDevtoolsCacheAction(
  request: DevtoolsCacheActionRequest,
): Promise<DevtoolsCacheActionResult> {
  const { action, selector } = request;
  const actions = createSvadminDevtoolsCacheActions();
  let matched: number;
  switch (action) {
    case 'cancel':
      matched = matchingQueryKeys(selector).length;
      await actions.cancel(selector);
      break;
    case 'invalidate':
      matched = matchingQueryKeys(selector).length;
      await actions.invalidate(selector);
      break;
    case 'refetch':
      matched = matchingQueryKeys(selector).length;
      await actions.refetch(selector);
      break;
    case 'remove':
      matched = matchingQueryKeys(selector).length;
      actions.remove(selector);
      break;
    case 'reset':
      matched = matchingQueryKeys(selector).length;
      await actions.reset(selector);
      break;
    case 'clear':
      matched = matchingQueryKeys().length;
      actions.clear();
      break;
    case 'clearMutations':
      matched = queryClient?.getMutationCache().getAll?.().length ?? 0;
      actions.clearMutations();
      break;
    default:
      throw new Error(`Unsupported svadmin cache action: ${String(action)}`);
  }
  return { action, matched, changed: matched };
}

export function installSvadminDevtoolsBridge(): DevtoolsPageBridge | null {
  return installDevtoolsPageBridge({
    development: DEV,
    getSnapshot: getSvadminDevtoolsSnapshot,
    cacheAction: runSvadminDevtoolsCacheAction,
  });
}