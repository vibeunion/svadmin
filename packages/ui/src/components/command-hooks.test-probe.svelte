<script lang="ts">
  import { untrack } from 'svelte';
  import { useCustom, useCustomMutation, useLogin, useLogout, useIsAuthenticated } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import { readCommand, writeCommand, type CommandSettings, type CommandState, type CommandAuthActions } from './command-hooks.test.types';

  let { settings, onReady, onAuthReady }: {
    settings: CommandSettings;
    onReady: (value: CommandState) => void;
    onAuthReady: ((actions: CommandAuthActions) => void) | undefined;
  } = $props();
  const withAuth = untrack(() => onAuthReady !== undefined);
  if (withAuth) {
    const actions: CommandAuthActions = {
      login: useLogin({ successNotification: false, errorNotification: false }),
      logout: useLogout(), check: useIsAuthenticated(),
    };
    $effect(() => onAuthReady?.(actions));
  }
  const { query } = useCustom(definedReactiveOptions({
    get command() { return settings.readCommand ?? readCommand; },
    get input() { return settings.input ?? { filter: { year: 2026 }, labels: ['current'] }; },
    get dataProviderName() { return settings.dataProviderName; },
    get queryOptions() { return { enabled: settings.enabled ?? true, staleTime: settings.staleTime ?? Infinity }; },
  }));
  const { mutation } = useCustomMutation(definedReactiveOptions({
    get command() { return settings.writeCommand ?? writeCommand; },
    get dataProviderName() { return settings.dataProviderName; },
  }));
  $effect(() => onReady({ query, mutation }));
</script>
