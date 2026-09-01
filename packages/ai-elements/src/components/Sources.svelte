<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { ChatSource } from '../contracts.js';
  import { cn, safeResourceUrl } from '../utils.js';
  import { provideSourcesContext } from './sources/context.svelte.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'title'> & {
    sources?: ChatSource[];
    open?: boolean;
    title?: string;
    class?: string;
    children?: Snippet;
    onOpenChange?: (open: boolean) => void;
  };

  let { sources = [], open = $bindable(false), title = 'Sources', class: className = '', children, onOpenChange, ...rest }: Props = $props();

  function setOpen(nextOpen: boolean): void {
    open = nextOpen;
    onOpenChange?.(nextOpen);
  }

  provideSourcesContext({
    get sources() { return sources; },
    get open() { return open; },
    setOpen,
  });
</script>

{#if children || sources.length > 0}
  <div {...rest} class={cn('svadmin-ai svadmin-ai__surface my-2 text-sm', className)} data-slot="sources">
    {#if children}
      {@render children()}
    {:else}
      <button type="button" class="svadmin-ai-sources__trigger" aria-expanded={open} onclick={() => setOpen(!open)}>{title} <span class="svadmin-ai__muted text-xs">({sources.length})</span></button>
      {#if open}<ul class="space-y-2 border-t border-border/70 p-3">{#each sources as source, index (source.id ?? source.url ?? `${source.title}-${index}`)}{@const href = safeResourceUrl(source.url)}<li>{#if href}<a class="text-primary underline-offset-4 hover:underline" {href} target="_blank" rel="external noreferrer">{source.title}</a>{:else}<span class="font-medium">{source.title}</span>{/if}{#if source.description}<p class="svadmin-ai__muted text-xs">{source.description}</p>{/if}{#if source.quote}<blockquote class="mt-1 border-l-2 border-border pl-2 text-xs svadmin-ai__muted">{source.quote}</blockquote>{/if}</li>{/each}</ul>{/if}
    {/if}
  </div>
{/if}

<style>
  .svadmin-ai-sources__trigger { display: flex; width: 100%; align-items: center; gap: 0.25rem; border: 0; padding: 0.5rem 0.75rem; background: transparent; color: inherit; text-align: left; font: inherit; font-weight: 600; cursor: pointer; }
  .svadmin-ai-sources__trigger:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
