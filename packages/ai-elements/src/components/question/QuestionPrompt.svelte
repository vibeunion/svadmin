<script lang="ts">import type { Snippet } from 'svelte'; import { cn } from '../../utils.js'; let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();</script>
<p class={cn('m-0 text-sm font-medium', className)} {...rest}>{@render children?.()}</p>
