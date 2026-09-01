<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils.js';
  let { text, title = 'Instructions', class: className = '', children, ...rest }: { text?: string; title?: string; class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>
<div class={cn('space-y-2', className)} {...rest}>
  <span class="text-sm font-medium text-muted-foreground">{title}</span>
  <div class="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
    {#if children}{@render children()}{:else}<p class="m-0 whitespace-pre-wrap">{text ?? ''}</p>{/if}
  </div>
</div>
