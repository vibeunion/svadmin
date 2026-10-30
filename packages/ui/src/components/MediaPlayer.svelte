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
    /**
     * `auto` loads HLS only for `.m3u8` sources, `native` always uses the
     * browser element, and `hls` forces the HLS engine for video sources.
     */
    format?: 'auto' | 'native' | 'hls';
    hlsConfig?: Record<string, unknown>;
    class?: string;
    ontimeupdate?: (event: Event) => void;
    onended?: (event: Event) => void;
    onerror?: (message: string) => void;
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
    format = 'auto',
    hlsConfig,
    class: className = '',
    ontimeupdate,
    onended,
    onerror,
  }: Props = $props();

  let video = $state<HTMLVideoElement | null>(null);
  let hls = $state<{ destroy: () => void } | null>(null);
  let hlsError = $state('');

  const isHlsSource = $derived(media === 'video' && (format === 'hls' || (format === 'auto' && /\.m3u8(?:$|[?#])/i.test(src))));

  $effect(() => {
    const element = video;
    const url = src;
    const enabled = isHlsSource;
    let active = true;
    let dispose: (() => void) | undefined;

    hlsError = '';

    if (!element || !enabled) return;
    const target = element;

    async function attach() {
      if (target.canPlayType('application/vnd.apple.mpegurl')) {
        target.src = url;
        return;
      }
      try {
        const module = await import('hls.js');
        if (!active) return;
        const Hls = module.default;
        if (!Hls.isSupported()) {
          hlsError = 'HLS is not supported in this browser.';
          onerror?.(hlsError);
          return;
        }
        const instance = new Hls(hlsConfig as never);
        instance.loadSource(url);
        instance.attachMedia(target);
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          hlsError = data.details;
          onerror?.(data.details);
        });
        hls = instance;
        dispose = () => {
          instance.destroy();
          if (hls === instance) hls = null;
        };
      } catch {
        if (!active) return;
        hlsError = 'HLS engine failed to load.';
        onerror?.(hlsError);
      }
    }

    void attach();

    return () => {
      active = false;
      dispose?.();
    };
  });
</script>

<figure class={cn('svadmin-media-player', className)} data-slot="media-player" data-media={media}>
  {#if media === 'video'}
    <div class="svadmin-media-player__stage" style={`aspect-ratio: ${aspectRatio};`}>
      <video
        bind:this={video}
        class="svadmin-media-player__video"
        src={isHlsSource ? undefined : src}
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
      {#if hlsError}
        <p class="svadmin-media-player__error" role="alert">{hlsError}</p>
      {/if}
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
  .svadmin-media-player__error { margin: 0.5rem 0 0; color: var(--destructive, currentColor); font-size: 0.8125rem; }
  .svadmin-media-player__audio-stage { padding: 0.25rem; }
  .svadmin-media-player__audio { width: 100%; }
  .svadmin-media-player__caption { display: grid; gap: 0.125rem; padding-inline: 0.25rem; }
  .svadmin-media-player__title { font-size: 0.875rem; font-weight: 600; }
  .svadmin-media-player__description { color: var(--muted-foreground, currentColor); font-size: 0.8125rem; }
</style>