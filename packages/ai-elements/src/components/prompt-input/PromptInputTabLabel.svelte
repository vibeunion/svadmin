<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLHeadingElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<h3 {...rest} class={cn('mb-2 px-3 text-xs font-medium text-muted-foreground', className)} data-slot="prompt-input-tab-label">{@render children?.()}</h3>
