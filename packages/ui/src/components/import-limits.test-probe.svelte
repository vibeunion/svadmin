<script lang="ts">
  import { useImport, useResourceContract, type HttpError } from '@svadmin/core';
  import { definedReactiveOptions } from '@svadmin/core/options';

  let { resourceName, maxRows, maxBytes, onReady }: {
    resourceName: string;
    maxRows?: number;
    maxBytes?: number;
    onReady?: (driver: { handleChange(info: { file: File }): Promise<unknown>; readonly error: HttpError | null }) => void;
  } = $props();
  const binding = useResourceContract(() => resourceName);
  const importer = useImport(definedReactiveOptions({
    get resource() { return binding.resource; },
    get maxRows() { return maxRows; },
    get maxBytes() { return maxBytes; },
  }));
  $effect(() => {
    onReady?.(importer);
  });
</script>
