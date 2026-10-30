<script lang="ts">
  interface VideoTrack {
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
    downloadLabel?: string;
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
    downloadLabel = 'Download media',
  }: Props = $props();
</script>

<figure class="lite-video-player">
  {#if title}<figcaption class="lite-video-player__title">{title}</figcaption>{/if}
  {#if media === 'audio'}
    <audio controls preload="metadata" {autoplay} {muted} {loop} aria-label={title ?? 'Audio player'}>
      <source {src} />
      {#each tracks as track (track.src)}
        <track src={track.src} kind={track.kind} label={track.label} srclang={track.language} default={track.default} />
      {/each}
      <a href={src}>{downloadLabel}</a>
    </audio>
  {:else}
    <video controls preload="metadata" {poster} {autoplay} {muted} {loop} {playsinline} aria-label={title ?? 'Video player'}>
      <source {src} />
      {#each tracks as track (track.src)}
        <track src={track.src} kind={track.kind} label={track.label} srclang={track.language} default={track.default} />
      {/each}
      <a href={src}>{downloadLabel}</a>
    </video>
  {/if}
  <a class="lite-video-player__download" href={src} download>{downloadLabel}</a>
</figure>

<style>
  .lite-video-player { display: block; margin: 0; padding: 12px; border: 1px solid #E5E6EB; border-radius: 8px; background: #fff; }
  .lite-video-player__title { color: #1D2129; font-size: 14px; font-weight: 600; }
  .lite-video-player video { display: block; width: 100%; max-height: 70vh; background: #000; }
  .lite-video-player audio { display: block; width: 100%; }
  .lite-video-player__download { justify-self: start; color: #165DFF; font-size: 12px; }

  .lite-video-player > * + * { margin-top: 8px; }
</style>
