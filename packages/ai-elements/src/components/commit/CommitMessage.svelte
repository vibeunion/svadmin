<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<span class={cn('text-sm font-medium', className)} {...rest}>{@render children?.()}</span>
