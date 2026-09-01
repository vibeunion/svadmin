<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  export type ModelSelectorItemProps = Omit<HTMLButtonAttributes, 'children' | 'class' | 'onclick' | 'onselect' | 'value'> & {
    value: string;
    text?: string;
    keywords?: string[];
    class?: string;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
    onselect?: (value: string) => void;
  };
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { cn } from '../../utils.js';
  import { useModelSelectorContext } from './context.svelte.js';

  let {
    value,
    text,
    keywords = [],
    class: className = '',
    children,
    onclick,
    onselect,
    disabled = false,
    type = 'button',
    ...rest
  }: ModelSelectorItemProps = $props();
  const context = useModelSelectorContext('ModelSelectorItem');
  const id = $props.id();
  let element = $state<HTMLButtonElement | null>(null);
  const isDisabled = $derived(Boolean(disabled));
  const searchText = $derived([text ?? element?.textContent ?? '', ...keywords].join(' '));
  const visible = $derived(context.isItemVisible({ value, text: searchText }));

  function select(): void {
    if (isDisabled) return;
    onselect?.(value);
    context.selectValue(value);
  }

  function handleClick(event: MouseEvent): void {
    select();
    onclick?.(event);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End' || event.key === 'Escape') {
      context.handleNavigationKey(event);
    }
  }

  $effect(() => {
    const registration = {
      id,
      value,
      disabled: isDisabled,
      text: searchText,
      get element() { return element; },
      select,
    };
    return untrack(() => context.registerItem(registration));
  });
</script>

<button
  bind:this={element}
  {...rest}
  {id}
  {type}
  disabled={isDisabled}
  hidden={!visible}
  class={cn('svadmin-ai-model-selector-item', context.activeId === id && 'svadmin-ai-model-selector-item--active', className)}
  data-slot="model-selector-item"
  role="option"
  tabindex="-1"
  aria-selected={context.selectedValue === value}
  onclick={handleClick}
  onmouseenter={() => { if (!isDisabled) context.setActiveId(id); }}
  onkeydown={handleKeydown}
>
  {@render children?.()}
</button>

<style>
  .svadmin-ai-model-selector-item { display: flex; width: 100%; min-width: 0; align-items: center; gap: .5rem; padding: .5rem; border: 0; border-radius: min(var(--radius, .5rem), .375rem); background: transparent; color: var(--foreground, currentColor); font: inherit; font-size: .8125rem; text-align: left; cursor: pointer; }
  .svadmin-ai-model-selector-item:hover:not(:disabled), .svadmin-ai-model-selector-item--active { background: var(--muted, transparent); }
  .svadmin-ai-model-selector-item:disabled { cursor: not-allowed; opacity: .45; }
  .svadmin-ai-model-selector-item:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
</style>
