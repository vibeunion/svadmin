import { describe, expect, it } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildParityReport, generateMarkdownReport, parityOutputPaths } from './check-parity';

describe('UI/Lite Parity Tracking Contract', () => {
  it('computes complete component parity without missing items', () => {
    const report = buildParityReport();
    expect(report.totalComponents).toBeGreaterThan(50);
    expect(report.missingCount).toBe(0);
    expect(report.overallCoveragePercentage).toBe(100);

    // Verify all categories have 100% coverage (adapted + fallback + spaOnly)
    for (const [, categorySummary] of Object.entries(report.categories)) {
      expect(categorySummary.missing).toBe(0);
      expect(categorySummary.percentage).toBe(100);
    }
  });

  it('generates consistent Markdown matrix documentation and JSON parity data', () => {
    const report = buildParityReport();
    const markdown = generateMarkdownReport(report);

    expect(markdown).toContain('# @svadmin/ui ↔ @svadmin/lite 组件对齐矩阵');
    expect(markdown).toContain('100%');
    expect(markdown).toContain('LiteAvatarField.svelte');
    expect(markdown).toContain('LiteCurrencyField.svelte');
    expect(markdown).toContain('LitePercentField.svelte');
    expect(markdown).toContain('LiteRatingField.svelte');

    const parityMdPath = resolve(import.meta.dir, '../packages/lite/PARITY.md');
    const parityJsonPath = resolve(import.meta.dir, '../packages/lite/parity.json');

    expect(existsSync(parityMdPath)).toBe(true);
    expect(existsSync(parityJsonPath)).toBe(true);
  });

  it('keeps parity checking registered in package scripts', () => {
    const rootPkg = JSON.parse(readFileSync(resolve(import.meta.dir, '../package.json'), 'utf8'));
    const litePkg = JSON.parse(readFileSync(resolve(import.meta.dir, '../packages/lite/package.json'), 'utf8'));

    expect(rootPkg.scripts['check:parity']).toContain('scripts/check-parity.ts');
    expect(litePkg.scripts['check:parity']).toContain('scripts/check-parity.ts');
  });

  it('writes parity artifacts relative to the repository, not the caller cwd', () => {
    const paths = parityOutputPaths('/tmp/caller-cwd');
    expect(paths.markdownPath).toBe('/tmp/caller-cwd/packages/lite/PARITY.md');
    expect(paths.jsonPath).toBe('/tmp/caller-cwd/packages/lite/parity.json');
  });
});
