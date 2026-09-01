<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<header {...rest} class={cn('svadmin-ai-plan-part__header', className)} data-slot="plan-header">{@render children?.()}</header>
<style>.svadmin-ai-plan-part__header { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; border-bottom: 1px solid var(--border, currentColor); padding: 1rem; }</style>
