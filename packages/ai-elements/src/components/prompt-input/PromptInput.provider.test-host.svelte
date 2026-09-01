<script lang="ts">
  import type { PromptInputSubmitDetail } from './PromptInput.svelte';
  import { PromptInput, PromptInputProvider } from './index.js';

  let {
    multiple = false,
    onsubmit,
  }: {
    multiple?: boolean;
    onsubmit?: (detail: PromptInputSubmitDetail) => void | Promise<void>;
  } = $props();
</script>

<PromptInputProvider>
  <PromptInput {multiple} {onsubmit} />
</PromptInputProvider>
