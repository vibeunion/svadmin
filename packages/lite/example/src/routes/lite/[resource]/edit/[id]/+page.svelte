<script lang="ts">
  import { LiteAlert, LiteEditPage } from '@svadmin/lite';
  import type { PageProps } from './$types';
  import { definedOptions } from '@svadmin/core/options';

  let { data, form }: PageProps = $props();
</script>

{#if form?.error}
  <LiteAlert type="error" message={form.error} />
{/if}
<LiteEditPage
  resource={data.resource}
  record={{ ...data.record, ...form?.values, [data.resource.primaryKey ?? 'id']: data.record[data.resource.primaryKey ?? 'id'] }}
  {...definedOptions({ errors: form?.errors })}
  basePath="/lite"
/>
