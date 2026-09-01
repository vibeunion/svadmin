<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<HTMLAttributes<HTMLHeadingElement>, 'class' | 'children'> & { class?: string; children?: Snippet };
  let { class: className = '', children, ...rest }: Props = $props();
</script>

<h3 {...rest} class={cn('svadmin-ai-node__title', className)} data-slot="node-title">
  {@render children?.()}
</h3>

<style>
  .svadmin-ai-node__title { min-width: 0; margin: 0; overflow: hidden; color: var(--foreground, currentColor); font-size: 0.875rem; font-weight: 650; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
</style>
