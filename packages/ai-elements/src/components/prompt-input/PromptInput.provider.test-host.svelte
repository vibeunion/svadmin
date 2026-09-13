<script lang="ts">
  import { definedOptions } from '@svadmin/core/options';

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
  <PromptInput {multiple} {...definedOptions({ "onsubmit": onsubmit })} />
</PromptInputProvider>
