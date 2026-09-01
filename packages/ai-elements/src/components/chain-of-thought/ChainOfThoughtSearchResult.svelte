<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js';
  let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>
<span class={cn('inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground', className)} {...rest}>{@render children?.()}</span>
