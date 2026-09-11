<script lang="ts">
  import { useCreateMany, useList, useResourceContract, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import type { CreateManyState, CreateManyAuthActions } from './create-many-contract.test.types';
  let { resource, enabled, onReady, onAuthReady }: {
    resource: string;
    enabled: boolean;
    onReady: (state: CreateManyState) => void;
    onAuthReady: ((actions: CreateManyAuthActions) => void) | undefined;
  } = $props();
  const withAuth = untrack(() => onAuthReady !== undefined);
  if (withAuth) {
    const actions: CreateManyAuthActions = {
      login: useLogin({ successNotification: false, errorNotification: false }),
      logout: useLogout(), check: useIsAuthenticated(),
    };
    $effect(() => onAuthReady?.(actions));
  }
  const binding = useResourceContract(() => resource);
  const create = useCreateMany(definedReactiveOptions({
    get resource() { return binding.resource; },
    get enabled() { return enabled; },
  }));
  const list = useList(() => ({ resource: binding.resource }));
  $effect(() => onReady({ create, list }));
</script>
