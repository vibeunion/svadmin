<script lang="ts">
  import MicSelector from './MicSelector.svelte';
  import MicSelectorContent from './MicSelectorContent.svelte';
  import MicSelectorTrigger from './MicSelectorTrigger.svelte';
</script>

<MicSelector>
  <MicSelectorTrigger />
  <MicSelectorContent>Microphone options</MicSelectorContent>
</MicSelector>
