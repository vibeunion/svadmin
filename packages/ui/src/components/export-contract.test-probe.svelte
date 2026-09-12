<script lang="ts">
  import { useExport, useResourceContract, type UseExportOptions, type ContractSchemas } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';

  let { resource, settings, onReady }: {
    resource: string;
    settings: Omit<UseExportOptions<ContractSchemas>, 'resource'>;
    onReady: (value: ReturnType<typeof useExport>) => void;
  } = $props();
  const binding = useResourceContract(() => resource);
  const exporter = useExport(definedReactiveOptions({
    get resource() { return binding.resource; },
    get dataProviderName() { return settings.dataProviderName ?? binding.dataProviderName; },
    get meta() { return settings.meta ?? binding.meta; },
    get filters() { return settings.filters; },
    get sorters() { return settings.sorters; },
    get pageSize() { return settings.pageSize; },
    get maxItemCount() { return settings.maxItemCount; },
    get format() { return settings.format; },
    get download() { return settings.download; },
    get mapData() { return settings.mapData; },
    get onError() { return settings.onError; },
  }));
  $effect(() => onReady(exporter));
</script>
