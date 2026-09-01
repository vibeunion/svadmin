<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<div class={cn('flex h-auto items-center gap-0 bg-transparent p-0', className)} role="tablist" {...rest}>{@render children?.()}</div>
