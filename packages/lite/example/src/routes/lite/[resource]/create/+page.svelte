<script lang="ts">
  import { LiteAlert, LiteCreatePage } from '@svadmin/lite';
  import type { PageProps } from './$types';
  import { definedOptions } from '@svadmin/core/options';

  let { data, form }: PageProps = $props();
</script>

{#if form?.error}
  <LiteAlert type="error" message={form.error} />
{/if}
<LiteCreatePage
  resource={data.resource}
  {...definedOptions({ errors: form?.errors, values: form?.values })}
  basePath="/lite"
/>
