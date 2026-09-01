<script module lang="ts">
  import type { HTMLAudioAttributes } from 'svelte/elements'; import type { AudioData } from './AudioPlayer.svelte';
  export type AudioPlayerElementProps = Omit<HTMLAudioAttributes, 'src'> & ({ src: string; data?: never } | { data: AudioData; src?: never });
</script>
<script lang="ts">
  import { useAudioPlayerContext } from './context.svelte.js';
  let { src, data, ...rest }: AudioPlayerElementProps = $props(); const context = useAudioPlayerContext('AudioPlayerElement'); let element = $state<HTMLAudioElement | null>(null); const resolvedSrc = $derived(src ?? (data ? `data:${data.mediaType};base64,${data.base64}` : undefined));
  $effect(() => { context.register(element); return () => context.register(null); });
</script>
<audio bind:this={element} {...rest} src={resolvedSrc} data-slot="audio-player-element"></audio>
