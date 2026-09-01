import { getContext, hasContext, setContext } from 'svelte';

export interface VoiceSelectorItemRegistration {
  id: string;
  value: string;
  searchValue: string;
  disabled: boolean;
  select(): void;
}

export interface VoiceSelectorContextValue {
  readonly value: string | undefined;
  readonly open: boolean;
  readonly query: string;
  readonly activeId?: string;
  readonly visibleCount: number;
  setValue(value: string | undefined): void;
  setOpen(open: boolean): void;
  setQuery(query: string): void;
  register(item: VoiceSelectorItemRegistration): () => void;
  isVisible(searchValue: string): boolean;
  move(step: 1 | -1): void;
  selectActive(): void;
}

const VOICE_SELECTOR_CONTEXT = Symbol('svadmin.ai-elements.voice-selector');

export function provideVoiceSelector(value: VoiceSelectorContextValue): void {
  setContext(VOICE_SELECTOR_CONTEXT, value);
}

export function useVoiceSelector(): VoiceSelectorContextValue {
  const value = hasContext(VOICE_SELECTOR_CONTEXT) ? getContext<VoiceSelectorContextValue>(VOICE_SELECTOR_CONTEXT) : undefined;
  if (!value) throw new Error('VoiceSelector components must be used within VoiceSelector');
  return value;
}
