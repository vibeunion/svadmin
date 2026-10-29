<script lang="ts">
  import { ChevronLeft, ChevronRight, Download, RotateCw, X, ZoomIn, ZoomOut } from '@lucide/svelte';
  import { Button } from './ui/button/index.js';
  import * as Dialog from './ui/dialog/index.js';
  import { cn } from '../utils.js';

  export interface PreviewImage {
    src: string;
    alt: string;
  }

  interface Props {
    src: string;
    alt?: string;
    images?: PreviewImage[];
    open?: boolean;
    class?: string;
  }

  let { src, alt = '', images = [], open = $bindable(false), class: className = '' }: Props = $props();
  const gallery = $derived(images.length > 0 ? images : [{ src, alt }]);
  let index = $state(0);
  let scale = $state(1);
  let rotation = $state(0);
  const current = $derived(gallery[Math.max(0, Math.min(index, gallery.length - 1))] ?? { src, alt });

  function resetView(): void { scale = 1; rotation = 0; }
  function zoom(delta: number): void { scale = Math.min(3, Math.max(0.5, Number((scale + delta).toFixed(2)))); }
  function rotate(delta: number): void { rotation = (rotation + delta + 360) % 360; }

  function show(target = 0): void {
    index = target;
    resetView();
    open = true;
  }

  function move(delta: number): void {
    index = (index + delta + gallery.length) % gallery.length;
  }
</script>

<button type="button" class={cn('svadmin-image-preview__trigger', className)} aria-label={`Open ${alt || 'image'} preview`} onclick={() => show()}>
  <img {src} {alt} loading="lazy" />
  <span class="svadmin-image-preview__overlay" aria-hidden="true"><ZoomIn size={18} /></span>
</button>

<Dialog.Root bind:open>
  <Dialog.Content class="svadmin-image-preview">
    <Dialog.Title class="svadmin-image-preview__title">{current.alt || alt || 'Image preview'}</Dialog.Title>
    <div class="svadmin-image-preview__stage">
      <img src={current.src} alt={current.alt || alt} style:transform={`scale(${scale}) rotate(${rotation}deg)`} />
      <div class="svadmin-image-preview__toolbar" role="toolbar" aria-label="Image controls">
        <Button variant="secondary" size="icon-sm" aria-label="Zoom out" disabled={scale <= 0.5} onclick={() => zoom(-0.25)}><ZoomOut size={16} /></Button>
        <span class="svadmin-image-preview__zoom" aria-live="polite">{Math.round(scale * 100)}%</span>
        <Button variant="secondary" size="icon-sm" aria-label="Zoom in" disabled={scale >= 3} onclick={() => zoom(0.25)}><ZoomIn size={16} /></Button>
        <Button variant="secondary" size="icon-sm" aria-label="Rotate" onclick={() => rotate(90)}><RotateCw size={16} /></Button>
        <a class="svadmin-image-preview__download" href={current.src} download={current.alt || alt || 'image'} aria-label="Download image"><Download size={16} /></a>
      </div>
      {#if gallery.length > 1}
        <Button variant="secondary" size="icon-sm" class="svadmin-image-preview__prev" aria-label="Previous image" onclick={() => move(-1)}><ChevronLeft size={18} /></Button>
        <Button variant="secondary" size="icon-sm" class="svadmin-image-preview__next" aria-label="Next image" onclick={() => move(1)}><ChevronRight size={18} /></Button>
      {/if}
    </div>
    {#if gallery.length > 1}
      <div class="svadmin-image-preview__thumbs">
        {#each gallery as image, item (image.src)}
          <button type="button" aria-label={image.alt} aria-pressed={item === index} onclick={() => (index = item)}>
            <img src={image.src} alt="" />
          </button>
        {/each}
      </div>
    {/if}
    <Dialog.Close>
      {#snippet child({ props })}
        <Button {...props} variant="ghost" size="icon-sm" class="svadmin-image-preview__close" aria-label="Close preview"><X size={18} /></Button>
      {/snippet}
    </Dialog.Close>
  </Dialog.Content>
</Dialog.Root>

<style>
  .svadmin-image-preview__trigger { position: relative; display: block; overflow: hidden; width: 100%; max-width: 100%; padding: 0; border: 0; border-radius: var(--radius-md); background: var(--muted); cursor: zoom-in; }
  .svadmin-image-preview__trigger img { display: block; width: 100%; height: auto; }
  .svadmin-image-preview__overlay { position: absolute; inset: 0; display: grid; place-items: center; background: rgb(0 0 0 / 0.25); color: var(--primary-foreground); opacity: 0; transition: opacity 120ms ease; }
  .svadmin-image-preview__trigger:hover .svadmin-image-preview__overlay, .svadmin-image-preview__trigger:focus-visible .svadmin-image-preview__overlay { opacity: 1; }
  .svadmin-image-preview { width: min(64rem, calc(100vw - 2rem)); max-height: calc(100vh - 2rem); overflow: auto; }
  .svadmin-image-preview__title { padding-inline-end: var(--svadmin-space-6); font-size: var(--svadmin-text-body); }
  .svadmin-image-preview__stage { position: relative; display: grid; place-items: center; aspect-ratio: 16 / 9; max-height: 70vh; background: var(--muted); border-radius: var(--radius-md); }
  .svadmin-image-preview__stage img { max-width: 100%; max-height: 70vh; object-fit: contain; transition: transform var(--svadmin-motion-standard) var(--svadmin-motion-easing); }
  .svadmin-image-preview__toolbar { position: absolute; inset-block-end: var(--svadmin-space-2); display: flex; align-items: center; gap: var(--svadmin-space-1); padding: var(--svadmin-space-1); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--card); box-shadow: var(--svadmin-shadow-surface); }
  .svadmin-image-preview__zoom { min-width: 3rem; color: var(--muted-foreground); font-size: var(--svadmin-text-caption); text-align: center; }
  .svadmin-image-preview__download { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: var(--radius-sm); color: var(--foreground); }
  .svadmin-image-preview__download:hover { background: var(--accent); }
  .svadmin-image-preview__prev { position: absolute; inset-inline-start: var(--svadmin-space-2); }
  .svadmin-image-preview__next { position: absolute; inset-inline-end: var(--svadmin-space-2); }
  .svadmin-image-preview__thumbs { display: flex; gap: var(--svadmin-space-2); padding-block-start: var(--svadmin-space-2); overflow-x: auto; }
  .svadmin-image-preview__thumbs button { flex: 0 0 auto; width: 3.5rem; height: 3.5rem; padding: 0; border: 2px solid transparent; border-radius: var(--radius-sm); background: var(--muted); overflow: hidden; }
  .svadmin-image-preview__thumbs button[aria-pressed='true'] { border-color: var(--primary); }
  .svadmin-image-preview__thumbs img { width: 100%; height: 100%; object-fit: cover; }
  .svadmin-image-preview__close { position: absolute; inset-block-start: var(--svadmin-space-2); inset-inline-end: var(--svadmin-space-2); }
</style>