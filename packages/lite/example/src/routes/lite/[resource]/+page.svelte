<script lang="ts">
  import { LiteAlert, LiteListPage } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

{#if form?.error}
  <LiteAlert type="error" message={form.error} />
{:else if form?.success}
  <LiteAlert type="success" message="Operation completed successfully" />
{/if}
<LiteListPage {...data} basePath="/lite" />
