<script lang="ts">
  import type { Snippet } from 'svelte';
  import { isConfirmationResponseState, useConfirmationContext } from './context.svelte.js';

  let { children }: { children?: Snippet } = $props();
  const confirmation = useConfirmationContext('ConfirmationRejected');
</script>

{#if confirmation.approval?.approved === false && isConfirmationResponseState(confirmation.state)}{@render children?.()}{/if}
