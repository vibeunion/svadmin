import { createContext } from 'svelte';

export type PackageChangeType = 'major' | 'minor' | 'patch' | 'added' | 'removed';

export interface PackageInfoContextValue {
  readonly name: string;
  readonly currentVersion?: string;
  readonly newVersion?: string;
  readonly changeType?: PackageChangeType;
}

const [getContext, setContext] = createContext<PackageInfoContextValue>();
export function providePackageInfoContext(value: PackageInfoContextValue): void { setContext(value); }
export function usePackageInfoContext(): PackageInfoContextValue { return getContext(); }
