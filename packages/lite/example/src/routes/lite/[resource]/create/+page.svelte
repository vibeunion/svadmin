<script lang="ts">
  import { LiteCreatePage } from '@svadmin/lite';
  import type { PageProps } from './$types';
  import { definedOptions } from '@svadmin/core/options';

  let { data, form }: PageProps = $props();
</script>

<LiteCreatePage
  resource={data.resource}
  {...definedOptions({ errors: form?.errors, values: form?.values })}
  basePath="/lite"
/>
