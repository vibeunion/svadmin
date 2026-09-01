<script lang="ts">
  import * as VoiceSelector from './index.js';

  let value = $state<string | undefined>();
</script>

<VoiceSelector.Root bind:value>
  <VoiceSelector.Trigger />
  <VoiceSelector.Content>
    <VoiceSelector.Input />
    <VoiceSelector.List>
      <VoiceSelector.Item value="alloy">Alloy</VoiceSelector.Item>
      <VoiceSelector.Item value="verse">Verse</VoiceSelector.Item>
    </VoiceSelector.List>
  </VoiceSelector.Content>
</VoiceSelector.Root>

<output aria-label="Selected compound voice">{value ?? 'none'}</output>
