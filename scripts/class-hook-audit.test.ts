import { describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildClassHookAudit,
  buildParityReport,
  classHookOutputPaths,
  classHookArtifactDrift,
  generateClassHookMarkdown,
} from './check-parity';

const repositoryRoot = `${import.meta.dir}/..`;

describe('Lite styling hook audit', () => {
  it('accounts for every reviewed exact entry with a reference hook', () => {
    const audit = buildClassHookAudit(repositoryRoot);
    const report = buildParityReport();

    expect(audit.reviewedCount).toBeGreaterThan(0);
    expect(audit.reviewedCount).toBeLessThanOrEqual(report.items.filter((item) => item.status === 'exact').length);
    expect(audit.referenceHookCount).toBeGreaterThanOrEqual(audit.preservedCount);
    expect(audit.preservedCount + audit.missing.length).toBe(audit.referenceHookCount);
    expect(audit.coveragePercentage).toBe(
      Number(((audit.preservedCount / audit.referenceHookCount) * 100).toFixed(1)),
    );
  });

  it('only reports exact entries as styling-hook debt', () => {
    const report = buildParityReport();
    const exactNames = new Set(
      report.items.filter((item) => item.status === 'exact').map((item) => item.name),
    );

    for (const entry of buildClassHookAudit(repositoryRoot).missing) {
      expect(exactNames.has(entry.name)).toBe(true);
      expect(entry.liteComponent).toMatch(/^Lite[A-Za-z0-9]+\.svelte$/u);
    }
  });

  it('keeps the committed artifact in sync with the generator', () => {
    const { markdownPath } = classHookOutputPaths(repositoryRoot);

    expect(existsSync(markdownPath)).toBe(true);
    expect(existsSync(classHookOutputPaths(repositoryRoot).jsonPath)).toBe(true);
    expect(classHookArtifactDrift(repositoryRoot)).toEqual([]);
    // The artifact must state that it is a separate metric, not a status.
    const artifact = readFileSync(markdownPath, 'utf8');
    expect(artifact).toContain('能力判定相互独立');
    expect(artifact).toContain('不计为能力缺口');
    // The parity table must point readers at the separate metric.
    const parityTable = readFileSync(join(repositoryRoot, 'packages/lite/PARITY.md'), 'utf8');
    expect(parityTable).toContain('CLASS-HOOKS.md');
  });

  it('detects a stale or missing artifact', () => {
    const directory = mkdtempSync(join(tmpdir(), 'svadmin-class-hooks-'));
    try {
      const { markdownPath, jsonPath } = classHookOutputPaths(directory);

      expect(classHookArtifactDrift(directory).some((entry) => entry.includes('missing'))).toBe(true);

      const audit = buildClassHookAudit(directory);
      mkdirSync(`${directory}/packages/lite`, { recursive: true });
      writeFileSync(markdownPath, `${generateClassHookMarkdown(audit).trimEnd()}\n`, 'utf8');
      writeFileSync(jsonPath, JSON.stringify(audit, null, 2), 'utf8');
      expect(classHookArtifactDrift(directory)).toEqual([]);

      writeFileSync(jsonPath, JSON.stringify({ ...audit, reviewedCount: 999 }, null, 2), 'utf8');
      expect(classHookArtifactDrift(directory).some((entry) => entry.includes('class-hooks.json'))).toBe(true);
      writeFileSync(jsonPath, JSON.stringify(audit, null, 2), 'utf8');

      writeFileSync(markdownPath, '# stale\n', 'utf8');
      expect(classHookArtifactDrift(directory).some((entry) => entry.includes('out of date'))).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});