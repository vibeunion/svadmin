<script lang="ts">
  import { useLive, useSubscription, usePublish, type LiveProvider, type LiveEvent } from './live.svelte';
  import { createLiveSubscription, type LiveSubscriptionParams } from './hook-utils.svelte';
  import { useList, useOne, useMany, useInvalidate } from './strict-hooks.svelte';
  import { createInfiniteListQuery } from './hooks.svelte';
  import { parseContractRecord, type ResourceContract } from './resource-contract';
  import { definedReactiveOptions } from './defined-options';
  import { captureAdminContext } from './context.svelte';
  import { captureQueryProvider } from './query-snapshot';
  import { definedOptions } from './defined-options';
  import { untrack } from 'svelte';
  import { useLogin, useLogout, useRegister, useForgotPassword, useUpdatePassword,
    useUpdateIdentity, useUpdateProfile, useIsAuthenticated, useOnError, captureAuthLiveScope } from './auth-hooks.svelte';
  import type { LiveAuthTestActions } from './live-auth.test.types';
  import type { LiveHookTestState } from './live-hooks.test.types';

  let { mode, live, settings, contract, onReady, onAuthReady }: {
    mode: 'live' | 'subscription' | 'shared' | 'list' | 'one' | 'many' | 'infinite' | 'publish';
    live: LiveProvider;
    settings: Omit<LiveSubscriptionParams, 'liveProvider'>;
    contract: ResourceContract;
    onReady: (state: LiveHookTestState) => void;
    onAuthReady: ((actions: LiveAuthTestActions) => void) | undefined;
  } = $props();
  const context = captureAdminContext();
  // The host keys this probe by mode, so hook selection belongs to initialization.
  const selectedMode = untrack(() => mode);
  const withAuth = untrack(() => onAuthReady !== undefined);
  if (withAuth) {
    const silent = { successNotification: false, errorNotification: false } as const;
    const actions: LiveAuthTestActions = {
      login: useLogin(silent), logout: useLogout(), register: useRegister(silent),
      forgotPassword: useForgotPassword(silent), updatePassword: useUpdatePassword(silent),
      updateIdentity: useUpdateIdentity(silent), updateProfile: useUpdateProfile(silent),
      check: useIsAuthenticated(), onError: useOnError(),
    };
    $effect(() => onAuthReady?.(actions));
  }
  const options = definedReactiveOptions({
    get resource() { return settings.resource; },
    get liveProvider() { return live; },
    get liveMode() { return settings.liveMode; },
    get enabled() { return settings.enabled; },
    get onLiveEvent() { return settings.onLiveEvent; },
    get onGlobalLiveEvent() { return settings.onGlobalLiveEvent; },
    get liveParams() { return settings.liveParams; },
    get dataProviderName() { return settings.dataProviderName; },
    get contract() { return settings.contract; },
  });
  if (selectedMode === 'shared') createLiveSubscription(() => options);
  if (selectedMode === 'live') useLive(() => live, () => settings.resource, definedReactiveOptions({
    get liveMode() { return settings.enabled === false ? 'off' : settings.liveMode; },
    get onLiveEvent() { return settings.onLiveEvent; },
    get liveParams() { return settings.liveParams; },
    get dataProviderName() { return settings.dataProviderName; },
    get contract() { return settings.contract; },
  }));
  if (selectedMode === 'subscription') useSubscription(definedReactiveOptions({
    resource: () => settings.resource, liveProvider: () => live,
    get enabled() { return settings.enabled; },
    get onLiveEvent() { return settings.onLiveEvent ?? (() => {}); },
    get liveParams() { return settings.liveParams; },
  }));
  const query = definedReactiveOptions({
    get resource() { return settings.contract ?? contract; },
    get liveMode() { return settings.liveMode; },
    get liveParams() { return settings.liveParams; },
    get onLiveEvent() { return settings.onLiveEvent; },
    get dataProviderName() { return settings.dataProviderName; },
    get queryOptions() { return { enabled: settings.enabled ?? true }; },
  });
  if (selectedMode === 'list') useList(() => query);
  if (selectedMode === 'one') useOne(() => ({ ...query, id: 1 }));
  if (selectedMode === 'many') useMany(() => ({ ...query, ids: [1] }));
  if (selectedMode === 'infinite') createInfiniteListQuery(definedReactiveOptions({
    get resource() { return settings.resource; },
    get contract() { return settings.contract ?? contract; },
    get liveMode() { return settings.liveMode; },
    get onLiveEvent() { return settings.onLiveEvent; },
    get dataProviderName() { return settings.dataProviderName; },
    get queryOptions() { return { enabled: settings.enabled ?? true }; },
  }), () => value => parseContractRecord(settings.contract ?? contract, value));
  const publish = usePublish(() => live);
  const invalidate = useInvalidate(definedReactiveOptions({
    get resource() { return settings.contract ?? contract; },
    get dataProviderName() { return settings.dataProviderName; },
  }));
  $effect(() => onReady({
    publish, invalidate, authScope: () => captureAuthLiveScope(context.authProvider),
    source: () => captureQueryProvider(context, {
      resource: settings.resource, ...definedOptions({ dataProviderName: settings.dataProviderName }),
    }).source,
  }));
</script>
