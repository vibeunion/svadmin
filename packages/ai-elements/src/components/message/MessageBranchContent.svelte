<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export type MessageBranchContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> & {
    count?: number;
    branches?: Snippet[];
    class?: string;
    children?: Snippet<[number]>;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { useMessageBranch } from './context.svelte.js';

  let { count, branches, class: className = '', children, ...rest }: MessageBranchContentProps = $props();
  const branch = useMessageBranch('MessageBranchContent');
  const branchCount = $derived(count ?? branches?.length ?? branch.totalBranches);
  const selectedBranch = $derived(branches?.[branch.currentBranch]);

  $effect(() => branch.setTotalBranches(branchCount));
</script>

<div {...rest} class={cn('svadmin-ai-message-branch-content', className)} data-slot="message-branch-content" data-branch={branch.currentBranch}>
  {#if selectedBranch}
    {@render selectedBranch()}
  {:else}
    {@render children?.(branch.currentBranch)}
  {/if}
</div>

<style>
  .svadmin-ai-message-branch-content { display: grid; gap: 0.5rem; overflow: hidden; }
</style>
