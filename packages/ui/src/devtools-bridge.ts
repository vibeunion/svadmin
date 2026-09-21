import { parseQueryKey } from '@svadmin/core';
import { createPageScriptChannel } from 'devframe/in-page-channel';
import { DEV } from 'esm-env';
import type {
  DevtoolsQueryDiagnostic,
  SvadminDevtoolsSnapshot,
} from '@svadmin/devtools-contract';

export const SVADMIN_DEVFRAME_CHANNEL = 'svadmin:devtools';
export type {
  DevtoolsCacheDiagnostics,
  DevtoolsProviderDiagnostic,
  DevtoolsQueryDiagnostic,
  SvadminDevtoolsSnapshot,
} from '@svadmin/devtools-contract';

export type SvadminDevtoolsBridge = {
  getSnapshot: () => SvadminDevtoolsSnapshot | null;
  subscribe: (listener: (snapshot: SvadminDevtoolsSnapshot) => void) => () => void;
  cache: {
    cancel: (selector?: DevtoolsQuerySelector) => Promise<void>;
    invalidate: (selector?: DevtoolsQuerySelector) => Promise<void>;
    refetch: (selector?: DevtoolsQuerySelector) => Promise<void>;
    remove: (selector?: DevtoolsQuerySelector) => void;
    reset: (selector?: DevtoolsQuerySelector) => Promise<void>;
    clear: () => void;
    clearMutations: () => void;
  };
  devframe: {
    channelName: typeof SVADMIN_DEVFRAME_CHANNEL;
  };
};

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
  getMutationCache: () => { clear: () => void };
};

export type SvadminDevframeProtocol = {
  functions: {
    pageScript: {
      getSnapshot: () => SvadminDevtoolsSnapshot | null;
      cacheCancel: (selector?: DevtoolsQuerySelector) => Promise<void>;
      cacheInvalidate: (selector?: DevtoolsQuerySelector) => Promise<void>;
      cacheRefetch: (selector?: DevtoolsQuerySelector) => Promise<void>;
      cacheRemove: (selector?: DevtoolsQuerySelector) => void;
      cacheReset: (selector?: DevtoolsQuerySelector) => Promise<void>;
      cacheClear: () => void;
      clearMutations: () => void;
    };
  };
};

const listeners = new Set<(snapshot: SvadminDevtoolsSnapshot) => void>();
let snapshot: SvadminDevtoolsSnapshot | null = null;
let queryClient: QueryClientLike | null = null;
let devframeChannel: ReturnType<typeof createPageScriptChannel<SvadminDevframeProtocol>> | null = null;

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

export function installSvadminDevtoolsBridge(): void {
  if (typeof window === 'undefined' || !DEV) return;

  if (!devframeChannel) {
    const cache = createSvadminDevtoolsCacheActions();
    devframeChannel = createPageScriptChannel<SvadminDevframeProtocol>({
      name: SVADMIN_DEVFRAME_CHANNEL,
      functions: {
        getSnapshot: { type: 'query', handler: getSvadminDevtoolsSnapshot },
        cacheCancel: { type: 'action', handler: cache.cancel },
        cacheInvalidate: { type: 'action', handler: cache.invalidate },
        cacheRefetch: { type: 'action', handler: cache.refetch },
        cacheRemove: { type: 'action', handler: cache.remove },
        cacheReset: { type: 'action', handler: cache.reset },
        cacheClear: { type: 'action', handler: cache.clear },
        clearMutations: { type: 'action', handler: cache.clearMutations },
      },
    });
  }

  const bridge: SvadminDevtoolsBridge = {
    getSnapshot: getSvadminDevtoolsSnapshot,
    subscribe: subscribeSvadminDevtools,
    cache: createSvadminDevtoolsCacheActions(),
    devframe: { channelName: SVADMIN_DEVFRAME_CHANNEL },
  };

  Object.defineProperty(window, '__SVADMIN_DEVTOOLS__', {
    configurable: true,
    enumerable: false,
    value: bridge,
    writable: false,
  });
}

declare global {
  interface Window {
    __SVADMIN_DEVTOOLS__?: SvadminDevtoolsBridge;
  }
}
