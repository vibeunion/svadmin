<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type AttachmentInfoProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    showMediaType?: boolean;
    class?: string;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { getAttachmentLabel } from './attachments.js';
  import { useAttachmentContext } from './context.svelte.js';

  let { showMediaType = false, class: className = '', children, ...rest }: AttachmentInfoProps = $props();
  const context = useAttachmentContext();
  const label = $derived(getAttachmentLabel(context.data));
</script>

{#if context.variant !== 'grid'}
  <div {...rest} class={cn('svadmin-ai-attachment-info', className)} data-slot="attachment-info">
    {#if children}
      {@render children()}
    {:else}
      <span title={label}>{label}</span>
      {#if showMediaType && context.data.mediaType}<small title={context.data.mediaType}>{context.data.mediaType}</small>{/if}
    {/if}
  </div>
{/if}

<style>
  .svadmin-ai-attachment-info { display: grid; min-width: 0; flex: 1; gap: .125rem; }
  .svadmin-ai-attachment-info span, .svadmin-ai-attachment-info small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-attachment-info small { color: var(--muted-foreground, currentColor); font-size: .75rem; }
</style>
