<script lang="ts">
  import { useDeleteMany, useList, useResourceContract, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import type { DeleteManyState, DeleteManyAuthActions } from './delete-many-contract.test.types';
  let { resource, enabled, onReady, onAuthReady }: {
    resource: string;
    enabled: boolean;
    onReady: (state: DeleteManyState) => void;
    onAuthReady: ((actions: DeleteManyAuthActions) => void) | undefined;
  } = $props();
  const withAuth = untrack(() => onAuthReady !== undefined);
  if (withAuth) {
    const actions: DeleteManyAuthActions = {
      login: useLogin({ successNotification: false, errorNotification: false }),
      logout: useLogout(), check: useIsAuthenticated(),
    };
    $effect(() => onAuthReady?.(actions));
  }
  const binding = useResourceContract(() => resource);
  const remove = useDeleteMany(definedReactiveOptions({
    get resource() { return binding.resource; },
    get enabled() { return enabled; },
  }));
  const list = useList(() => ({ resource: binding.resource }));
  $effect(() => onReady({ remove, list }));
</script>
