<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';

  let { class: className = '', children, ...rest }: { class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>

<div class={cn('svadmin-ai w-full rounded-md border border-border bg-background text-foreground', className)} {...rest}>
  {@render children?.()}
</div>
