<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type ModelSelectorTriggerProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick'> & {
    class?: string;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
  };
</script>

<script lang="ts">
  import { cn } from '../../utils.js';
  import { useModelSelectorContext } from './context.svelte.js';

  let { class: className = '', children, onclick, type = 'button', ...rest }: ModelSelectorTriggerProps = $props();
  const context = useModelSelectorContext('ModelSelectorTrigger');
  let element = $state<HTMLButtonElement | null>(null);

  function handleClick(event: MouseEvent): void {
    context.setOpen(!context.open);
    onclick?.(event);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      context.setOpen(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      context.setOpen(false);
    }
  }

  $effect(() => {
    context.setTriggerElement(element);
    return () => context.setTriggerElement(null);
  });
</script>

<button
  bind:this={element}
  {...rest}
  {type}
  class={cn('svadmin-ai-model-selector-trigger', className)}
  data-slot="model-selector-trigger"
  aria-haspopup="dialog"
  aria-expanded={context.open}
  aria-controls={context.contentId}
  onclick={handleClick}
  onkeydown={handleKeydown}
>
  {@render children?.()}
</button>

<style>
  .svadmin-ai-model-selector-trigger { display: inline-flex; min-height: 2.25rem; align-items: center; justify-content: center; gap: .5rem; padding: .5rem .75rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .375rem); background: var(--background, transparent); color: var(--foreground, currentColor); font: inherit; cursor: pointer; }
  .svadmin-ai-model-selector-trigger:hover:not(:disabled) { background: var(--muted, transparent); }
  .svadmin-ai-model-selector-trigger:disabled { cursor: not-allowed; opacity: .5; }
  .svadmin-ai-model-selector-trigger:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
