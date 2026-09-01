<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type AttachmentRemoveProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick'> & {
    label?: string;
    class?: string;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
  };
</script>

<script lang="ts">
  import { X } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useAttachmentContext } from './context.svelte.js';

  let { label = 'Remove', class: className = '', children, onclick, type = 'button', ...rest }: AttachmentRemoveProps = $props();
  const context = useAttachmentContext();

  function handleClick(event: MouseEvent): void {
    event.stopPropagation();
    context.onRemove?.();
    onclick?.(event);
  }
</script>

{#if context.onRemove}
  <button
    {...rest}
    {type}
    class={cn('svadmin-ai-attachment-remove', className)}
    data-slot="attachment-remove"
    data-variant={context.variant}
    aria-label={label}
    title={label}
    onclick={handleClick}
  >
    {#if children}{@render children()}{:else}<X aria-hidden="true" />{/if}
  </button>
{/if}

<style>
  .svadmin-ai-attachment-remove { display: inline-flex; flex: none; align-items: center; justify-content: center; border: 0; border-radius: min(var(--radius, .5rem), .375rem); background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }
  .svadmin-ai-attachment-remove[data-variant='grid'] { position: absolute; top: .5rem; right: .5rem; width: 1.5rem; height: 1.5rem; background: color-mix(in oklch, var(--background, transparent) 84%, transparent); opacity: 0; }
  :global(.svadmin-ai-attachment:hover) .svadmin-ai-attachment-remove[data-variant='grid'], .svadmin-ai-attachment-remove:focus-visible { opacity: 1; }
  .svadmin-ai-attachment-remove[data-variant='inline'] { width: 1.25rem; height: 1.25rem; opacity: 0; }
  :global(.svadmin-ai-attachment:hover) .svadmin-ai-attachment-remove[data-variant='inline'], .svadmin-ai-attachment-remove:focus-visible { opacity: 1; }
  .svadmin-ai-attachment-remove[data-variant='list'] { width: 2rem; height: 2rem; }
  .svadmin-ai-attachment-remove:hover { background: var(--muted, transparent); color: var(--destructive, currentColor); }
  .svadmin-ai-attachment-remove:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-attachment-remove :global(svg) { width: .875rem; height: .875rem; }
</style>
