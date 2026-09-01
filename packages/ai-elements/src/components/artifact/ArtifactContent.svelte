<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>

<div {...rest} class={cn('svadmin-ai-artifact-part__content', className)} data-slot="artifact-content">{@render children?.()}</div>

<style>.svadmin-ai-artifact-part__content { min-width: 0; flex: 1; overflow: auto; padding: 1rem; }</style>
