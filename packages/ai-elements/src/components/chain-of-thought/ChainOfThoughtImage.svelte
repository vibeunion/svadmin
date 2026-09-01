<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js';
  let { caption, class: className = '', children, ...rest }: { caption?: string; class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>
<figure class={cn('mt-2 space-y-2', className)} {...rest}>
  <div class="relative flex max-h-[22rem] items-center justify-center overflow-hidden rounded-lg bg-muted p-3">{@render children?.()}</div>
  {#if caption}<figcaption class="text-xs text-muted-foreground">{caption}</figcaption>{/if}
</figure>
