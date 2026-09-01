<script lang="ts">
  import { onMount } from 'svelte';
  import { useAudioDevices, type AudioDevicesState } from './useAudioDevices.svelte.js';

  let { capture }: { capture: (state: AudioDevicesState) => void } = $props();
  const audioDevices = useAudioDevices();
  onMount(() => { capture(audioDevices); });
</script>

<button type="button" onclick={() => { void audioDevices.loadDevices(); }}>Request permission</button>
<output aria-label="Audio devices state">
  {audioDevices.loading}|{audioDevices.hasPermission}|{audioDevices.error ?? ''}|{audioDevices.devices.map((device) => device.label).join(',')}
</output>
