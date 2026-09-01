import { createContext } from 'svelte';

export interface MicSelectorContextValue {
  readonly devices: MediaDeviceInfo[];
  readonly value: string;
  readonly open: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  setValue(value: string): void;
  setOpen(open: boolean): void;
}

const [getMicSelectorContext, setMicSelectorContext] = createContext<MicSelectorContextValue>();

export function provideMicSelectorContext(value: MicSelectorContextValue): void {
  setMicSelectorContext(value);
}

export function useMicSelectorContext(): MicSelectorContextValue {
  return getMicSelectorContext();
}
