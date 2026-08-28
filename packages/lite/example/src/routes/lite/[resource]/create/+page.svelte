<script lang="ts">
  import { LiteCreatePage } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<LiteCreatePage
  resource={data.resource}
  errors={form?.errors}
  values={form?.values}
  basePath="/lite"
/>
