import { createContext } from 'svelte';

export interface EnvironmentVariablesContextValue {
  readonly showValues: boolean;
  setShowValues(show: boolean): void;
}

export interface EnvironmentVariableContextValue {
  readonly name: string;
  readonly value: string;
}

const [getVariablesContext, setVariablesContext] = createContext<EnvironmentVariablesContextValue>();
const [getVariableContext, setVariableContext] = createContext<EnvironmentVariableContextValue>();

export function provideEnvironmentVariablesContext(value: EnvironmentVariablesContextValue): void { setVariablesContext(value); }
export function useEnvironmentVariablesContext(): EnvironmentVariablesContextValue { return getVariablesContext(); }
export function provideEnvironmentVariableContext(value: EnvironmentVariableContextValue): void { setVariableContext(value); }
export function useEnvironmentVariableContext(): EnvironmentVariableContextValue { return getVariableContext(); }
