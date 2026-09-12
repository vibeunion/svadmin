<script lang="ts">
  import { useUpdate, useList, useOne, useResourceContract, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import type { UpdateState, UpdateAuthActions } from './update-contract.test.types';

  let { resource, id, enabled, onReady, onAuthReady }: {
    resource: string;
    id: string | number;
    enabled: boolean;
    onReady: (state: UpdateState) => void;
    onAuthReady: ((actions: UpdateAuthActions) => void) | undefined;
  } = $props();
  const withAuth = untrack(() => onAuthReady !== undefined);
  if (withAuth) {
    const actions: UpdateAuthActions = {
      login: useLogin({ successNotification: false, errorNotification: false }),
      logout: useLogout(), check: useIsAuthenticated(),
    };
    $effect(() => onAuthReady?.(actions));
  }
  const binding = useResourceContract(() => resource);
  const update = useUpdate(definedReactiveOptions({
    get resource() { return binding.resource; },
    get id() { return id; },
    get enabled() { return enabled; },
  }));
  const list = useList(() => ({ resource: binding.resource, queryOptions: { enabled } }));
  const one = useOne(() => ({ resource: binding.resource, id, queryOptions: { enabled } }));
  $effect(() => onReady({ update, list, one }));
</script>
