<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type AttachmentHoverCardTriggerProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'class'> & { class?: string; children?: Snippet };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { useAttachmentHoverCardContext } from './context.svelte.js';
  let { class: className = '', children, ...rest }: AttachmentHoverCardTriggerProps = $props();
  const context = useAttachmentHoverCardContext();
</script>

<span
  {...rest}
  class={cn('svadmin-ai-attachment-hover-card-trigger', className)}
  data-slot="attachment-hover-card-trigger"
  role="button"
  tabindex="0"
  aria-controls={context.contentId}
  aria-expanded={context.open}
  onmouseenter={context.scheduleOpen}
  onmouseleave={context.scheduleClose}
  onfocus={context.scheduleOpen}
  onblur={context.scheduleClose}
  onclick={() => context.setOpen(!context.open)}
  onkeydown={(event) => {
    if (event.key === 'Escape') context.setOpen(false);
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); context.setOpen(!context.open); }
  }}
>
  {@render children?.()}
</span>

<style>
  .svadmin-ai-attachment-hover-card-trigger { display: inline-flex; }
  .svadmin-ai-attachment-hover-card-trigger:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
