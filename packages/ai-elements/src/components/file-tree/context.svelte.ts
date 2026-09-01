import { createContext } from 'svelte';

export interface FileTreeContextValue {
  readonly selectedPath?: string;
  readonly expandedPaths: ReadonlySet<string>;
  selectPath(path: string): void;
  togglePath(path: string): void;
  readonly onSelect?: (path: string) => void;
  readonly onExpandedChange?: (expanded: Set<string>) => void;
}

const [getFileTreeContext, setFileTreeContext] = createContext<FileTreeContextValue>();

export function provideFileTreeContext(value: FileTreeContextValue): FileTreeContextValue {
  setFileTreeContext(value);
  return value;
}

export function useFileTreeContext(component = 'FileTree component'): FileTreeContextValue {
  try {
    return getFileTreeContext();
  } catch {
    throw new Error(`${component} must be used within FileTree`);
  }
}
