<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { buttonVariants } from '../button/index.js';
  import { ChevronLeft } from '@lucide/svelte';

  let { class: className, children, ...restProps }: HTMLButtonAttributes & { children?: Snippet } = $props();
</script>

<button
  aria-label="Go to previous page"
  data-svadmin-button
  data-variant="ghost"
  data-size="icon-sm"
  data-slot="pagination-previous"
  class={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), "svadmin-pagination-control", className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    <ChevronLeft class="svadmin-pagination-icon" />
  {/if}
</button>
