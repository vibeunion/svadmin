<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<p class={cn('mt-2 text-sm text-muted-foreground', className)} {...rest}>{@render children?.()}</p>
