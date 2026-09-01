import { createContext } from 'svelte';

export interface CodeBlockContextValue {
  readonly code: string;
}

export interface CodeBlockLanguageSelectorContextValue {
  readonly value: string;
  readonly open: boolean;
  setValue(value: string): void;
  setOpen(open: boolean): void;
}

const [getCodeBlockContext, setCodeBlockContext] = createContext<CodeBlockContextValue>();
const [getLanguageSelectorContext, setLanguageSelectorContext] = createContext<CodeBlockLanguageSelectorContextValue>();

export function provideCodeBlockContext(value: CodeBlockContextValue): void { setCodeBlockContext(value); }
export function useCodeBlockContext(): CodeBlockContextValue { return getCodeBlockContext(); }
export function provideCodeBlockLanguageSelectorContext(value: CodeBlockLanguageSelectorContextValue): void { setLanguageSelectorContext(value); }
export function useCodeBlockLanguageSelectorContext(): CodeBlockLanguageSelectorContextValue { return getLanguageSelectorContext(); }
