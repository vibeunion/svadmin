<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>
<div class={cn('space-y-4 p-4 pt-0', className)} {...rest}>{@render children?.()}</div>
