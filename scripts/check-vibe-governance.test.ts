import { describe, expect, it } from 'bun:test';
import { scanVibeGovernance } from '@svadmin/mcp';
import { runVibeGovernanceCheck } from './check-vibe-governance';

describe('runVibeGovernanceCheck', () => {
  it('runs governance check across routes successfully', () => {
    const report = runVibeGovernanceCheck();
    expect(report.totalFilesScanned).toBeGreaterThan(0);
    expect(report.summary).toBeDefined();
    expect(report.violations).toBeDefined();
  });
});

describe('scanVibeGovernance', () => {
  it('reports unmanaged fetch and axios calls', () => {
    const report = scanVibeGovernance([
      { path: 'views/List.svelte', content: 'const a = await fetch("/api/a");\nconst b = axios.get("/api/b");' },
    ]);

    expect(report.passed).toBe(false);
    expect(report.violations.map(v => v.rule)).toEqual(['no-unmanaged-fetch', 'no-unmanaged-fetch']);
    expect(report.violations.map(v => v.line)).toEqual([1, 2]);
  });

  it('honours documented escape hatches and flags reasons that are missing', () => {
    const compliant = scanVibeGovernance([
      {
        path: 'views/Upload.svelte',
        content: '// @vibe-escape: presigned upload endpoint is not a DataProvider resource\nawait fetch(uploadUrl);',
      },
    ]);
    expect(compliant.passed).toBe(true);

    const undisciplined = scanVibeGovernance([
      { path: 'views/Upload.svelte', content: '// @vibe-escape\nawait fetch(uploadUrl);' },
    ]);
    expect(undisciplined.passed).toBe(false);
    expect(undisciplined.violations.map(v => v.rule)).toEqual(['escape-hatch-discipline']);

    const strict = scanVibeGovernance(
      [{ path: 'views/Upload.svelte', content: '// @vibe-escape\nawait fetch(uploadUrl);' }],
      { strict: true },
    );
    expect(strict.violations.map(v => v.rule)).toEqual(['escape-hatch-discipline', 'no-unmanaged-fetch']);
  });

  it('ignores commented network calls and DataProvider hooks', () => {
    const report = scanVibeGovernance([
      {
        path: 'views/List.svelte',
        content: '// fetch("/api/legacy") is deprecated\n * axios.get("/api/legacy")\nconst rows = useList({ resource: "posts" });',
      },
    ]);

    expect(report.passed).toBe(true);
    expect(report.rulesChecked).toEqual(['no-unmanaged-fetch', 'escape-hatch-discipline']);
  });
});