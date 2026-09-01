<script lang="ts">
  import AudioPlayer from './AudioPlayer.svelte';

  let { onerror }: { onerror?: (event: Event) => void } = $props();
  let src = $state('/first.mp3');
  let currentTime = $state(5);
  let volume = $state(0.5);
  let playing = $state(false);
</script>

<button type="button" onclick={() => { currentTime = 12; }}>Set time</button>
<button type="button" onclick={() => { volume = 0.25; }}>Set volume</button>
<button type="button" onclick={() => { playing = true; }}>Start externally</button>
<button type="button" onclick={() => { playing = false; }}>Stop externally</button>
<button type="button" onclick={() => { src = '/second.mp3'; }}>Change source</button>
<output aria-label="Audio state">{currentTime}|{volume}|{playing}</output>

<AudioPlayer {src} duration={30} bind:currentTime bind:volume bind:playing {onerror} />
