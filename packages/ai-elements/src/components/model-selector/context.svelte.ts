import { createContext } from 'svelte';

export interface ModelSelectorItemRegistration {
  readonly id: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly text: string;
  readonly element: HTMLElement | null;
  select(): void;
}

export interface ModelSelectorContextValue {
  readonly open: boolean;
  readonly query: string;
  readonly activeId: string | undefined;
  readonly selectedValue: string | undefined;
  readonly visibleCount: number;
  readonly contentId: string;
  readonly listId: string;
  readonly titleId: string;
  setOpen(open: boolean): void;
  setQuery(query: string): void;
  setActiveId(id: string | undefined): void;
  selectValue(value: string): void;
  setTriggerElement(element: HTMLElement | null): void;
  setContentElement(element: HTMLElement | null): void;
  setInputElement(element: HTMLInputElement | null): void;
  registerItem(item: ModelSelectorItemRegistration): () => void;
  isItemVisible(item: Pick<ModelSelectorItemRegistration, 'text' | 'value'>): boolean;
  moveActive(direction: 1 | -1 | 'first' | 'last'): void;
  selectActive(): void;
  handleNavigationKey(event: KeyboardEvent): void;
}

const [getModelSelectorContext, setModelSelectorContext] = createContext<ModelSelectorContextValue>();

export function provideModelSelectorContext(value: ModelSelectorContextValue): void {
  setModelSelectorContext(value);
}

export function useModelSelectorContext(component = 'ModelSelector component'): ModelSelectorContextValue {
  const context = getModelSelectorContext();
  if (!context) throw new Error(`${component} must be used within <ModelSelector>`);
  return context;
}
