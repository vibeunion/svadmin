<script module lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { PromptInputFile } from './context.svelte.js';
  export interface PromptInputAttachmentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'class'> {
    data: PromptInputFile;
    class?: string;
  }
</script>

<script lang="ts">
  import { Paperclip, X } from '@lucide/svelte';
  import { cn, safeResourceUrl } from '../../utils.js';
  import { usePromptInputAttachments } from './context.svelte.js';
  import PromptInputAttachmentImagePreview from './PromptInputAttachmentImagePreview.svelte';
  let { data, class: className = '', ...rest }: PromptInputAttachmentProps = $props();
  const attachments = usePromptInputAttachments();
  const isImage = $derived(Boolean(data.mediaType?.startsWith('image/') && safeResourceUrl(data.url)));
  const label = $derived(data.filename ?? data.name ?? 'Attachment');
</script>

<div {...rest} class={cn('group relative flex h-8 max-w-full min-w-0 items-center gap-2 overflow-hidden rounded border border-border px-2 text-xs', isImage && 'size-16 p-0', className)} data-slot="prompt-input-attachment">
  {#if isImage}
    <PromptInputAttachmentImagePreview {data} />
  {:else}
    <Paperclip size={14} aria-hidden="true" />
    <span class="truncate" title={label}>{label}</span>
  {/if}
  <button type="button" class="absolute right-0.5 top-0.5 inline-flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Remove ${label}`} title={`Remove ${label}`} onclick={() => attachments.remove(data.id)}>
    <X size={12} aria-hidden="true" />
  </button>
</div>
