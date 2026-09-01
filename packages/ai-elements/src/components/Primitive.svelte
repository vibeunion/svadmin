<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { SvelteHTMLElements } from 'svelte/elements';
  import { cn } from '../utils.js';

  type Props = {
    tag?: Extract<keyof SvelteHTMLElements, string>;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  };

  let { tag = 'div', class: className = '', children, ...rest }: Props = $props();
</script>

<svelte:element this={tag} class={cn('svadmin-ai', className)} {...rest}>
  {@render children?.()}
</svelte:element>
