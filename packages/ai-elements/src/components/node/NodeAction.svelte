<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> & { class?: string; children?: Snippet };
  let { class: className = '', children, ...rest }: Props = $props();
</script>

<div {...rest} class={cn('svadmin-ai-node__action', className)} data-slot="node-action">
  {@render children?.()}
</div>

<style>
  .svadmin-ai-node__action { position: absolute; top: 0.5rem; right: 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem; }
</style>
