<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<HTMLAttributes<HTMLParagraphElement>, 'children' | 'class'> & {
    class?: string;
    children?: Snippet;
  };

  let { class: className = '', children, ...rest }: Props = $props();
</script>

<p {...rest} class={cn('svadmin-ai-confirmation__title', className)} data-slot="confirmation-title">
  {@render children?.()}
</p>

<style>
  .svadmin-ai-confirmation__title { margin: 0; color: var(--foreground, currentColor); font-size: 0.875rem; line-height: 1.45; }
</style>
