<script lang="ts">
  import { useImport, useList, useResourceContract, useLogin, useLogout, useIsAuthenticated, type UseImportOptions, type ContractSchemas } from '@svadmin/core';
  import { untrack } from 'svelte';
  import { definedReactiveOptions } from '@svadmin/core/options';
  import type { ImportState, ImportAuthActions } from './import-contract.test.types';

  let { resource, settings, queryEnabled, onReady, onAuthReady }: {
    resource: string;
    settings: Omit<UseImportOptions<ContractSchemas>, 'resource'>;
    queryEnabled: boolean;
    onReady: (state: ImportState) => void;
    onAuthReady: ((actions: ImportAuthActions) => void) | undefined;
  } = $props();
  const withAuth = untrack(() => onAuthReady !== undefined);
  if (withAuth) {
    const actions: ImportAuthActions = {
      login: useLogin({ successNotification: false, errorNotification: false }),
      logout: useLogout(), check: useIsAuthenticated(),
    };
    $effect(() => onAuthReady?.(actions));
  }
  const binding = useResourceContract(() => resource);
  const importer = useImport(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return settings.dataProviderName; },
    get meta() { return settings.meta; },
    get enabled() { return settings.enabled; },
    get format() { return settings.format; },
    get batchSize() { return settings.batchSize; },
    get mapData() { return settings.mapData; },
    get onProgress() { return settings.onProgress; },
    get onFinish() { return settings.onFinish; },
  }));
  const list = useList(() => ({ resource: binding.resource, queryOptions: { enabled: queryEnabled } }));
  $effect(() => onReady({ importer, list }));
</script>
