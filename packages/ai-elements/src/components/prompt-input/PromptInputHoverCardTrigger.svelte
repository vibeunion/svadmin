<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<span {...rest} class={cn('inline-flex', className)} data-slot="prompt-input-hover-card-trigger">{@render children?.()}</span>
