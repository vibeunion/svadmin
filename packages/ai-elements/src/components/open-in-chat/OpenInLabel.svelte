<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<div class={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)} {...rest}>{@render children?.()}</div>
