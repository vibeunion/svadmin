<script lang="ts">
  import { useDelete, useList, useOne, useResourceContract, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import type { DeleteState, DeleteAuthActions } from './delete-contract.test.types';
  let { resource, id, undoable, undoableTimeout, enabled, onReady, onAuthReady }: {
    resource: string;
    id: string | number;
    undoable: boolean;
    undoableTimeout: number;
    enabled: boolean;
    onReady: (state: DeleteState) => void;
    onAuthReady: ((actions: DeleteAuthActions) => void) | undefined;
  } = $props();
  const withAuth = untrack(() => onAuthReady !== undefined);
  if (withAuth) {
    const actions: DeleteAuthActions = {
      login: useLogin({ successNotification: false, errorNotification: false }),
      logout: useLogout(), check: useIsAuthenticated(),
    };
    $effect(() => onAuthReady?.(actions));
  }
  const binding = useResourceContract(() => resource);
  const remove = useDelete(definedReactiveOptions({
    get resource() { return binding.resource; },
    get id() { return id; },
    get undoable() { return undoable; },
    get undoableTimeout() { return undoableTimeout; },
    get enabled() { return enabled; },
  }));
  const list = useList(() => ({ resource: binding.resource, queryOptions: { enabled } }));
  const one = useOne(() => ({ resource: binding.resource, id, queryOptions: { enabled } }));
  $effect(() => onReady({ remove, list, one }));
</script>
