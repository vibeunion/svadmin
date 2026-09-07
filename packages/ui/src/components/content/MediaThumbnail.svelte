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
    sm: 'svadmin-u-acaee62117b1 svadmin-u-0277bd2c2996 svadmin-u-ecf9478d01e6',
    md: 'svadmin-u-3f2a1ff6358f svadmin-u-520bb7118c41 svadmin-u-6da6a3c3f741',
    lg: 'svadmin-u-152267a018a5 svadmin-u-e5738cbd2714 svadmin-u-6da6a3c3f741',
    full: 'svadmin-u-668b21aa5409 svadmin-u-6da6a3c3f741',
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
  <div class={cn('svadmin-u-d89972fe17d6 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-2cd02d11d1af svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-2859c861d7de svadmin-u-ceb69a6b0e5f', sizeClasses[size], className)} style:aspect-ratio={aspectRatio} data-slot="media-thumbnail" data-size={size} data-media-state={imageState} aria-busy={imageState === 'loading' || undefined}>
    <img {src} alt={alt || title || fileName || 'Thumbnail'} class={cn('svadmin-u-0214b4b355d1 svadmin-u-a201da4b0d91 svadmin-u-c0980a65a70d svadmin-u-eadef238231e svadmin-u-625a4c3fbeb2', showOverlay && 'svadmin-u-7b9cdafaf68a', fitClasses[fit], imageState !== 'loaded' && 'invisible')} loading="lazy" onload={() => imageState = 'loaded'} onerror={() => imageState = 'error'} />

    {#if imageState === 'loading'}
      <div class="svadmin-u-da4dbfbc4fdc svadmin-u-7b7df0449b80 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-b00f43c30c2b" role="status" aria-label={loadingLabel}><Loader2 class="svadmin-u-f7b5fa971871 svadmin-u-afbdd13a380e svadmin-u-bfa603190748" aria-hidden="true" /></div>
    {:else if imageState === 'error'}
      <div class="svadmin-u-da4dbfbc4fdc svadmin-u-7b7df0449b80 svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-44ee8ba0a421 svadmin-u-eb6e8b881acd svadmin-u-ca6bf63030aa svadmin-u-359090c2d529 svadmin-u-bfa603190748" role="img" aria-label={errorLabel} data-slot="media-thumbnail-error"><ImageOff class="svadmin-u-add63bc6753d" aria-hidden="true" /><span class="svadmin-u-4bfac3b6a99f svadmin-u-f283ea9bea0e svadmin-u-d058ca6de60f">{errorLabel}</span></div>
    {:else if showOverlay}
      <Dialog.Root bind:open={previewOpen}>
        <button type="button" class="group svadmin-u-da4dbfbc4fdc svadmin-u-7b7df0449b80 svadmin-u-3bbc8c13feec svadmin-u-df37b1fd9495 svadmin-u-793c80e97ffb svadmin-u-9c1295a6914a svadmin-u-77923ba6606a" onclick={openMedia} aria-label={alt ? `Preview ${alt}` : overlayText}>
          <span class="svadmin-u-a4326536b8f5 svadmin-u-da4dbfbc4fdc svadmin-u-7b7df0449b80 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-58284b4ea568 svadmin-u-f160abf88b25 svadmin-u-d4108abe6359 svadmin-u-7065497e1ca0 svadmin-u-67d6184a0024 svadmin-u-181f3d6c9821 svadmin-u-bd301bde45ea" aria-hidden="true"><Eye class="svadmin-u-f7b5fa971871" /><span class="svadmin-u-359090c2d529 svadmin-u-e83a7042bc91">{overlayText}</span></span>
        </button>
        {#if !onopen}
          <Dialog.Content class="svadmin-u-53eae0624db1 svadmin-u-4a5f0ea04648 svadmin-u-7f19cdf4c5bb svadmin-u-8a539c7fe216 svadmin-u-ad47d17e603c">
            <Dialog.Header class="svadmin-u-2daa8e5e2f2e"><Dialog.Title>{alt || title || fileName || 'Media preview'}</Dialog.Title><Dialog.Description>{alt || title || fileName || 'Expanded media preview'}</Dialog.Description></Dialog.Header>
            <img {src} alt={alt || title || fileName || 'Media preview'} class="svadmin-u-467420585af4 svadmin-u-6da6a3c3f741 svadmin-u-421ac2be5045 svadmin-u-b1104f41444a" />
          </Dialog.Content>
        {/if}
      </Dialog.Root>
    {/if}
  </div>
{:else if src || fileName}
  <button type="button" class={cn('svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-967d113a1451 svadmin-u-0e17f2bd9074 svadmin-u-03b4dd7f172b svadmin-u-2eba0d65d059 svadmin-u-359090c2d529 svadmin-u-d4108abe6359 svadmin-u-ceb69a6b0e5f svadmin-u-f6e31b39b8e4', className)} onclick={openDocument} data-slot="media-thumbnail-document">
    <FileText class="svadmin-u-f7b5fa971871 svadmin-u-012fbd121f37 svadmin-u-bfa603190748" /><span class="svadmin-u-f283ea9bea0e svadmin-u-2689f3958069" title={fileName || alt || title}>{fileName || alt || title || 'Document'}</span>
  </button>
{:else}
  <span class={cn('svadmin-u-52083e7da442 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-359090c2d529 svadmin-u-bfa603190748', className)} data-media-state="empty"><ImageOff class="svadmin-u-783b0d9d1e2c" aria-hidden="true" /><span>{emptyLabel}</span></span>
{/if}
