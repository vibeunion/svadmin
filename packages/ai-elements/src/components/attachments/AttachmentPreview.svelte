<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type AttachmentPreviewProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    fallbackIcon?: Snippet;
    class?: string;
  };
</script>

<script lang="ts">
  import { FileText, Globe, Image as ImageIcon, Music2, Paperclip, Video } from '@lucide/svelte';
  import { cn, safeResourceUrl } from '../../utils.js';
  import { getAttachmentLabel } from './attachments.js';
  import { useAttachmentContext } from './context.svelte.js';

  let { fallbackIcon, class: className = '', ...rest }: AttachmentPreviewProps = $props();
  const context = useAttachmentContext();
  const url = $derived(safeResourceUrl(context.data.url));
  const label = $derived(getAttachmentLabel(context.data));
</script>

<div {...rest} class={cn('svadmin-ai-attachment-preview', className)} data-slot="attachment-preview" data-variant={context.variant}>
  {#if context.mediaCategory === 'image' && context.data.type === 'file' && url}
    <img src={url} alt={label} width="96" height="96" />
  {:else if context.mediaCategory === 'video' && context.data.type === 'file' && url}
    <video src={url} muted aria-label={label}></video>
  {:else if fallbackIcon}
    {@render fallbackIcon()}
  {:else if context.mediaCategory === 'audio'}
    <Music2 aria-hidden="true" />
  {:else if context.mediaCategory === 'document'}
    <FileText aria-hidden="true" />
  {:else if context.mediaCategory === 'image'}
    <ImageIcon aria-hidden="true" />
  {:else if context.mediaCategory === 'source'}
    <Globe aria-hidden="true" />
  {:else if context.mediaCategory === 'video'}
    <Video aria-hidden="true" />
  {:else}
    <Paperclip aria-hidden="true" />
  {/if}
</div>

<style>
  .svadmin-ai-attachment-preview { display: flex; flex: none; align-items: center; justify-content: center; overflow: hidden; background: var(--muted, transparent); color: var(--muted-foreground, currentColor); }
  .svadmin-ai-attachment-preview[data-variant='grid'] { width: 100%; height: 100%; }
  .svadmin-ai-attachment-preview[data-variant='inline'] { width: 1.25rem; height: 1.25rem; border-radius: min(var(--radius, .5rem), .25rem); background: var(--background, transparent); }
  .svadmin-ai-attachment-preview[data-variant='list'] { width: 3rem; height: 3rem; border-radius: min(var(--radius, .5rem), .375rem); }
  .svadmin-ai-attachment-preview :global(img), .svadmin-ai-attachment-preview :global(video) { width: 100%; height: 100%; object-fit: cover; }
  .svadmin-ai-attachment-preview :global(svg) { width: 1rem; height: 1rem; }
  .svadmin-ai-attachment-preview[data-variant='inline'] :global(svg) { width: .75rem; height: .75rem; }
</style>
