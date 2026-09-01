<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { useMessageBranch } from './context.svelte.js';

  type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'class'> & { class?: string };
  let { class: className = '', ...rest }: Props = $props();
  const branch = useMessageBranch('MessageBranchPage');
</script>

<span {...rest} class={cn('svadmin-ai-message-branch-page', className)} data-slot="message-branch-page" aria-live="polite">
  {branch.currentBranch + 1} of {branch.totalBranches}
</span>

<style>
  .svadmin-ai-message-branch-page { display: inline-flex; min-height: 2rem; align-items: center; padding-inline: 0.375rem; color: var(--muted-foreground, currentColor); font-size: 0.75rem; font-variant-numeric: tabular-nums; }
</style>
