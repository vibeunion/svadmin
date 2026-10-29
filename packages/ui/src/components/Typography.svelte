<script lang="ts" module>
  export type TitleLevel = 1 | 2 | 3 | 4;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    level = 1,
    children,
  }: {
    level?: TitleLevel;
    children?: Snippet;
  } = $props();
</script>

<svelte:element this={`h${level}`} class="svadmin-title" data-level={level}>{@render children?.()}</svelte:element>
