<script lang="ts">
  import type { Snippet } from 'svelte'; import type { HTMLAttributes } from 'svelte/elements'; import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; heading?: string; }
  let { class: className = '', children, heading, ...rest }: Props = $props();
</script>
<div {...rest} class={cn('grid gap-0.5 p-1', className)} role="group" data-slot="prompt-input-command-group">{#if heading}<h3 class="px-2 py-1 text-xs font-medium text-muted-foreground">{heading}</h3>{/if}{@render children?.()}</div>
