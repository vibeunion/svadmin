<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<div class={cn('flex items-center justify-between gap-3 border-b border-border px-4 py-3', className)} {...rest}>{@render children?.()}</div>
