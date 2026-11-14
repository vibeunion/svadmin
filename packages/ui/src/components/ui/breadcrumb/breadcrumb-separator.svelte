<script lang="ts">
  import { cn } from '../../../utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLLiAttributes } from 'svelte/elements';
  import { ChevronRight } from '@lucide/svelte';

  let {
    class: className,
    children,
    separator = 'slash',
    ...restProps
  }: HTMLLiAttributes & { children?: Snippet; separator?: 'slash' | 'arrow' } = $props();
</script>

<li
  role="presentation"
  aria-hidden="true"
  data-slot="breadcrumb-separator"
  data-separator={separator}
  class={cn("svadmin-breadcrumb-separator", className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else if separator === 'arrow'}
    <ChevronRight class="svadmin-breadcrumb-icon" />
  {:else}
    <span class="svadmin-breadcrumb-slash">/</span>
  {/if}
</li>
