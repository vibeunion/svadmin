<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLAttributes<HTMLUListElement>, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<ul {...rest} class={cn('svadmin-ai-queue-part__list', className)} data-slot="queue-list">{@render children?.()}</ul>
<style>.svadmin-ai-queue-part__list { display: grid; max-height: 18rem; overflow: auto; gap: .2rem; margin: 0; padding: .25rem; list-style: none; }</style>
