<script module lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  export interface ModelOption {
    id: string;
    name: string;
    description?: string;
    provider?: string;
    group?: string;
    icon?: string;
    disabled?: boolean;
  }

  export type ModelSelectorProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'onchange'> & {
    options?: ModelOption[];
    selectedId?: string;
    open?: boolean;
    defaultOpen?: boolean;
    placeholder?: string;
    label?: string;
    searchPlaceholder?: string;
    emptyLabel?: string;
    disabled?: boolean;
    class?: string;
    children?: Snippet;
    onchange?: (option: ModelOption) => void;
    onvaluechange?: (value: string) => void;
    onopenchange?: (open: boolean) => void;
  };
</script>

<script lang="ts">
  import { Check, ChevronsUpDown, Cpu, Search, X } from '@lucide/svelte';
  import { cn } from '../../utils.js';
  import { provideModelSelectorContext, type ModelSelectorItemRegistration } from './context.svelte.js';

  let {
    options,
    selectedId = $bindable<string | undefined>(),
    defaultOpen = false,
    open = $bindable(defaultOpen),
    placeholder = 'Select a model',
    label = 'Model',
    searchPlaceholder = 'Search models',
    emptyLabel = 'No matching models.',
    disabled = false,
    class: className = '',
    children,
    onchange,
    onvaluechange,
    onopenchange,
    ...rest
  }: ModelSelectorProps = $props();

  const id = $props.id();
  let query = $state('');
  let activeId = $state<string | undefined>();
  let triggerElement = $state<HTMLElement | null>(null);
  let contentElement = $state<HTMLElement | null>(null);
  let inputElement = $state<HTMLInputElement | null>(null);
  let items = $state<ModelSelectorItemRegistration[]>([]);
  let previousOpen = false;
  let returnFocusElement: HTMLElement | null = null;
  const currentOptions = $derived(options ?? []);
  const currentOpen = $derived(open);
  const selected = $derived(currentOptions.find((option) => option.id === selectedId));
  const filteredOptions = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return currentOptions;
    return currentOptions.filter((option) => [option.name, option.provider, option.description, option.group].filter(Boolean).join(' ').toLowerCase().includes(needle));
  });
  const compoundMode = $derived(options === undefined && Boolean(children));

  function isItemVisible(item: Pick<ModelSelectorItemRegistration, 'text' | 'value'>): boolean {
    const needle = query.trim().toLowerCase();
    return !needle || `${item.value} ${item.text}`.toLowerCase().includes(needle);
  }

  function visibleItems(): ModelSelectorItemRegistration[] {
    return items
      .filter((item) => !item.disabled && isItemVisible(item))
      .slice()
      .sort((left, right) => {
        if (!left.element || !right.element) return 0;
        return left.element.compareDocumentPosition(right.element) & 4 ? -1 : 1;
      });
  }

  function enabledDataOptions(): ModelOption[] {
    return filteredOptions.filter((option) => !option.disabled);
  }

  function optionDomId(option: ModelOption): string {
    return `${id}-option-${encodeURIComponent(option.id)}`;
  }

  function focusInitial(): void {
    queueMicrotask(() => {
      const target = inputElement ?? contentElement?.querySelector<HTMLElement>('[autofocus], input, [role="option"]:not([aria-disabled="true"]), button:not(:disabled)') ?? contentElement;
      target?.focus({ preventScroll: true });
    });
  }

  function setOpen(next: boolean): void {
    if (disabled && next) return;
    if (next === currentOpen) return;
    open = next;
    onopenchange?.(next);
  }

  function setQuery(next: string): void {
    query = next;
    ensureActive(true);
  }

  function setActiveId(next: string | undefined): void {
    activeId = next;
    queueMicrotask(() => document.getElementById(next ?? '')?.scrollIntoView?.({ block: 'nearest' }));
  }

  function selectValue(value: string): void {
    selectedId = value;
    onvaluechange?.(value);
    const option = currentOptions.find((candidate) => candidate.id === value);
    if (option) onchange?.(option);
    setOpen(false);
  }

  function registerItem(item: ModelSelectorItemRegistration): () => void {
    items = [...items.filter((candidate) => candidate.id !== item.id), item];
    queueMicrotask(() => ensureActive());
    return () => {
      items = items.filter((candidate) => candidate.id !== item.id);
      if (activeId === item.id) queueMicrotask(() => ensureActive(true));
    };
  }

  function ensureActive(force = false): void {
    const registered = visibleItems();
    if (registered.length > 0) {
      if (!force && registered.some((item) => item.id === activeId)) return;
      const selectedItem = registered.find((item) => item.value === selectedId);
      activeId = (selectedItem ?? registered[0])?.id;
      return;
    }

    const candidates = enabledDataOptions();
    if (!force && candidates.some((option) => option.id === activeId)) return;
    const next = candidates.find((option) => option.id === selectedId) ?? candidates[0];
    activeId = next ? optionDomId(next) : undefined;
  }

  function moveActive(direction: 1 | -1 | 'first' | 'last'): void {
    const registered = visibleItems();
    const ids = registered.length > 0 ? registered.map((item) => item.id) : enabledDataOptions().map(optionDomId);
    if (ids.length === 0) return;
    if (direction === 'first') setActiveId(ids[0]);
    else if (direction === 'last') setActiveId(ids.at(-1));
    else {
      const currentIndex = ids.indexOf(activeId ?? '');
      const nextIndex = currentIndex < 0 ? (direction === 1 ? 0 : ids.length - 1) : (currentIndex + direction + ids.length) % ids.length;
      setActiveId(ids[nextIndex]);
    }
  }

  function selectActive(): void {
    const registered = visibleItems().find((item) => item.id === activeId);
    if (registered) {
      registered.select();
      return;
    }
    const option = enabledDataOptions().find((candidate) => optionDomId(candidate) === activeId);
    if (option) selectValue(option.id);
  }

  function handleNavigationKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveActive('first');
    } else if (event.key === 'End') {
      event.preventDefault();
      moveActive('last');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectActive();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  }

  function handleTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  }

  function trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !contentElement) return;
    const focusable = [...contentElement.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
    if (focusable.length === 0) {
      event.preventDefault();
      contentElement.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  function setInputElement(element: HTMLInputElement | null): void {
    inputElement = element;
    if (element && currentOpen) focusInitial();
  }

  function setContentElement(element: HTMLElement | null): void {
    contentElement = element;
    if (element && currentOpen) focusInitial();
  }

  provideModelSelectorContext({
    get open() { return currentOpen; },
    get query() { return query; },
    get activeId() { return activeId; },
    get selectedValue() { return selectedId; },
    get visibleCount() { return items.length > 0 ? visibleItems().length : filteredOptions.length; },
    contentId: `${id}-content`,
    listId: `${id}-list`,
    titleId: `${id}-title`,
    setOpen,
    setQuery,
    setActiveId,
    selectValue,
    setTriggerElement(element) { triggerElement = element; },
    setContentElement,
    setInputElement,
    registerItem,
    isItemVisible,
    moveActive,
    selectActive,
    handleNavigationKey,
  });

  $effect(() => {
    if (!currentOpen) return;
    void query;
    void filteredOptions;
    queueMicrotask(() => ensureActive());
  });

  $effect(() => {
    const nextOpen = currentOpen;
    if (nextOpen === previousOpen) return;

    if (nextOpen) {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        returnFocusElement = document.activeElement;
      }
      queueMicrotask(() => {
        ensureActive();
        focusInitial();
      });
    } else {
      query = '';
      activeId = undefined;
      const focusTarget = triggerElement ?? returnFocusElement;
      queueMicrotask(() => focusTarget?.focus({ preventScroll: true }));
    }
    previousOpen = nextOpen;
  });
</script>

{#if compoundMode}
  <div {...rest} class={cn('svadmin-ai-model-selector', className)} data-slot="model-selector" data-state={currentOpen ? 'open' : 'closed'}>
    {@render children?.()}
  </div>
{:else}
  <div {...rest} class={cn('svadmin-ai-model-selector svadmin-ai-model-selector--data', className)} data-slot="model-selector" data-state={currentOpen ? 'open' : 'closed'}>
    <span class="svadmin-ai-model-selector__label">{label}</span>
    <button
      bind:this={triggerElement}
      class="svadmin-ai-model-selector__trigger"
      type="button"
      {disabled}
      aria-label={`${label}: ${selected?.name ?? placeholder}`}
      aria-haspopup="dialog"
      aria-expanded={currentOpen}
      aria-controls={`${id}-content`}
      onclick={() => setOpen(!currentOpen)}
      onkeydown={handleTriggerKeydown}
    >
      <span class="svadmin-ai-model-selector__selected-icon" aria-hidden="true">{#if selected?.icon}{selected.icon}{:else}<Cpu size={16} />{/if}</span>
      <span class="svadmin-ai-model-selector__selected-copy">{#if selected}<strong>{selected.name}</strong>{#if selected.provider}<small>{selected.provider}</small>{/if}{:else}<span class="svadmin-ai-model-selector__placeholder">{placeholder}</span>{/if}</span>
      <ChevronsUpDown size={15} aria-hidden="true" />
    </button>

    {#if currentOpen}
      <div class="svadmin-ai-model-selector__backdrop" role="presentation" onpointerdown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div bind:this={contentElement} id={`${id}-content`} class="svadmin-ai-model-selector__dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabindex="-1" onkeydown={trapFocus}>
          <h2 id={`${id}-title`} class="svadmin-ai__sr-only">{label}</h2>
          <button class="svadmin-ai-model-selector__close" type="button" aria-label="Close model selector" onclick={() => setOpen(false)}><X aria-hidden="true" /></button>
          <div class="svadmin-ai-model-selector__search-wrap">
            <Search size={15} aria-hidden="true" />
            <input
              bind:this={inputElement}
              class="svadmin-ai-model-selector__search"
              type="search"
              value={query}
              placeholder={searchPlaceholder}
              role="combobox"
              aria-label={searchPlaceholder}
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={`${id}-list`}
              aria-activedescendant={activeId}
              oninput={(event) => setQuery(event.currentTarget.value)}
              onkeydown={handleNavigationKey}
            />
          </div>
          <div id={`${id}-list`} class="svadmin-ai-model-selector__options" role="listbox" aria-label={label}>
            {#each filteredOptions as option (option.id)}
              <button
                id={optionDomId(option)}
                class={cn('svadmin-ai-model-selector__option', activeId === optionDomId(option) && 'svadmin-ai-model-selector__option--active')}
                type="button"
                role="option"
                aria-selected={selectedId === option.id}
                disabled={option.disabled}
                onclick={() => selectValue(option.id)}
                onmouseenter={() => { if (!option.disabled) setActiveId(optionDomId(option)); }}
              >
                <span class="svadmin-ai-model-selector__option-icon" aria-hidden="true">{#if option.icon}{option.icon}{:else}<Cpu size={15} />{/if}</span>
                <span class="svadmin-ai-model-selector__option-copy"><strong title={option.name}>{option.name}</strong>{#if option.description}<small title={option.description}>{option.description}</small>{/if}{#if option.provider}<small class="svadmin-ai-model-selector__provider">{option.provider}</small>{/if}</span>
                {#if selectedId === option.id}<Check size={15} aria-hidden="true" />{/if}
              </button>
            {:else}
              <p class="svadmin-ai-model-selector__empty">{emptyLabel}</p>
            {/each}
          </div>
          {#if children}<div class="svadmin-ai-model-selector__footer">{@render children()}</div>{/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .svadmin-ai-model-selector { position: relative; color: var(--foreground, currentColor); }
  .svadmin-ai-model-selector--data { display: grid; min-width: 12rem; gap: .4rem; }
  .svadmin-ai-model-selector__label { color: var(--muted-foreground, currentColor); font-size: .73rem; font-weight: 550; }
  .svadmin-ai-model-selector__trigger { display: flex; width: 100%; min-height: 2.5rem; align-items: center; gap: .55rem; padding: .5rem .65rem; border: 1px solid var(--input, var(--border, currentColor)); border-radius: min(var(--radius, .5rem), .5rem); background: var(--background, transparent); color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .svadmin-ai-model-selector__trigger:hover:not(:disabled) { border-color: var(--ring, var(--primary, currentColor)); }
  .svadmin-ai-model-selector__trigger:focus-visible, .svadmin-ai-model-selector__option:focus-visible, .svadmin-ai-model-selector__search:focus-visible, .svadmin-ai-model-selector__close:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }
  .svadmin-ai-model-selector__trigger:disabled { cursor: not-allowed; opacity: .5; }
  .svadmin-ai-model-selector__selected-icon, .svadmin-ai-model-selector__option-icon { display: inline-flex; flex: none; align-items: center; justify-content: center; color: var(--primary, currentColor); }
  .svadmin-ai-model-selector__selected-copy { display: grid; min-width: 0; flex: 1; gap: .05rem; }
  .svadmin-ai-model-selector__selected-copy strong, .svadmin-ai-model-selector__option-copy strong { overflow: hidden; font-size: .8rem; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-model-selector__selected-copy small, .svadmin-ai-model-selector__option-copy small { overflow: hidden; color: var(--muted-foreground, currentColor); font-size: .7rem; text-overflow: ellipsis; white-space: nowrap; }
  .svadmin-ai-model-selector__placeholder { color: var(--muted-foreground, currentColor); font-size: .8rem; }
  .svadmin-ai-model-selector__backdrop { position: fixed; z-index: 70; inset: 0; display: grid; place-items: center; padding: 1rem; background: color-mix(in oklch, var(--background, transparent) 62%, transparent); }
  .svadmin-ai-model-selector__dialog { position: relative; display: grid; width: min(32rem, 100%); max-height: min(34rem, calc(100vh - 2rem)); gap: .5rem; padding: .75rem; border: 1px solid var(--border, currentColor); border-radius: min(var(--radius, .5rem), .5rem); background: var(--popover, var(--card, var(--background, transparent))); color: var(--popover-foreground, var(--foreground, currentColor)); box-shadow: 0 1rem 3rem color-mix(in oklch, var(--foreground, currentColor) 18%, transparent); }
  .svadmin-ai-model-selector__close { position: absolute; z-index: 1; top: .5rem; right: .5rem; display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; border: 0; border-radius: min(var(--radius, .5rem), .375rem); background: transparent; color: var(--muted-foreground, currentColor); cursor: pointer; }
  .svadmin-ai-model-selector__close:hover { background: var(--muted, transparent); color: var(--foreground, currentColor); }
  .svadmin-ai-model-selector__close :global(svg) { width: 1rem; height: 1rem; }
  .svadmin-ai-model-selector__search-wrap { display: flex; align-items: center; gap: .4rem; margin-right: 2.25rem; padding: 0 .55rem; border: 1px solid var(--input, var(--border, currentColor)); border-radius: min(var(--radius, .5rem), .5rem); color: var(--muted-foreground, currentColor); }
  .svadmin-ai-model-selector__search { width: 100%; min-height: 2.5rem; border: 0; outline: 0; background: transparent; color: var(--foreground, currentColor); font: inherit; font-size: .8125rem; }
  .svadmin-ai-model-selector__options { display: grid; max-height: 24rem; overflow: auto; }
  .svadmin-ai-model-selector__option { display: flex; width: 100%; align-items: flex-start; gap: .5rem; padding: .5rem; border: 0; border-radius: min(var(--radius, .5rem), .375rem); background: transparent; color: var(--foreground, currentColor); font: inherit; text-align: left; cursor: pointer; }
  .svadmin-ai-model-selector__option:hover:not(:disabled), .svadmin-ai-model-selector__option--active { background: var(--muted, transparent); }
  .svadmin-ai-model-selector__option:disabled { cursor: not-allowed; opacity: .45; }
  .svadmin-ai-model-selector__option-copy { display: grid; min-width: 0; flex: 1; gap: .12rem; }
  .svadmin-ai-model-selector__provider { color: var(--primary, currentColor) !important; }
  .svadmin-ai-model-selector__empty { margin: 0; padding: 1rem .5rem; color: var(--muted-foreground, currentColor); font-size: .8125rem; text-align: center; }
  .svadmin-ai-model-selector__footer { border-top: 1px solid var(--border, currentColor); padding-top: .5rem; }
</style>
