<script lang="ts">
  import LazyPage from '@svadmin/ui/components/LazyPage.svelte';
  const loader = () => import('../office/OfficeWorkspace.svelte');
</script>

<LazyPage {loader} props={{}} />
