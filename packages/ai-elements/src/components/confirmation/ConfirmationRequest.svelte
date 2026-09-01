<script lang="ts">
  import type { Snippet } from 'svelte';
  import { isConfirmationRequestState, useConfirmationContext } from './context.svelte.js';

  let { children }: { children?: Snippet } = $props();
  const confirmation = useConfirmationContext('ConfirmationRequest');
</script>

{#if isConfirmationRequestState(confirmation.state)}{@render children?.()}{/if}
