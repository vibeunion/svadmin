<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<div {...rest} class={cn('svadmin-ai-plan-part__action', className)} data-slot="plan-action">{@render children?.()}</div>
<style>.svadmin-ai-plan-part__action { display: flex; align-items: center; gap: .35rem; }</style>
