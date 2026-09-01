<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<footer {...rest} class={cn('svadmin-ai-plan-part__footer', className)} data-slot="plan-footer">{@render children?.()}</footer>
<style>.svadmin-ai-plan-part__footer { display: flex; align-items: center; gap: .5rem; border-top: 1px solid var(--border, currentColor); padding: .75rem 1rem; }</style>
