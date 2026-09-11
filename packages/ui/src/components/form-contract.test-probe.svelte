<script lang="ts">
  import { useForm, useList, useResourceContract, useLogin, useLogout, useIsAuthenticated, type ContractFormAction } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import type { FormState, FormSettings, FormAuthActions } from './form-contract.test.types';

  let { resource, action, id, settings, onReady, onAuthReady }: {
    resource: string;
    action: ContractFormAction;
    id: string | number | undefined;
    settings: FormSettings;
    onReady: (value: FormState) => void;
    onAuthReady: ((actions: FormAuthActions) => void) | undefined;
  } = $props();
  const withAuth = untrack(() => onAuthReady !== undefined);
  if (withAuth) {
    const actions: FormAuthActions = {
      login: useLogin({ successNotification: false, errorNotification: false }),
      logout: useLogout(), check: useIsAuthenticated(),
    };
    $effect(() => onAuthReady?.(actions));
  }
  const binding = useResourceContract(() => resource);
  const form = useForm(definedReactiveOptions({
    get resource() { return binding.resource; },
    get action() { return action; },
    get id() { return id; },
    get defaultValues() { return settings.defaultValues; },
    get enabled() { return settings.enabled; },
    get dataProviderName() { return settings.dataProviderName; },
    get meta() { return settings.meta; },
    get redirect() { return settings.redirect ?? false; },
    get validate() { return settings.validate; },
    get onMutationSuccess() { return settings.onMutationSuccess; },
    get onMutationError() { return settings.onMutationError; },
    get warnWhenUnsavedChanges() { return settings.warnWhenUnsavedChanges; },
  }));
  const list = useList(() => ({ resource: binding.resource }));
  $effect(() => onReady({ form, list }));
</script>
