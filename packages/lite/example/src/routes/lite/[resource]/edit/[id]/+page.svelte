<script lang="ts">
  import { LiteEditPage } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<LiteEditPage
  resource={data.resource}
  record={data.record}
  errors={form?.errors}
  basePath="/lite"
/>
