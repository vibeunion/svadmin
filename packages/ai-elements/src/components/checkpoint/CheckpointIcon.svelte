<script lang="ts">
  import { Bookmark } from '@lucide/svelte';
  import type { SVGAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  type Props = Omit<SVGAttributes<SVGSVGElement>, 'color' | 'size'> & {
    class?: string; children?: Snippet; color?: string; size?: number | string;
  };
  let { class: className = '', children, size = 16, ...rest }: Props = $props();
</script>

{#if children}
  <span class={cn('svadmin-ai svadmin-ai-checkpoint-icon', className)} data-slot="checkpoint-icon">
    {@render children()}
  </span>
{:else}
  <Bookmark
    {...rest}
    {size}
    class={cn('svadmin-ai svadmin-ai-checkpoint-icon', className)}
    data-slot="checkpoint-icon"
    aria-hidden="true"
  />
{/if}

<style>
  :global(.svadmin-ai-checkpoint-icon) { display: inline-flex; flex: none; }
</style>
