<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js';
  let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>
<div class={cn('flex min-h-9 items-center justify-between gap-3 border-b border-border bg-muted/80 px-3 py-2 text-xs text-muted-foreground', className)} {...rest}>{@render children?.()}</div>
