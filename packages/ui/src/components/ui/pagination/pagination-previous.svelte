<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { ChevronLeft } from '@lucide/svelte';

  let { class: className, children, ...restProps }: HTMLButtonAttributes & { children?: Snippet } = $props();
</script>

<button
  type="button"
  aria-label="Go to previous page"
  data-slot="pagination-previous"
  class={cn('svadmin-pagination-item svadmin-pagination-control', className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    <ChevronLeft class="svadmin-pagination-icon" />
  {/if}
</button>
