<script lang="ts">
  import { useInfiniteList, useResourceContract, type Filter } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { useLogin, useLogout } from '../../../core/src/auth-hooks.svelte';
  import { extendReactiveMembers } from '../../../core/src/reactive-projection';
  import type { NotificationConfig } from '../../../core/src/hook-utils.svelte';
  import type { InfiniteState } from './infinite-contract.test.types';

  let { resource, pageSize, filters, onReady, enabled, successNotification, errorNotification }: {
    resource: string;
    pageSize: number;
    filters: Filter[];
    onReady: (value: InfiniteState) => void;
    enabled: boolean;
    successNotification: NotificationConfig;
    errorNotification: NotificationConfig;
  } = $props();
  const binding = useResourceContract(() => resource);
  const result = useInfiniteList(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return binding.dataProviderName; },
    get meta() { return binding.meta; },
    get pagination() { return { pageSize }; },
    get filters() { return filters; },
    get queryOptions() { return { enabled }; },
    get successNotification() { return successNotification; },
    get errorNotification() { return errorNotification; },
  }));
  const login = useLogin({ successNotification: false, errorNotification: false });
  const logout = useLogout();
  const state = extendReactiveMembers(result, { login, logout });
  $effect(() => onReady(state));
</script>
