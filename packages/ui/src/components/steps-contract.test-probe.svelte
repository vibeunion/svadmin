<script lang="ts">
  import { useStepsForm, useList, useResourceContract, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import type { StepDefinition, StepSettings, StepState, StepAuthActions } from './steps-contract.test.types';

  let { resource, action, id, steps, settings, onReady, onAuthReady }: {
    resource: string;
    action: 'create' | 'edit';
    id: string | number | undefined;
    steps: StepDefinition[];
    settings: StepSettings;
    onReady: (value: StepState) => void;
    onAuthReady: ((actions: StepAuthActions) => void) | undefined;
  } = $props();
  const withAuth = untrack(() => onAuthReady !== undefined);
  if (withAuth) {
    const actions: StepAuthActions = {
      login: useLogin({ successNotification: false, errorNotification: false }),
      logout: useLogout(), check: useIsAuthenticated(),
    };
    $effect(() => onAuthReady?.(actions));
  }
  const binding = useResourceContract(() => resource);
  const form = useStepsForm(definedReactiveOptions({
    get resource() { return binding.resource; },
    get action() { return action; },
    get id() { return id; },
    get steps() { return steps.map(step => ({ fields: step.fields })); },
    get defaultValues() { return settings.defaultValues; },
    get defaultStep() { return settings.defaultStep; },
    get isBackValidate() { return settings.isBackValidate; },
    get enabled() { return settings.enabled; },
    get meta() { return settings.meta; },
    get dataProviderName() { return settings.dataProviderName; },
    get redirect() { return settings.redirect ?? false; },
    get validate() { return settings.validate; },
    get onMutationSuccess() { return settings.onMutationSuccess; },
    get onMutationError() { return settings.onMutationError; },
  }));
  const list = useList(() => ({ resource: binding.resource }));
  $effect(() => onReady({ form, list }));
</script>
