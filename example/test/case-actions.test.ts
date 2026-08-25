import { describe, expect, it } from 'vitest';
import { createCaseActions } from '../src/pages/case-actions.js';
import { createCaseWorkspaceState } from '../src/pages/case-workspace.svelte.js';

describe('case workspace actions', () => {
  it('advances through execution and completes the evidence gate', () => {
    const state = createCaseWorkspaceState();
    const actions = createCaseActions(state);

    actions.advanceToExecution();
    expect(state.caseAccepted).toBe(true);
    expect(state.activeStage).toBe('execution');

    actions.openEvidence();
    expect(state.executionComplete).toBe(true);
    expect(state.activeStage).toBe('evidence');
    expect(state.evidenceComplete).toBe(false);

    actions.completeEvidence();
    expect(state.evidenceComplete).toBe(true);
    expect(state.activeStage).toBe('report');
    expect(state.savedAt).not.toBeNull();
  });

  it('tracks blocker rescue independently from evidence completion', () => {
    const state = createCaseWorkspaceState();
    const actions = createCaseActions(state);

    actions.rescueBlocker();

    expect(state.rescued).toBe(true);
    expect(state.caseAccepted).toBe(false);
    expect(state.executionComplete).toBe(false);
    expect(state.evidenceComplete).toBe(false);
    expect(state.activeStage).toBe('overview');
  });

  it('does not complete gates when a user only browses a later stage', () => {
    const state = createCaseWorkspaceState();

    state.setStage('report');

    expect(state.caseAccepted).toBe(false);
    expect(state.executionComplete).toBe(false);
    expect(state.evidenceComplete).toBe(false);
  });
});
