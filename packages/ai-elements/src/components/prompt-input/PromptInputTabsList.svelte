<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<div {...rest} class={cn('flex items-center gap-1 border-b border-border', className)} role="tablist" data-slot="prompt-input-tabs-list">{@render children?.()}</div>
