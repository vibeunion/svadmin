import { createContext } from 'svelte';

export interface CommitDisclosureContext {
  readonly open: boolean;
  toggle(): void;
}

const [getCommitContext, setCommitContext] = createContext<CommitDisclosureContext>();

export function provideCommitContext(value: CommitDisclosureContext): CommitDisclosureContext {
  setCommitContext(value);
  return value;
}

export function useCommitContext(component = 'Commit component'): CommitDisclosureContext {
  try {
    return getCommitContext();
  } catch {
    throw new Error(`${component} must be used within Commit`);
  }
}
