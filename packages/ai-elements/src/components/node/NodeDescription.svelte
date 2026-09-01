<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<HTMLAttributes<HTMLParagraphElement>, 'class' | 'children'> & { class?: string; children?: Snippet };
  let { class: className = '', children, ...rest }: Props = $props();
</script>

<p {...rest} class={cn('svadmin-ai-node__description', className)} data-slot="node-description">
  {@render children?.()}
</p>

<style>
  .svadmin-ai-node__description { margin: 0.2rem 0 0; color: var(--muted-foreground, currentColor); font-size: 0.75rem; line-height: 1.4; }
</style>
