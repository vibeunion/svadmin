<script module lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { MessageAttachmentData } from './MessageAttachment.svelte';

  export interface MessageAttachmentPreviewProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'class'> {
    data: MessageAttachmentData;
    class?: string;
  }
</script>

<script lang="ts">
  import { X } from '@lucide/svelte';
  import { cn, safeResourceUrl } from '../../utils.js';

  let { data, class: className = '', ...rest }: MessageAttachmentPreviewProps = $props();
  const src = $derived(safeResourceUrl(data.url));
  const label = $derived(data.filename ?? data.name ?? 'Image attachment');
  let dialog = $state<HTMLDialogElement | null>(null);

  function openPreview(): void {
    if (typeof dialog?.showModal === 'function') dialog.showModal();
    else dialog?.setAttribute('open', '');
  }

  function closePreview(): void {
    if (typeof dialog?.close === 'function') dialog.close();
    else dialog?.removeAttribute('open');
  }
</script>

<button {...rest} class={cn('svadmin-ai-message-attachment-preview', className)} type="button" aria-label={`Preview ${label}`} onclick={openPreview}>
  {#if src}<img src={src} alt={label} width="96" height="96" />{:else}<X aria-hidden="true" />{/if}
</button>
{#if src}
  <dialog bind:this={dialog} class="svadmin-ai-message-attachment-dialog" aria-label={`${label} preview`} onclick={(event) => { if (event.target === dialog) closePreview(); }}>
    <button type="button" class="svadmin-ai-message-attachment-dialog__close" aria-label="Close preview" onclick={closePreview}><X size={18} aria-hidden="true" /></button>
    <img src={src} alt={`${label} preview`} />
  </dialog>
{/if}

<style>
  .svadmin-ai-message-attachment-preview { display: block; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; cursor: zoom-in; }
  .svadmin-ai-message-attachment-preview img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .2s ease; }
  .svadmin-ai-message-attachment-preview:hover img { transform: scale(1.03); }
  .svadmin-ai-message-attachment-preview:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: -2px; }
  .svadmin-ai-message-attachment-dialog { width: min(94vw, 68rem); max-width: none; max-height: 88vh; padding: 2.5rem 1rem 1rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--background, Canvas); color: var(--foreground, currentColor); }
  .svadmin-ai-message-attachment-dialog::backdrop { background: color-mix(in oklch, var(--foreground, currentColor) 45%, transparent); }
  .svadmin-ai-message-attachment-dialog img { display: block; width: 100%; max-height: calc(88vh - 3.5rem); object-fit: contain; }
  .svadmin-ai-message-attachment-dialog__close { position: absolute; top: .5rem; right: .5rem; display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .375rem); background: var(--background, Canvas); color: var(--foreground, currentColor); cursor: pointer; }
  .svadmin-ai-message-attachment-dialog__close:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
