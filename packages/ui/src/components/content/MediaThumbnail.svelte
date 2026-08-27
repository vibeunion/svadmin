<script lang="ts">
  import { FileText, Eye, Loader2, ImageOff } from '@lucide/svelte';
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
    onopen,
    class: className = '',
  }: Props = $props();

  const isImage = $derived(
    Boolean(
      (mimeType && mimeType.startsWith('image/')) ||
      (src && /\.(png|jpe?g|webp|gif|svg|bmp|avif)(\?.*)?$/i.test(src)) ||
      (fileName && /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(fileName)) ||
      (src && !mimeType && !fileName && !/\.(pdf|docx?|xlsx?|zip|tar|gz|txt|csv|json)$/i.test(src))
    )
  );

  let loading = $state(false);
  let error = $state(false);

  $effect(() => {
    if (src && isImage) {
      loading = true;
      error = false;
    } else {
      loading = false;
      error = false;
    }
  });

  function handleLoad() {
    loading = false;
    error = false;
  }

  function handleError() {
    loading = false;
    error = true;
  }

  function handleAction() {
    if (onopen) {
      onopen();
    } else if (src) {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  }

  const sizeClasses: Record<MediaThumbnailSize, string> = {
    sm: 'h-16 min-w-16 max-w-24',
    md: 'min-h-20 max-h-56 w-full',
    lg: 'min-h-32 max-h-80 w-full',
    full: 'w-full h-full min-h-24',
  };

  const fitClasses: Record<MediaThumbnailFit, string> = {
    contain: 'object-contain',
    cover: 'object-cover',
  };
</script>

{#if isImage && src}
  <div
    class={cn(
      'relative flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30 transition-colors',
      sizeClasses[size],
      className
    )}
    style:aspect-ratio={aspectRatio}
    data-slot="media-thumbnail"
    data-size={size}
    data-loading={loading}
    data-error={error}
  >
    {#if loading}
      <div class="absolute inset-0 flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-muted/40 animate-pulse">
        <Loader2 class="size-4 animate-spin text-muted-foreground/70" />
      </div>
    {/if}

    {#if error}
      <div class="flex flex-col items-center justify-center gap-1 p-3 text-center text-xs text-muted-foreground" data-slot="media-thumbnail-error">
        <ImageOff class="size-5 text-muted-foreground/60" />
        <span class="text-[11px] truncate max-w-[12rem]">{alt || fileName || 'Image unavailable'}</span>
      </div>
    {:else}
      {#snippet imageContent(interactive: boolean)}
        <img
          {src}
          alt={alt || title || fileName || 'Thumbnail'}
          class={cn(
            'block max-h-full max-w-full transition-transform duration-200',
            interactive && 'group-hover:scale-[1.02]',
            fitClasses[fit],
            loading ? 'opacity-0' : 'opacity-100'
          )}
          loading="lazy"
          onload={handleLoad}
          onerror={handleError}
        />
        {#if showOverlay}
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 bg-background/60 text-foreground opacity-0 backdrop-blur-xs transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
            <Eye class="size-4 text-foreground" />
            <span class="text-xs font-semibold">{overlayText}</span>
          </div>
        {/if}
      {/snippet}

      {#if showOverlay}
        <button
          type="button"
          class="group relative flex size-full cursor-pointer items-center justify-center bg-[repeating-conic-gradient(theme(colors.muted.DEFAULT)_0%_25%,theme(colors.card.DEFAULT)_0%_50%)] bg-[length:16px_16px]"
          onclick={handleAction}
          title={title || alt || fileName || 'Click to view'}
        >
          {@render imageContent(true)}
        </button>
      {:else}
        <div
          class="relative flex size-full items-center justify-center bg-[repeating-conic-gradient(theme(colors.muted.DEFAULT)_0%_25%,theme(colors.card.DEFAULT)_0%_50%)] bg-[length:16px_16px]"
          title={title || alt || fileName}
        >
          {@render imageContent(false)}
        </div>
      {/if}
    {/if}
  </div>
{:else if src || fileName}
  {#if onopen}
    <button
      type="button"
      class={cn(
        'inline-flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground transition-colors hover:bg-muted/40 cursor-pointer text-left',
        className
      )}
      onclick={handleAction}
      data-slot="media-thumbnail-document"
    >
      <FileText class="size-4 shrink-0 text-muted-foreground" />
      <span class="truncate font-medium" title={fileName || alt || title}>{fileName || alt || title || 'Document'}</span>
    </button>
  {:else}
    <div
      class={cn(
        'inline-flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground',
        className
      )}
      data-slot="media-thumbnail-document"
    >
      <FileText class="size-4 shrink-0 text-muted-foreground" />
      <span class="truncate font-medium" title={fileName || alt || title}>{fileName || alt || title || 'Document'}</span>
    </div>
  {/if}
{:else}
  <div class={cn('flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 p-3 text-xs text-muted-foreground', className)}>
    <span>—</span>
  </div>
{/if}
