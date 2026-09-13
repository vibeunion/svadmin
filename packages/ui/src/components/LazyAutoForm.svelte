<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import type AutoForm from './AutoForm.svelte';

  export type LazyAutoFormProps = ComponentProps<typeof AutoForm>;
  export const loadAutoForm = () => import('./AutoForm.svelte');
</script>

<script lang="ts">
  import LazyPage from './LazyPage.svelte';

  let props: LazyAutoFormProps = $props();
</script>

<LazyPage loader={loadAutoForm} props={props as unknown as Record<string, unknown>} />
