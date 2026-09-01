<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { usePlanContext } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLHeadingElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
  const plan = usePlanContext('PlanTitle');
</script>
<h3 {...rest} class={cn('svadmin-ai-plan-part__title', plan.isStreaming && 'svadmin-ai__streaming', className)} data-slot="plan-title">{@render children?.()}</h3>
<style>.svadmin-ai-plan-part__title { margin: 0; font-size: .95rem; font-weight: 650; }</style>
