<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { isConfirmationRequestState, useConfirmationContext } from './context.svelte.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & { class?: string; children?: Snippet };
  let { class: className = '', children, ...rest }: Props = $props();
  const confirmation = useConfirmationContext('ConfirmationActions');
</script>

{#if isConfirmationRequestState(confirmation.state)}
  <div {...rest} class={cn('svadmin-ai-confirmation-actions', className)} data-slot="confirmation-actions">
    {@render children?.()}
  </div>
{/if}

<style>
  .svadmin-ai-confirmation-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; align-self: flex-end; }
</style>
