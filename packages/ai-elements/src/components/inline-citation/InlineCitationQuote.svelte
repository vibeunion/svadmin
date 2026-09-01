<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLQuoteElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<blockquote {...rest} class={cn('m-0 border-l-2 border-border pl-3 text-sm italic text-muted-foreground', className)} data-slot="inline-citation-quote">{@render children?.()}</blockquote>
