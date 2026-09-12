<script lang="ts">
  import { LiteEditPage } from '@svadmin/lite';
  import type { PageProps } from './$types';
  import { definedOptions } from '@svadmin/core/options';

  let { data, form }: PageProps = $props();
</script>

<LiteEditPage
  resource={data.resource}
  record={data.record}
  {...definedOptions({ errors: form?.errors })}
  basePath="/lite"
/>
