<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLLiAttributes } from 'svelte/elements';
  import { ChevronRight } from '@lucide/svelte';

  let { class: className, children, ...restProps }: HTMLLiAttributes & { children?: Snippet } = $props();
</script>

<li
  role="presentation"
  aria-hidden="true"
  data-slot="breadcrumb-separator"
  class={cn("svadmin-breadcrumb-separator", className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    <ChevronRight class="svadmin-breadcrumb-icon" />
  {/if}
</li>
