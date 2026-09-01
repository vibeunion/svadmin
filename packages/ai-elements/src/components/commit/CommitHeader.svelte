<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js';
  let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>
<summary class={cn('group flex cursor-pointer list-none items-center justify-between gap-4 p-3 text-left transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring', className)} {...rest}>{@render children?.()}</summary>
