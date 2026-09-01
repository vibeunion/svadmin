<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<div class={cn('flex shrink-0 items-center gap-1 font-mono text-xs', className)} {...rest}>{@render children?.()}</div>
