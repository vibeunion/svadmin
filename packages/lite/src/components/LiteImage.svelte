<script lang="ts">
  interface Props {
    src?: string;
    alt?: string;
    width?: string | number;
    height?: string | number;
    fit?: 'cover' | 'contain' | 'fill' | 'none';
    rounded?: boolean;
    fallback?: string;
    href?: string;
    caption?: string;
  }

  let {
    src,
    alt = '',
    width,
    height,
    fit = 'cover',
    rounded = false,
    fallback = 'Image unavailable',
    href,
    caption,
  }: Props = $props();

  const sizeStyle = $derived([
    width === undefined ? undefined : `width:${typeof width === 'number' ? `${width}px` : width}`,
    height === undefined ? undefined : `height:${typeof height === 'number' ? `${height}px` : height}`,
  ].filter(Boolean).join(';'));
</script>

<figure class="lite-image" class:lite-image-rounded={rounded} style={sizeStyle || undefined}>
  {#if src}
    {#if href}
      <a href={href} aria-label={alt ? `Open ${alt}` : 'Open image'}>
        <img {src} {alt} loading="lazy" decoding="async" style={`object-fit:${fit}`} />
      </a>
    {:else}
      <img {src} {alt} loading="lazy" decoding="async" style={`object-fit:${fit}`} />
    {/if}
  {:else}
    <span class="lite-image-fallback" role="img" aria-label={fallback}>{fallback}</span>
  {/if}
  {#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
  .lite-image { display: block; place-items: center; min-width: 0; max-width: 100%; margin: 0; overflow: hidden; border: 1px solid #E5E6EB; background: #F2F3F5; color: #4E5969; }
  .lite-image-rounded { border-radius: 8px; }
  .lite-image a { display: block; max-width: 100%; }
  .lite-image img { display: block; max-width: 100%; height: auto; }
  .lite-image-fallback { display: inline-block; padding: 24px 16px; font-size: 13px; text-align: center; }
  .lite-image figcaption { width: 100%; padding: 8px 12px; border-top: 1px solid #E5E6EB; background: #fff; color: #4E5969; font-size: 12px; }
</style>
