<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  import { usePlanContext } from './context.svelte.js';
  interface Props extends Omit<HTMLAttributes<HTMLParagraphElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
  const plan = usePlanContext('PlanDescription');
</script>
<p {...rest} class={cn('svadmin-ai-plan-part__description', plan.isStreaming && 'svadmin-ai__streaming', className)} data-slot="plan-description">{@render children?.()}</p>
<style>.svadmin-ai-plan-part__description { margin: 0; color: var(--muted-foreground, currentColor); font-size: .8rem; line-height: 1.45; }</style>
