<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { usePlanContext } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
  const plan = usePlanContext('PlanContent');
</script>
{#if plan.open}<div {...rest} class={cn('svadmin-ai-plan-part__content', className)} data-slot="plan-content">{@render children?.()}</div>{/if}
<style>.svadmin-ai-plan-part__content { display: grid; gap: .75rem; padding: 1rem; }</style>
