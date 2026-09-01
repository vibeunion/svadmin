<script module lang="ts">
  import type { SpeechInputProps } from '../speech-input/SpeechInput.svelte';

  export type PromptInputSpeechButtonProps = Omit<SpeechInputProps, 'ontranscriptionchange'> & {
    ontranscriptionchange?: (text: string) => void;
  };
</script>

<script lang="ts">
  import SpeechInput from '../speech-input/SpeechInput.svelte';
  import { usePromptInputController } from './context.svelte.js';

  let { ontranscriptionchange, ...props }: PromptInputSpeechButtonProps = $props();
  const controller = usePromptInputController();

  function appendTranscript(transcript: string): void {
    if (!transcript) return;
    const current = controller.textInput.value;
    const separator = current.length > 0 && !/\s$/.test(current) && !/^\s/.test(transcript) ? ' ' : '';
    controller.textInput.setInput(`${current}${separator}${transcript}`);
    ontranscriptionchange?.(transcript);
  }
</script>

<SpeechInput {...props} ontranscriptionchange={appendTranscript} />
