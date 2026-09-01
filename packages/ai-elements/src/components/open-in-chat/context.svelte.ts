import { createContext } from 'svelte';
export interface OpenInContextValue { readonly query: string; readonly open: boolean; setOpen(open: boolean): void; }
const [getContext, setContext] = createContext<OpenInContextValue>();
export function provideOpenInContext(value: OpenInContextValue): void { setContext(value); }
export function useOpenInContext(): OpenInContextValue { return getContext(); }
