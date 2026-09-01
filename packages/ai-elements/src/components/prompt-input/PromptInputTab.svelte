<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; value?: string; active?: boolean; }
  let { class: className = '', children, value, active = false, ...rest }: Props = $props();
</script>
<div {...rest} class={cn('grid gap-2', className)} data-slot="prompt-input-tab" data-value={value} data-state={active ? 'active' : 'inactive'}>{@render children?.()}</div>
