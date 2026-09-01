<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLLiAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';
  interface Props extends Omit<HTMLLiAttributes, 'children' | 'class'> { class?: string; children?: Snippet; }
  let { class: className = '', children, ...rest }: Props = $props();
</script>
<li {...rest} class={cn('svadmin-ai-queue-part__item', className)} data-slot="queue-item">{@render children?.()}</li>
<style>.svadmin-ai-queue-part__item { display: flex; min-width: 0; flex-direction: column; gap: .25rem; border-radius: min(var(--radius, .5rem), .5rem); padding: .45rem .6rem; font-size: .82rem; }.svadmin-ai-queue-part__item:hover { background: var(--muted, transparent); }</style>
