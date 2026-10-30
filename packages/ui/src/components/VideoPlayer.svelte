<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { cn } from '../utils.js';

  export interface VideoTrack {
    src: string;
    kind: 'subtitles' | 'captions' | 'chapters' | 'metadata' | 'descriptions';
    label?: string;
    language?: string;
    default?: boolean;
  }

  interface Props {
    src: string;
    poster?: string;
    title?: string;
    media?: 'video' | 'audio';
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
    playsinline?: boolean;
    tracks?: VideoTrack[];
    aspectRatio?: string;
    class?: string;
    onready?: (element: HTMLElement) => void;
    onerror?: (message: string) => void;
  }

  let {
    src,
    poster,
    title,
    media = 'video',
    autoplay = false,
    muted = false,
    loop = false,
    playsinline = true,
    tracks = [],
    aspectRatio = '16 / 9',
    class: className = '',
    onready,
    onerror,
  }: Props = $props();

  let player = $state<HTMLElement | null>(null);
  let ready = $state(false);
  let error = $state('');

  function reportError(event: Event) {
    const detail = (event as CustomEvent<{ message?: string }>).detail;
    error = detail?.message ?? 'Video playback failed.';
    onerror?.(error);
  }

  onMount(() => {
    let active = true;
    Promise.all([
      import('vidstack/player'),
      import('vidstack/player/layouts/default'),
      import('vidstack/player/styles/default/theme.css'),
      import('vidstack/player/styles/default/layouts/video.css'),
    ]).then(() => {
      if (!active) return;
      ready = true;
      requestAnimationFrame(() => {
        if (!player) return;
        player.addEventListener('error', reportError);
        onready?.(player);
      });
    }).catch((cause: unknown) => {
      if (!active) return;
      error = cause instanceof Error ? cause.message : 'Video player failed to load.';
      onerror?.(error);
    });

    return () => {
      active = false;
      player?.removeEventListener('error', reportError);
    };
  });

  onDestroy(() => {
    player?.removeEventListener('error', reportError);
  });
</script>

<figure class={cn('svadmin-video-player', className)} data-media={media}>
  {#if ready}
    <media-player
      bind:this={player}
      {title}
      {src}
      {poster}
      {autoplay}
      {muted}
      {loop}
      {playsinline}
      crossorigin
      style={media === 'video' ? `aspect-ratio:${aspectRatio};width:100%;` : 'width:100%;'}
    >
      <media-provider>
        {#if poster}<media-poster src={poster} alt={title ?? ''}></media-poster>{/if}
        {#each tracks as track (track.src)}
          <track
            src={track.src}
            kind={track.kind}
            label={track.label}
            srclang={track.language}
            default={track.default}
          />
        {/each}
      </media-provider>
      {#if media === 'video'}
        <media-video-layout></media-video-layout>
      {:else}
        <media-audio-layout></media-audio-layout>
      {/if}
    </media-player>
  {:else}
    <div class="svadmin-video-player__fallback" style={media === 'video' ? `aspect-ratio:${aspectRatio};` : ''}>
      {#if media === 'video'}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video controls {src} {poster} aria-label={title}></video>
      {:else}
        <audio controls {src} aria-label={title}></audio>
      {/if}
    </div>
  {/if}
  {#if error}
    <p class="svadmin-video-player__error" role="alert">{error}</p>
  {/if}
</figure>

<style>
  .svadmin-video-player {
    display: grid;
    gap: 0.5rem;
    width: 100%;
    margin: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--card);
  }
  .svadmin-video-player__fallback { width: 100%; background: var(--muted); }
  .svadmin-video-player__fallback video,
  .svadmin-video-player__fallback audio { display: block; width: 100%; height: 100%; }
  .svadmin-video-player__error {
    margin: 0;
    padding: 0 0.75rem 0.75rem;
    color: var(--destructive);
    font-size: var(--svadmin-text-label, 0.875rem);
  }
  .svadmin-video-player :global(media-player) {
    width: 100%;
    --media-brand: var(--primary);
    --media-focus-ring-color: var(--ring);
    --media-border-radius: var(--radius);
  }
</style>
