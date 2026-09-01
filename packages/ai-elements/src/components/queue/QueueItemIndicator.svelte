<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'class'> { completed?: boolean; class?: string; }
  let { completed = false, class: className = '', ...rest }: Props = $props();
</script>
<span {...rest} class={cn('svadmin-ai-queue-part__indicator', completed && 'svadmin-ai-queue-part__indicator--complete', className)} aria-hidden="true" data-slot="queue-item-indicator"></span>
<style>.svadmin-ai-queue-part__indicator { display: inline-block; width: .65rem; height: .65rem; flex: none; border: 1px solid var(--muted-foreground, currentColor); border-radius: 50%; }.svadmin-ai-queue-part__indicator--complete { border-color: color-mix(in oklch, var(--muted-foreground, currentColor) 20%, transparent); background: color-mix(in oklch, var(--muted-foreground, currentColor) 12%, transparent); }</style>
