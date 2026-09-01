<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<div class={cn('mt-3 border-t border-border pt-3', className)} {...rest}>{@render children?.()}</div>
