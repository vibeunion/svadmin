<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<div class={cn('flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50', className)} {...rest}>{@render children?.()}</div>
