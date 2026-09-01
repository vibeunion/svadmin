<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  export type SourceProps = Omit<HTMLAnchorAttributes, 'children' | 'class' | 'href' | 'title'> & {
    href?: string;
    title?: string;
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { BookOpen } from '@lucide/svelte';
  import { cn, safeResourceUrl } from '../../utils.js';

  let { href, title = 'Source', class: className = '', children, ...rest }: SourceProps = $props();
  const safeHref = $derived(safeResourceUrl(href));
</script>

{#if safeHref}
  <a {...rest} class={cn('svadmin-ai-source', className)} data-slot="source" href={safeHref} rel="external noreferrer" target="_blank">
    {#if children}{@render children()}{:else}<BookOpen size={16} aria-hidden="true" /><span>{title}</span>{/if}
  </a>
{:else}
  <span class={cn('svadmin-ai-source', className)} data-slot="source" aria-label={title}>
    {#if children}{@render children()}{:else}<BookOpen size={16} aria-hidden="true" /><span>{title}</span>{/if}
  </span>
{/if}

<style>
  .svadmin-ai-source { display: flex; align-items: center; gap: 0.5rem; color: var(--primary, currentColor); font-size: 0.75rem; font-weight: 500; text-decoration: none; }
  a.svadmin-ai-source:hover { text-decoration: underline; text-underline-offset: 0.2rem; }
  a.svadmin-ai-source:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
