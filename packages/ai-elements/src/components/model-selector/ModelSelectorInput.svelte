<script module lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  export type ModelSelectorInputProps = Omit<HTMLInputAttributes, 'class' | 'oninput' | 'onkeydown' | 'value'> & {
    value?: string;
    class?: string;
    oninput?: (event: Event) => void;
    onkeydown?: (event: KeyboardEvent) => void;
  };
</script>

<script lang="ts">
  import { Search } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { useModelSelectorContext } from './context.svelte.js';

  let { value = $bindable<string | undefined>(), class: className = '', oninput, onkeydown, placeholder = 'Search models', ...rest }: ModelSelectorInputProps = $props();
  const context = useModelSelectorContext('ModelSelectorInput');
  let element = $state<HTMLInputElement | null>(null);

  function handleInput(event: Event): void {
    const next = (event.currentTarget as HTMLInputElement).value;
    if (value !== undefined) value = next;
    context.setQuery(next);
    oninput?.(event);
  }

  function handleKeydown(event: KeyboardEvent): void {
    context.handleNavigationKey(event);
    onkeydown?.(event);
  }

  $effect(() => {
    if (value !== undefined && value !== context.query) context.setQuery(value);
  });

  $effect(() => {
    context.setInputElement(element);
    return () => context.setInputElement(null);
  });
</script>

<label class={cn('svadmin-ai-model-selector-input', className)} data-slot="model-selector-input">
  <Search aria-hidden="true" />
  <input
    bind:this={element}
    {...rest}
    type="search"
    value={value ?? context.query}
    {placeholder}
    role="combobox"
    aria-label={rest['aria-label'] ?? placeholder}
    aria-autocomplete="list"
    aria-expanded={context.open}
    aria-controls={context.listId}
    aria-activedescendant={context.activeId}
    oninput={handleInput}
    onkeydown={handleKeydown}
  />
</label>

<style>
  .svadmin-ai-model-selector-input { display: flex; min-height: 2.75rem; align-items: center; gap: .5rem; margin-right: 2.25rem; padding: 0 .75rem; border: 1px solid var(--input, var(--border, currentColor)); border-radius: min(var(--radius, .5rem), .375rem); color: var(--muted-foreground, currentColor); }
  .svadmin-ai-model-selector-input :global(svg) { width: 1rem; height: 1rem; flex: none; }
  .svadmin-ai-model-selector-input input { width: 100%; min-width: 0; min-height: 2.5rem; border: 0; outline: 0; background: transparent; color: var(--foreground, currentColor); font: inherit; font-size: .8125rem; }
  .svadmin-ai-model-selector-input:focus-within { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
