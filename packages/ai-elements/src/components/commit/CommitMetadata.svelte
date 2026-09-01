<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<div class={cn('flex flex-wrap items-center gap-2 text-xs text-muted-foreground', className)} {...rest}>{@render children?.()}</div>
