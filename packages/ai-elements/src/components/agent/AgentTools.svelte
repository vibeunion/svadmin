<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  let { title = 'Tools', class: className = '', children, ...rest }: { title?: string; class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>
<div class={cn('space-y-2', className)} {...rest}>
  <span class="text-sm font-medium text-muted-foreground">{title}</span>
  <div class="overflow-hidden rounded-md border border-border">{@render children?.()}</div>
</div>
