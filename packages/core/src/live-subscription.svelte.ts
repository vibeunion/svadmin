import { untrack } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';
import { Type } from '@sinclair/typebox';
import { captureAdminContext } from './context.svelte';
import { contractKey, type ResourceContract } from './resource-contract';
import { captureQueryProvider } from './query-snapshot';
import { decodeBaseRecord } from './record-decoder';
import { invalidateOwnedQueries } from './query-invalidation';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';
import { definedOptions } from './defined-options';
import { captureLiveObserver, notifyLiveObserver, snapshotLiveEvent } from './live-transport';
import type { LiveEvent, LiveMode, LiveProvider } from './live.svelte';
import { captureAuthLiveScope } from './auth-hooks.svelte';

export interface LiveSubscriptionParams {
  resource: string;
  liveProvider?: LiveProvider;
  liveMode?: LiveMode;
  onLiveEvent?: (event: LiveEvent) => void;
  /** @internal Keeps the application-wide observer independent from the local observer. */
  onGlobalLiveEvent?: (event: LiveEvent) => void;
  liveParams?: Record<string, unknown>;
  enabled?: boolean;
  dataProviderName?: string;
  contract?: ResourceContract;
}

const configSchema = Type.Object({
  resource: Type.String({ minLength: 1 }),
  liveMode: Type.Union([Type.Literal('auto'), Type.Literal('manual'), Type.Literal('off')]),
  enabled: Type.Boolean(),
  dataProviderName: Type.Optional(Type.String({ minLength: 1 })),
  liveParams: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
}, { additionalProperties: false });

/** One subscription owns its event copies, cleanup and exact cache source. */
export function createCheckedLiveSubscription(paramsFn: () => LiveSubscriptionParams, client?: QueryClient): void {
  const context = captureAdminContext();
  const state = $derived.by(() => {
    try {
      const params = paramsFn();
      const candidate: unknown = snapshotPlainData(definedOptions({
        resource: params.resource, liveMode: params.liveMode === undefined ? 'off' : params.liveMode,
        enabled: params.enabled === undefined ? true : params.enabled,
        dataProviderName: params.dataProviderName, liveParams: params.liveParams,
      }));
      if (!checkExact(configSchema, candidate) || !candidate.enabled || candidate.liveMode === 'off') return undefined;
      const authScope = captureAuthLiveScope(context.authProvider);
      if (!authScope.available) return undefined;
      const provider = params.liveProvider;
      const subscribe = provider?.subscribe;
      if (!provider || typeof subscribe !== 'function') return undefined;
      const definition = context.resources.find(resource => resource.name === candidate.resource || resource.identifier === candidate.resource);
      const contract = params.contract ?? definition?.contract;
      const contractId = contract === undefined ? undefined : contractKey(contract);
      if (contract && contract.name !== candidate.resource) return undefined;
      const providerName = candidate.dataProviderName ?? definition?.provider?.dataProviderName ?? definition?.meta?.dataProviderName ?? 'default';
      if (typeof providerName !== 'string' || !providerName) return undefined;
      if (candidate.liveMode === 'auto' && (!client || candidate.resource === '*')) return undefined;
      const captured = candidate.liveMode === 'auto'
        ? captureQueryProvider(context, { resource: candidate.resource, dataProviderName: providerName }) : undefined;
      return {
        ...candidate, provider, subscribe, contractId, providerName, source: captured?.source, authScope,
        tenant: context.tenantCacheKey?.__svadminTenant, auth: context.authProvider, router: context.routerProvider,
        onEvent: captureLiveObserver(params.onLiveEvent), onGlobal: captureLiveObserver(params.onGlobalLiveEvent),
      };
    } catch { return undefined; }
  });
  $effect(() => {
    const observed = state;
    if (!observed) return;
    const scope = observed;
    let active = true;
    let ready = false;
    let pending: LiveEvent[] = [];
    const current = () => active && state === scope && scope.authScope.isCurrent();
    function deliver(event: LiveEvent) {
      if (!current()) return;
      const local = snapshotLiveEvent(event);
      if (!local) return;
      notifyLiveObserver(scope.onEvent, local);
      if (!current()) return;
      const global = snapshotLiveEvent(event);
      if (!global) return;
      notifyLiveObserver(scope.onGlobal, global);
      if (!current() || scope.liveMode !== 'auto' || !client || scope.source === undefined) return;
      const matcher = { provider: scope.providerName, tenant: scope.tenant, contract: scope.contractId, resource: scope.resource };
      const owner = { source: scope.source, authSession: scope.authScope.cacheKey };
      notifyLiveObserver(() => invalidateOwnedQueries({ client, matcher, owner, scopes: ['resourceAll'], current }), undefined);
    }
    const callback = (value: unknown) => untrack(() => {
      if (!current()) return;
      const event = snapshotLiveEvent(value);
      if (!event || (scope.resource !== '*' && scope.resource !== event.resource)) return;
      if (ready) deliver(event);
      else pending.push(event);
    });
    let cleanup: unknown;
    try {
      cleanup = untrack(() => scope.subscribe.call(scope.provider, {
        resource: scope.resource,
        ...definedOptions({ liveParams: scope.liveParams === undefined ? undefined : decodeBaseRecord(snapshotPlainData(scope.liveParams)) }),
        callback,
      }));
    } catch {
      active = false;
      pending = [];
      return;
    }
    if (typeof cleanup !== 'function') {
      active = false;
      pending = [];
      // A malformed asynchronous cleanup is quarantined, but still released when available.
      notifyLiveObserver(async () => {
        const late: unknown = await cleanup;
        if (typeof late === 'function') await late();
      }, undefined);
      return;
    }
    const release = cleanup;
    ready = true;
    untrack(() => { for (const event of pending) deliver(event); });
    pending = [];
    return () => {
      active = false;
      notifyLiveObserver(() => release(), undefined);
    };
  });
}
