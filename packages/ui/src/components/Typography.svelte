<script lang="ts" module>
  export type TitleLevel = 1 | 2 | 3 | 4 | 5 | 6;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  let {
    level = 1,
    heading,
    bold = false,
    class: className = '',
    children,
  }: {
    level?: TitleLevel;
    heading?: TitleLevel;
    bold?: boolean;
    class?: string;
    children?: Snippet;
  } = $props();

  const effectiveLevel = $derived(heading ?? level);
</script>

<svelte:element
  this={`h${effectiveLevel}`}
  class={cn('svadmin-title', bold && 'font-bold', className)}
  data-level={effectiveLevel}
  data-heading={effectiveLevel}
>
  {@render children?.()}
</svelte:element>
