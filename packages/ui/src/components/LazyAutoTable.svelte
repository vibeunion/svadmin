<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import type AutoTable from './AutoTable.svelte';

  export type LazyAutoTableProps = ComponentProps<typeof AutoTable>;
  export const loadAutoTable = () => import('./AutoTable.svelte');
</script>

<script lang="ts">
  import LazyPage from './LazyPage.svelte';

  let props: LazyAutoTableProps = $props();
</script>

<LazyPage loader={loadAutoTable} props={props as unknown as Record<string, unknown>} />
