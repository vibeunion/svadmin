<script lang="ts">
  import LazyPage from '@svadmin/ui/components/LazyPage.svelte';
  let { resourceName }: { resourceName: string } = $props();
  const loader = () => import('../office/OfficeWorkspace.svelte');
</script>

{#key resourceName}
  <LazyPage {loader} props={{}} />
{/key}
