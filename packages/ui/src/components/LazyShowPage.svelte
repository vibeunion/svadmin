<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import type ShowPage from './ShowPage.svelte';

  export type LazyShowPageProps = ComponentProps<typeof ShowPage>;
  export const loadShowPage = () => import('./ShowPage.svelte');
</script>

<script lang="ts">
  import LazyPage from './LazyPage.svelte';

  let props: LazyShowPageProps = $props();
</script>

<LazyPage loader={loadShowPage} props={props as unknown as Record<string, unknown>} />
