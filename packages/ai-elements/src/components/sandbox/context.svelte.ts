import { createContext } from 'svelte';

export interface SandboxContextValue { readonly open: boolean; setOpen(open: boolean): void; }
export interface SandboxTabsContextValue {
  readonly value: string;
  setValue(value: string): void;
  tabId(value: string): string;
  panelId(value: string): string;
}
const [getSandbox, setSandbox] = createContext<SandboxContextValue>();
const [getTabs, setTabs] = createContext<SandboxTabsContextValue>();
export function provideSandboxContext(value: SandboxContextValue): void { setSandbox(value); }
export function useSandboxContext(): SandboxContextValue { return getSandbox(); }
export function provideSandboxTabsContext(value: SandboxTabsContextValue): void { setTabs(value); }
export function useSandboxTabsContext(): SandboxTabsContextValue { return getTabs(); }
