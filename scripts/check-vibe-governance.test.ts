import { describe, expect, it } from 'bun:test';
import { runVibeGovernanceCheck } from './check-vibe-governance';

describe('runVibeGovernanceCheck', () => {
  it('runs governance check across routes successfully', () => {
    const report = runVibeGovernanceCheck();
    expect(report.totalFilesScanned).toBeGreaterThan(0);
    expect(report.summary).toBeDefined();
    expect(report.violations).toBeDefined();
  });
});
