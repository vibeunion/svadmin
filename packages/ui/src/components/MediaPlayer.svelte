<script lang="ts">
  import { cn } from '../utils.js';

  interface Props {
    src: string;
    media?: 'video' | 'audio';
    poster?: string;
    title?: string;
    description?: string;
    controls?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    playsinline?: boolean;
    preload?: 'none' | 'metadata' | 'auto';
    /** CSS aspect ratio for video, e.g. `16 / 9`. */
    aspectRatio?: string;
    class?: string;
    ontimeupdate?: (event: Event) => void;
    onended?: (event: Event) => void;
  }

  let {
    src,
    media = 'video',
    poster,
    title,
    description,
    controls = true,
    autoplay = false,
    loop = false,
    muted = false,
    playsinline = true,
    preload = 'metadata',
    aspectRatio = '16 / 9',
    class: className = '',
    ontimeupdate,
    onended,
  }: Props = $props();
</script>

<figure class={cn('svadmin-media-player', className)} data-slot="media-player" data-media={media}>
  {#if media === 'video'}
    <div class="svadmin-media-player__stage" style={`aspect-ratio: ${aspectRatio};`}>
      <video
        class="svadmin-media-player__video"
        {src}
        {poster}
        {controls}
        autoplay={autoplay}
        {loop}
        {muted}
        {playsinline}
        {preload}
        aria-label={title}
        ontimeupdate={ontimeupdate}
        onended={onended}
      ></video>
    </div>
  {:else}
    <div class="svadmin-media-player__audio-stage">
      <audio
        class="svadmin-media-player__audio"
        {src}
        {controls}
        autoplay={autoplay}
        {loop}
        {muted}
        {preload}
        aria-label={title}
        ontimeupdate={ontimeupdate}
        onended={onended}
      ></audio>
    </div>
  {/if}

  {#if title || description}
    <figcaption class="svadmin-media-player__caption">
      {#if title}<span class="svadmin-media-player__title">{title}</span>{/if}
      {#if description}<span class="svadmin-media-player__description">{description}</span>{/if}
    </figcaption>
  {/if}
</figure>

<style>
  .svadmin-media-player {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    border: 1px solid var(--border, currentColor);
    border-radius: min(var(--radius, 0.5rem), 0.75rem);
    padding: 0.5rem;
    background: var(--card, transparent);
    color: var(--card-foreground, var(--foreground, currentColor));
  }

  .svadmin-media-player__stage { overflow: hidden; border-radius: min(var(--radius, 0.5rem), 0.5rem); background: var(--muted, transparent); }
  .svadmin-media-player__video { display: block; width: 100%; height: 100%; object-fit: contain; }
  .svadmin-media-player__audio-stage { padding: 0.25rem; }
  .svadmin-media-player__audio { width: 100%; }
  .svadmin-media-player__caption { display: grid; gap: 0.125rem; padding-inline: 0.25rem; }
  .svadmin-media-player__title { font-size: 0.875rem; font-weight: 600; }
  .svadmin-media-player__description { color: var(--muted-foreground, currentColor); font-size: 0.8125rem; }
</style>