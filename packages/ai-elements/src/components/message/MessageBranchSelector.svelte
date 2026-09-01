<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { useMessageBranch } from './context.svelte.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & { class?: string; children?: Snippet };
  let { class: className = '', children, ...rest }: Props = $props();
  const branch = useMessageBranch('MessageBranchSelector');
</script>

{#if branch.totalBranches > 1}
  <div {...rest} class={cn('svadmin-ai-message-branch-selector', className)} data-slot="message-branch-selector">
    {@render children?.()}
  </div>
{/if}

<style>
  .svadmin-ai-message-branch-selector { display: inline-flex; width: fit-content; align-items: center; gap: 0.125rem; }
</style>
