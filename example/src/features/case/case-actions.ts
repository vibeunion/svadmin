import type { CaseWorkspaceState } from './case-workspace.svelte.js';

export function createCaseActions(state: CaseWorkspaceState) {
  return {
    advanceToExecution() {
      state.acceptCase();
      state.setStage('execution');
      state.markSaved();
    },
    openEvidence() {
      state.completeExecution();
      state.setStage('evidence');
      state.markSaved();
    },
    rescueBlocker() {
      state.rescueBlocker();
      state.markSaved();
    },
    completeEvidence() {
      state.completeEvidence();
      state.setStage('report');
      state.markSaved();
    },
  };
}
