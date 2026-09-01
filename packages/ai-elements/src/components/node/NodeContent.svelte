<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> & { class?: string; children?: Snippet };
  let { class: className = '', children, ...rest }: Props = $props();
</script>

<div {...rest} class={cn('svadmin-ai-node__content', className)} data-slot="node-content">
  {@render children?.()}
</div>

<style>
  .svadmin-ai-node__content { min-width: 0; padding: 0.75rem; }
</style>
