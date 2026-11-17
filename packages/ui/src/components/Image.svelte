<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ImageOff, ZoomIn } from '@lucide/svelte';
  import { cn } from '../utils.js';

  interface Props {
    src?: string | undefined;
    alt?: string;
    title?: string;
    description?: string;
    width?: string | number;
    height?: string | number;
    fit?: 'cover' | 'contain' | 'fill' | 'none';
    rounded?: boolean;
    preview?: boolean;
    fallback?: string;
    error?: Snippet | undefined;
    class?: string;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
  }

  let {
    src,
    alt = '',
    title,
    description,
    width,
    height,
    fit = 'cover',
    rounded = false,
    preview = false,
    fallback = 'Image unavailable',
    error,
    class: className = '',
    children,
    onclick,
  }: Props = $props();

  let failed = $state(false);

  const sizeStyle = $derived([
    width === undefined ? undefined : `width:${typeof width === 'number' ? `${width}px` : width}`,
    height === undefined ? undefined : `height:${typeof height === 'number' ? `${height}px` : height}`,
  ].filter(Boolean).join(';'));
</script>

{#snippet content()}
  <span class="svadmin-image__frame">
    {#if src && !failed}
      <img
        class="svadmin-image__img"
        {src}
        {alt}
        loading="lazy"
        decoding="async"
        style={`object-fit:${fit}`}
        onerror={() => { failed = true; }}
      />
      {#if preview}
        <span class="svadmin-image__overlay" aria-hidden="true" data-slot="image-overlay">
          <ZoomIn size={16} />
        </span>
      {/if}
    {:else}
      {#if error}
        {@render error()}
      {:else}
        <span class="svadmin-image__fallback" role="img" aria-label={fallback}>
          <ImageOff size={20} aria-hidden="true" />
          {#if fallback}<span>{fallback}</span>{/if}
        </span>
      {/if}
    {/if}
  </span>
  {#if title || description || children}
    <div class="svadmin-image__caption">
      {#if title}<strong class="svadmin-image__title">{title}</strong>{/if}
      {#if description}<p class="svadmin-image__description">{description}</p>{/if}
      {#if children}{@render children()}{/if}
    </div>
  {/if}
{/snippet}

{#if preview || onclick}
  <button
    type="button"
    class="svadmin-image__button"
    aria-label={alt ? `Preview ${alt}` : 'Preview image'}
    {onclick}
  >
    <figure class={cn('svadmin-image', className)} class:is-rounded={rounded} class:is-preview={preview} style={sizeStyle || undefined}>
      {@render content()}
    </figure>
  </button>
{:else}
  <figure class={cn('svadmin-image', className)} class:is-rounded={rounded} style={sizeStyle || undefined}>
    {@render content()}
  </figure>
{/if}

<style>
  .svadmin-image {
    display: grid;
    min-width: 0;
    max-width: 100%;
    margin: 0;
    color: var(--foreground);
  }
  .svadmin-image__button { display: block; width: 100%; margin: 0; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; text-align: inherit; }
  .svadmin-image__button:focus-visible {
    outline: var(--svadmin-focus-width) solid var(--ring);
    outline-offset: var(--svadmin-focus-offset);
  }
  .svadmin-image.is-rounded .svadmin-image__frame { border-radius: var(--radius); }
  .svadmin-image.is-preview { cursor: zoom-in; }
  .svadmin-image__frame {
    position: relative;
    display: grid;
    place-items: center;
    min-width: 0;
    overflow: hidden;
    background: var(--svadmin-fill-1, var(--muted));
    color: var(--svadmin-text-4, var(--muted-foreground));
  }
  .svadmin-image__img { display: block; width: 100%; height: 100%; max-width: 100%; }
  .svadmin-image__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--svadmin-mask, var(--color-mask-bg));
    color: var(--color-white);
    opacity: 0;
    transition: opacity var(--svadmin-duration-1, 0.1s) var(--svadmin-easing-linear, linear);
    pointer-events: none;
  }
  .svadmin-image__button:hover .svadmin-image__overlay,
  .svadmin-image__button:focus-visible .svadmin-image__overlay {
    opacity: 1;
  }
  .svadmin-image__fallback {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: var(--svadmin-space-1);
    padding: 8px 16px;
    color: var(--svadmin-text-4, var(--muted-foreground));
    font-size: var(--svadmin-text-caption);
    line-height: 1.6667;
    text-align: center;
  }
  .svadmin-image__caption { width: 100%; margin-top: 4px; }
  .svadmin-image__title {
    display: block;
    color: var(--foreground);
    font-size: var(--svadmin-text-section);
    font-weight: 500;
    line-height: 1.5715;
  }
  .svadmin-image__description {
    margin: 0;
    color: var(--svadmin-text-3, var(--muted-foreground));
    font-size: var(--svadmin-text-body);
    line-height: 1.5715;
  }
</style>
