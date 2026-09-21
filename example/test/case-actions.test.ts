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

    state.recordExecution('Optical examination completed');
    actions.openEvidence();
    expect(state.executionComplete).toBe(true);
    expect(state.activeStage).toBe('evidence');
    expect(state.evidenceComplete).toBe(false);

    state.recordEvidence('sample.png', '4x');
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

    expect(() => state.setStage('report')).toThrow();

    expect(state.caseAccepted).toBe(false);
    expect(state.executionComplete).toBe(false);
    expect(state.evidenceComplete).toBe(false);
  });

  it('requires actual input before completing execution or evidence', () => {
    const state = createCaseWorkspaceState();
    const actions = createCaseActions(state);
    actions.advanceToExecution();
    expect(() => actions.openEvidence()).toThrow();
    state.recordExecution('Execution notes');
    actions.openEvidence();
    expect(() => actions.completeEvidence()).toThrow();
    state.recordEvidence('sample.png', '');
    expect(() => actions.completeEvidence()).toThrow();
    state.recordEvidence('sample.png', '4x');
    actions.completeEvidence();
    state.recordExecution('New execution notes');
    expect(state.executionComplete).toBe(false);
    expect(state.evidenceComplete).toBe(false);
  });
});
