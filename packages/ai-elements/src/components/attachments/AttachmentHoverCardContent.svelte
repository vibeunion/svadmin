<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type AttachmentHoverCardContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & { align?: 'start' | 'center' | 'end'; class?: string; children?: Snippet };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { useAttachmentHoverCardContext } from './context.svelte.js';
  let { align = 'start', class: className = '', children, ...rest }: AttachmentHoverCardContentProps = $props();
  const context = useAttachmentHoverCardContext();
</script>

{#if context.open}
  <div
    {...rest}
    id={context.contentId}
    class={cn('svadmin-ai-attachment-hover-card-content', `svadmin-ai-attachment-hover-card-content--${align}`, className)}
    data-slot="attachment-hover-card-content"
    role="dialog"
    tabindex="-1"
    onmouseenter={context.cancelClose}
    onmouseleave={context.scheduleClose}
    onkeydown={(event) => { if (event.key === 'Escape') { event.preventDefault(); context.setOpen(false); } }}
  >
    {@render children?.()}
  </div>
{/if}

<style>
  .svadmin-ai-attachment-hover-card-content { position: absolute; z-index: 50; top: calc(100% + .375rem); min-width: 12rem; max-width: min(24rem, 90vw); padding: .5rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--popover, var(--card, var(--background, transparent))); color: var(--popover-foreground, var(--foreground, currentColor)); box-shadow: 0 .5rem 1.5rem color-mix(in oklch, var(--foreground, currentColor) 15%, transparent); }
  .svadmin-ai-attachment-hover-card-content--start { inset-inline-start: 0; }
  .svadmin-ai-attachment-hover-card-content--center { inset-inline-start: 50%; transform: translateX(-50%); }
  .svadmin-ai-attachment-hover-card-content--end { inset-inline-end: 0; }
</style>
