import { describe, expect, it } from 'vitest';
import {
  AI_WORKSPACE_CAPABILITIES,
  AI_WORKSPACE_STABLE_CAPABILITIES,
} from './ai-workspace-contract';

describe('AI workspace contract', () => {
  it('keeps the Ant Design X-inspired core loop explicit', () => {
    expect(AI_WORKSPACE_STABLE_CAPABILITIES.map(({ id }) => id)).toEqual([
      'welcome', 'suggestion', 'conversation', 'sender', 'streaming',
      'reasoning', 'tool-calling', 'approval', 'command-bar', 'persistence',
    ]);
  });

  it('does not present long-running task surfaces as stable by default', () => {
    expect(AI_WORKSPACE_CAPABILITIES.find(({ id }) => id === 'task-progress')?.stage).toBe(
      'experimental',
    );
  });

  it('requires every capability to name local surfaces and acceptance behavior', () => {
    for (const capability of AI_WORKSPACE_CAPABILITIES) {
      expect(capability.localSurfaces.length).toBeGreaterThan(0);
      expect(capability.acceptance.length).toBeGreaterThan(0);
    }
  });
});
