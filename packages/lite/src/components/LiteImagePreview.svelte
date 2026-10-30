<script lang="ts">
  interface PreviewImage {
    src: string;
    alt: string;
  }

  interface Props {
    src: string;
    alt?: string;
    images?: PreviewImage[];
    downloadLabel?: string;
  }

  let { src, alt = '', images = [], downloadLabel = 'Download image' }: Props = $props();
  const gallery = $derived(images.length > 0 ? images : [{ src, alt }]);
</script>

<div class="lite-image-preview" role="group" aria-label="Image gallery">
  {#each gallery as image, index (image.src)}
    <a class="lite-image-preview__item" href={image.src} target="_blank" rel="noreferrer" aria-label={`Open ${image.alt || alt || `image ${index + 1}`}`}>
      <img src={image.src} alt={image.alt || alt} loading="lazy" decoding="async" />
      <span>{image.alt || alt || `Image ${index + 1}`}</span>
    </a>
  {/each}
  <a class="lite-btn lite-btn-sm" href={src} download={alt || 'image'}>{downloadLabel}</a>
</div>

<style>
  .lite-image-preview { display: flex; flex-wrap: wrap; align-items: flex-start; }
  .lite-image-preview__item { display: block; width: 160px; max-width: 100%; overflow: hidden; border: 1px solid #E5E6EB; border-radius: 8px; background: #fff; color: #1D2129; text-decoration: none; }
  .lite-image-preview__item:hover { border-color: #165DFF; text-decoration: none; }
  .lite-image-preview__item img { display: block; width: 100%; height: 110px; object-fit: cover; }
  .lite-image-preview__item span { display: block; padding: 6px 8px; overflow: hidden; color: #4E5969; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }

  .lite-image-preview > * { margin: 0 12px 12px 0; }
</style>
