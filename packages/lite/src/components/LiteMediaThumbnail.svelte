<script lang="ts">
  interface Props {
    src?: string | null;
    alt?: string;
    height?: number;
    muted?: boolean;
    emptyLabel?: string;
    errorLabel?: string;
  }

  let { src = null, alt = '', height = 100, muted = false, emptyLabel = 'No image', errorLabel = 'Image unavailable' }: Props = $props();
  let state = $state<'loading' | 'loaded' | 'error'>('loading');

  $effect(() => {
    if (src) state = 'loading';
  });
</script>

{#if src}
  <span class="lite-media-thumbnail" data-lite-media-state={state} style={`height:${height}px;${muted ? 'opacity:0.6;' : ''}`}>
    <img {src} {alt} onload={() => state = 'loaded'} onerror={() => state = 'error'} class:lite-media-hidden={state !== 'loaded'} />
    {#if state === 'loading'}<span class="lite-media-status" role="status">Loading image</span>{/if}
    {#if state === 'error'}<span class="lite-media-status" role="img" aria-label={errorLabel}>{errorLabel}</span>{/if}
  </span>
{:else}
  <span class="lite-media-empty" data-lite-media-state="empty">{emptyLabel}</span>
{/if}

<style>
  .lite-media-thumbnail { position: relative; display: inline-flex; max-width: 300px; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; }
  .lite-media-thumbnail img { display: block; width: auto; max-width: 100%; height: 100%; object-fit: contain; }
  .lite-media-hidden { visibility: hidden; }
  .lite-media-status { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 8px; color: #64748b; font-size: 12px; text-align: center; }
  .lite-media-empty { color: #64748b; font-size: 12px; }
</style>
