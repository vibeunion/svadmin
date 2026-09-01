<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils.js';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> & {
    class?: string;
    children?: Snippet;
    ariaLabel?: string;
  };

  let { class: className = '', children, ariaLabel = 'Suggestions', ...rest }: Props = $props();
</script>

<div
  class="svadmin-ai svadmin-ai-suggestions"
  role="list"
  aria-label={ariaLabel}
  data-slot="suggestions"
  {...rest}
>
  <div class={cn('svadmin-ai-suggestions__content', className)}>
    {@render children?.()}
  </div>
</div>

<style>
  .svadmin-ai-suggestions {
    width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
    white-space: nowrap;
  }

  .svadmin-ai-suggestions::-webkit-scrollbar { display: none; }
  .svadmin-ai-suggestions:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-suggestions__content { display: flex; width: max-content; flex-wrap: nowrap; align-items: center; gap: 0.5rem; }
</style>
