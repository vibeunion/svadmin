<script lang="ts">
  import { LiteShowPage } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<LiteShowPage
  resource={data.resource}
  record={data.record}
  basePath="/lite"
/>
