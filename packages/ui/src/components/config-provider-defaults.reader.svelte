<script lang="ts">
  import { useComponentConfig } from './ConfigProvider.svelte';

  const config = useComponentConfig();
  const pageSize = $derived(config.pagination.pageSize);
</script>

<p data-testid="page-size">{pageSize ?? 'unset'}</p>
