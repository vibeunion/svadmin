<script module lang="ts">export type CommitFileState = 'added' | 'modified' | 'deleted' | 'renamed';</script>
<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js';
  let { status, class: className = '', children, ...rest }: { status: CommitFileState; class?: string; children?: Snippet; [key: string]: unknown } = $props();
  const labels: Record<CommitFileState, string> = { added: 'A', modified: 'M', deleted: 'D', renamed: 'R' };
</script>
<span class={cn('font-mono text-xs font-medium', status === 'added' && 'text-success', status === 'deleted' && 'text-destructive', status === 'modified' && 'text-warning', status === 'renamed' && 'text-info', className)} data-status={status} {...rest}>{#if children}{@render children()}{:else}{labels[status]}{/if}</span>
