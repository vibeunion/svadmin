<script lang="ts">
  import { useUpdateMany, useList, useResourceContract, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import type { UpdateManyState, UpdateManyAuthActions } from './update-many-contract.test.types';
  let { resource, enabled, onReady, onAuthReady }: {
    resource: string;
    enabled: boolean;
    onReady: (state: UpdateManyState) => void;
    onAuthReady: ((actions: UpdateManyAuthActions) => void) | undefined;
  } = $props();
  const withAuth = untrack(() => onAuthReady !== undefined);
  if (withAuth) {
    const actions: UpdateManyAuthActions = {
      login: useLogin({ successNotification: false, errorNotification: false }),
      logout: useLogout(), check: useIsAuthenticated(),
    };
    $effect(() => onAuthReady?.(actions));
  }
  const binding = useResourceContract(() => resource);
  const update = useUpdateMany(definedReactiveOptions({
    get resource() { return binding.resource; },
    get enabled() { return enabled; },
  }));
  const list = useList(() => ({ resource: binding.resource }));
  $effect(() => onReady({ update, list }));
</script>
