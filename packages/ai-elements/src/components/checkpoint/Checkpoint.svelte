<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> & {
    class?: string;
    children?: Snippet;
  };

  let { class: className = '', children, ...rest }: Props = $props();
</script>

<div
  {...rest}
  class={cn('svadmin-ai svadmin-ai-checkpoint', className)}
  data-slot="checkpoint"
>
  {@render children?.()}
  <span class="svadmin-ai-checkpoint__separator" aria-hidden="true"></span>
</div>

<style>
  .svadmin-ai-checkpoint {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.125rem;
    overflow: hidden;
    color: var(--muted-foreground, currentColor);
  }

  .svadmin-ai-checkpoint__separator {
    min-width: 1rem;
    height: 1px;
    flex: 1;
    background: var(--border, currentColor);
  }
</style>
