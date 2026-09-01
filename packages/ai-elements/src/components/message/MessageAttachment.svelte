<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export interface MessageAttachmentData {
    id: string;
    filename?: string;
    name?: string;
    mediaType?: string;
    url?: string;
  }

  export interface MessageAttachmentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> {
    data: MessageAttachmentData;
    class?: string;
    onRemove?: () => void;
    children?: Snippet;
  }
</script>

<script lang="ts">
  import { Paperclip, X } from '@lucide/svelte';
  import { cn, safeResourceUrl } from '../../utils.js';
  import MessageAttachmentPreview from './MessageAttachmentPreview.svelte';

  let { data, class: className = '', onRemove, children, ...rest }: MessageAttachmentProps = $props();
  const filename = $derived(data.filename ?? data.name ?? '');
  const isImage = $derived(Boolean(data.url && data.mediaType?.startsWith('image/')));
  const safeUrl = $derived(safeResourceUrl(data.url));

  function remove(event: MouseEvent): void {
    event.stopPropagation();
    onRemove?.();
  }
</script>

<div {...rest} class={cn('svadmin-ai-message-attachment', className)} data-slot="message-attachment" data-media={isImage ? 'image' : 'file'}>
  {#if children}
    {@render children()}
  {:else if isImage && safeUrl}
    <MessageAttachmentPreview {data} />
  {:else}
    <div class="svadmin-ai-message-attachment__file" title={filename || 'Attachment'}>
      <Paperclip size={16} aria-hidden="true" />
      <span>{filename || 'Attachment'}</span>
    </div>
  {/if}
  {#if onRemove}
    <button class="svadmin-ai-message-attachment__remove" type="button" aria-label="Remove attachment" title="Remove attachment" onclick={remove}>
      <X size={13} aria-hidden="true" />
    </button>
  {/if}
</div>

<style>
  .svadmin-ai-message-attachment { position: relative; width: 6rem; height: 6rem; overflow: hidden; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-message-attachment[data-media='file'] { display: flex; width: auto; min-width: 8rem; max-width: min(18rem, 100%); height: 2.25rem; align-items: center; padding: .35rem .6rem; background: var(--card, transparent); }
  .svadmin-ai-message-attachment__file { display: flex; min-width: 0; align-items: center; gap: .45rem; color: var(--muted-foreground, currentColor); font-size: .78rem; }
  .svadmin-ai-message-attachment__file span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-message-attachment__remove { position: absolute; top: .35rem; right: .35rem; display: inline-flex; width: 1.5rem; height: 1.5rem; align-items: center; justify-content: center; border: 1px solid var(--border, currentColor); border-radius: 999px; background: color-mix(in oklch, var(--background, transparent) 86%, transparent); color: var(--muted-foreground, currentColor); cursor: pointer; opacity: 0; }
  .svadmin-ai-message-attachment:hover .svadmin-ai-message-attachment__remove, .svadmin-ai-message-attachment__remove:focus-visible { opacity: 1; }
  .svadmin-ai-message-attachment__remove:hover { color: var(--destructive, currentColor); }
  .svadmin-ai-message-attachment__remove:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
