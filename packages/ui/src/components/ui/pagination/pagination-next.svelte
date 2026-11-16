<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { ChevronRight } from '@lucide/svelte';

  let { class: className, children, ...restProps }: HTMLButtonAttributes & { children?: Snippet } = $props();
</script>

<button
  type="button"
  aria-label="Go to next page"
  data-slot="pagination-next"
  class={cn('svadmin-pagination-item svadmin-pagination-control', className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    <ChevronRight class="svadmin-pagination-icon" />
  {/if}
</button>
