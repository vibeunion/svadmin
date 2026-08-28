<script lang="ts">
  import { LiteListPage } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<LiteListPage {...data} basePath="/lite" />
