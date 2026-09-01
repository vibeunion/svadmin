<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> & {
    align?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
    class?: string;
    children?: Snippet;
  };

  let { align = 'inline-start', class: className = '', children, ...rest }: Props = $props();
</script>

<div
  {...rest}
  class={cn('svadmin-ai-snippet-addon', className)}
  data-slot="snippet-addon"
  data-align={align}
>
  {@render children?.()}
</div>

<style>
  .svadmin-ai-snippet-addon { display: inline-flex; flex: none; align-items: center; justify-content: center; padding-inline: 0.25rem; color: var(--muted-foreground, currentColor); }
  .svadmin-ai-snippet-addon[data-align='inline-end'] { margin-inline-start: auto; }
</style>
