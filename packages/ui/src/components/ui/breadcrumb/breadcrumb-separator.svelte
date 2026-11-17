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
  }: HTMLLiAttributes & { children?: Snippet; separator?: 'slash' | 'arrow' | string } = $props();
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
  {:else if separator === 'slash'}
    <span class="svadmin-breadcrumb-slash">/</span>
  {:else}
    <span class="svadmin-breadcrumb-custom">{separator}</span>
  {/if}
</li>
