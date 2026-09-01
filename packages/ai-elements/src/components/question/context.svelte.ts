import { createContext } from 'svelte';

export type QuestionSelectionMode = 'single' | 'multiple';
export interface QuestionValue { selectedValues: readonly string[]; text: string; }
export interface QuestionResponse { selectedValues: readonly string[]; text?: string; }
export interface QuestionContextValue {
  readonly value: QuestionValue;
  readonly disabled: boolean;
  readonly busy: boolean;
  readonly selectionMode: QuestionSelectionMode;
  setText(text: string): void;
  toggleValue(value: string): void;
}
const [getContext, setContext] = createContext<QuestionContextValue>();
export function provideQuestionContext(value: QuestionContextValue): void { setContext(value); }
export function useQuestionContext(): QuestionContextValue { return getContext(); }
