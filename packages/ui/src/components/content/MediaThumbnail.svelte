<script lang="ts">
  import { Eye, FileText, ImageOff, Loader2 } from '@lucide/svelte';
  import * as Dialog from '../ui/dialog/index.js';
  import { cn } from '../../utils.js';

  export type MediaThumbnailSize = 'sm' | 'md' | 'lg' | 'full';
  export type MediaThumbnailFit = 'contain' | 'cover';

  interface Props {
    src?: string | null;
    alt?: string;
    title?: string;
    fileName?: string;
    mimeType?: string;
    size?: MediaThumbnailSize;
    fit?: MediaThumbnailFit;
    aspectRatio?: string;
    showOverlay?: boolean;
    overlayText?: string;
    emptyLabel?: string;
    loadingLabel?: string;
    errorLabel?: string;
    onopen?: () => void;
    class?: string;
  }

  let {
    src = null,
    alt = '',
    title = '',
    fileName = '',
    mimeType = '',
    size = 'md',
    fit = 'contain',
    aspectRatio,
    showOverlay = true,
    overlayText = 'View',
    emptyLabel = 'No media',
    loadingLabel = 'Loading media',
    errorLabel = 'Image unavailable',
    onopen,
    class: className = '',
  }: Props = $props();

  const isImage = $derived(Boolean(
    (mimeType && mimeType.startsWith('image/'))
    || (src && /\.(png|jpe?g|webp|gif|svg|bmp|avif)(\?.*)?$/i.test(src))
    || (fileName && /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(fileName))
    || (src && !mimeType && !fileName && !/\.(pdf|docx?|xlsx?|zip|tar|gz|txt|csv|json)$/i.test(src))
  ));
  const sizeClasses: Record<MediaThumbnailSize, string> = {
    sm: 'h-16 min-w-16 max-w-24',
    md: 'min-h-20 max-h-56 w-full',
    lg: 'min-h-32 max-h-80 w-full',
    full: 'h-full w-full',
  };
  const fitClasses: Record<MediaThumbnailFit, string> = {
    contain: 'object-contain',
    cover: 'object-cover',
  };

  let imageState = $state<'loading' | 'loaded' | 'error'>('loading');
  let previewOpen = $state(false);

  $effect(() => {
    if (src && isImage) imageState = 'loading';
    previewOpen = false;
  });

  function openMedia() {
    if (onopen) onopen();
    else previewOpen = true;
  }

  function openDocument() {
    if (onopen) onopen();
    else if (src) window.open(src, '_blank', 'noopener,noreferrer');
  }
</script>

{#if isImage && src}
  <div class={cn('relative flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30 transition-colors', sizeClasses[size], className)} style:aspect-ratio={aspectRatio} data-slot="media-thumbnail" data-size={size} data-media-state={imageState} aria-busy={imageState === 'loading' || undefined}>
    <img {src} alt={alt || title || fileName || 'Thumbnail'} class={cn('block max-h-full max-w-full transition-transform duration-200', showOverlay && 'group-hover:scale-[1.02]', fitClasses[fit], imageState !== 'loaded' && 'invisible')} loading="lazy" onload={() => imageState = 'loaded'} onerror={() => imageState = 'error'} />

    {#if imageState === 'loading'}
      <div class="absolute inset-0 flex items-center justify-center bg-muted/40" role="status" aria-label={loadingLabel}><Loader2 class="size-4 animate-spin text-muted-foreground" aria-hidden="true" /></div>
    {:else if imageState === 'error'}
      <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-center text-xs text-muted-foreground" role="img" aria-label={errorLabel} data-slot="media-thumbnail-error"><ImageOff class="size-5" aria-hidden="true" /><span class="max-w-[12rem] truncate text-[11px]">{errorLabel}</span></div>
    {:else if showOverlay}
      <Dialog.Root bind:open={previewOpen}>
        <button type="button" class="group absolute inset-0 cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset" onclick={openMedia} aria-label={alt ? `Preview ${alt}` : overlayText}>
          <span class="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 bg-background/60 text-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true"><Eye class="size-4" /><span class="text-xs font-semibold">{overlayText}</span></span>
        </button>
        {#if !onopen}
          <Dialog.Content class="max-w-[min(92vw,72rem)] border-none bg-transparent p-0 shadow-none">
            <Dialog.Header class="sr-only"><Dialog.Title>{alt || title || fileName || 'Media preview'}</Dialog.Title><Dialog.Description>{alt || title || fileName || 'Expanded media preview'}</Dialog.Description></Dialog.Header>
            <img {src} alt={alt || title || fileName || 'Media preview'} class="max-h-[82vh] w-full rounded-md object-contain" />
          </Dialog.Content>
        {/if}
      </Dialog.Root>
    {/if}
  </div>
{:else if src || fileName}
  <button type="button" class={cn('inline-flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/40', className)} onclick={openDocument} data-slot="media-thumbnail-document">
    <FileText class="size-4 shrink-0 text-muted-foreground" /><span class="truncate font-medium" title={fileName || alt || title}>{fileName || alt || title || 'Document'}</span>
  </button>
{:else}
  <span class={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)} data-media-state="empty"><ImageOff class="size-3.5" aria-hidden="true" /><span>{emptyLabel}</span></span>
{/if}
