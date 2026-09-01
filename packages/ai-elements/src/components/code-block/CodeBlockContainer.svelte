<script lang="ts">
  import type { Snippet } from 'svelte'; import { cn } from '../../utils.js';
  let { language, class: className = '', children, ...rest }: { language: string; class?: string; children?: Snippet; [key: string]: unknown } = $props();
</script>
<div class={cn('svadmin-ai group relative w-full overflow-hidden rounded-md border border-border bg-background text-foreground', className)} data-language={language} style="content-visibility:auto;contain-intrinsic-size:auto 200px" {...rest}>{@render children?.()}</div>
