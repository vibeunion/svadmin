<script lang="ts">
  import PromptInput from './PromptInput.svelte';
  import PromptInputSpeechButton from './PromptInputSpeechButton.svelte';
  import PromptInputTextarea from './PromptInputTextarea.svelte';

  let {
    value = $bindable(''),
    ontranscriptionchange,
  }: {
    value?: string;
    ontranscriptionchange?: (text: string) => void;
  } = $props();
</script>

<PromptInput bind:value>
  <PromptInputTextarea aria-label="Speech prompt" />
  <PromptInputSpeechButton {ontranscriptionchange} />
</PromptInput>
