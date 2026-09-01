<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  export type ModelSelectorListProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'onkeydown'> & { class?: string; children?: Snippet; onkeydown?: (event: KeyboardEvent) => void };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { useModelSelectorContext } from './context.svelte.js';
  let { class: className = '', children, onkeydown, ...rest }: ModelSelectorListProps = $props();
  const context = useModelSelectorContext('ModelSelectorList');

  function handleKeydown(event: KeyboardEvent): void {
    context.handleNavigationKey(event);
    onkeydown?.(event);
  }
</script>

<div {...rest} id={context.listId} class={cn('svadmin-ai-model-selector-list', className)} data-slot="model-selector-list" role="listbox" tabindex="-1" onkeydown={handleKeydown}>
  {@render children?.()}
</div>

<style>
  .svadmin-ai-model-selector-list { display: grid; max-height: min(24rem, 60vh); overflow: auto; padding: .125rem; }
  .svadmin-ai-model-selector-list:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
