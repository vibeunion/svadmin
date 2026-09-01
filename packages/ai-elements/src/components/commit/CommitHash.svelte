<script lang="ts">
  import type { Snippet } from 'svelte'; import { GitCommit } from '@lucide/svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>
<span class={cn('inline-flex items-center gap-1 font-mono text-xs', className)} {...rest}><GitCommit size={12} aria-hidden="true" />{@render children?.()}</span>
