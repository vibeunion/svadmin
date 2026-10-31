import { describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  buildParityReport,
  collectBehaviorAssertionBudgets,
  collectBehaviorTestedComponents,
  generateMarkdownReport,
  parityArtifactDrift,
  parityOutputPaths,
} from './check-parity';

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

  it('reports exact, fallback and behavior-verified rates instead of coverage alone', () => {
    const report = buildParityReport();
    const expectedExact = Number(((report.adaptedCount / report.totalComponents) * 100).toFixed(1));
    const expectedFallback = Number(((report.fallbackCount / report.totalComponents) * 100).toFixed(1));

    expect(report.exactPercentage).toBe(expectedExact);
    expect(report.fallbackPercentage).toBe(expectedFallback);
    expect(report.exactPercentage + report.fallbackPercentage).toBeLessThan(100);
    expect(report.behaviorVerifiedCount).toBeGreaterThan(0);
    expect(report.behaviorVerifiedCount).toBeLessThanOrEqual(report.totalComponents);
    expect(report.behaviorAssertedCount).toBeLessThanOrEqual(report.behaviorVerifiedCount);
    expect(report.behaviorVerifiedPercentage).toBe(
      Number(((report.behaviorVerifiedCount / report.totalComponents) * 100).toFixed(1)),
    );
    expect(report.behaviorAssertedPercentage).toBe(
      Number(((report.behaviorAssertedCount / report.totalComponents) * 100).toFixed(1)),
    );

    for (const [, categorySummary] of Object.entries(report.categories)) {
      expect(categorySummary.exactRate).toBe(
        Number(((categorySummary.adapted / categorySummary.total) * 100).toFixed(1)),
      );
      expect(categorySummary.behaviorVerified).toBeLessThanOrEqual(categorySummary.total);
      expect(categorySummary.behaviorAsserted).toBeLessThanOrEqual(categorySummary.behaviorVerified);
    }
  });

  it('counts behavior verification from test imports rather than inventory claims', () => {
    const tested = collectBehaviorTestedComponents();
    expect(tested.has('LiteSteps.svelte')).toBe(true);
    expect(tested.has('LiteAreaChart.svelte')).toBe(true);
    expect(tested.has('LiteCalendar.svelte')).toBe(true);
    expect(tested.has('LiteNotARealComponent.svelte')).toBe(false);
  });

  it('requires an assertion budget per imported component before claiming verification', () => {
    const budgets = collectBehaviorAssertionBudgets();
    for (const [component, budget] of budgets) {
      expect(component.endsWith('.svelte')).toBe(true);
      expect(Number.isInteger(budget)).toBe(true);
      expect(budget).toBeGreaterThanOrEqual(1);
      expect(budget).toBeLessThan(2000);
    }
    // Dense table-driven files assert several times per imported component.
    expect(budgets.get('LiteAreaChart.svelte')).toBeGreaterThanOrEqual(2);
  });

  it('generates consistent Markdown matrix documentation and JSON parity data', () => {
    const report = buildParityReport();
    const markdown = generateMarkdownReport(report);

    expect(markdown).toContain('# @svadmin/ui ↔ @svadmin/lite 组件对齐矩阵');
    expect(markdown).toContain('清单映射覆盖率');
    expect(markdown).toContain('1:1 对齐率');
    expect(markdown).toContain('行为验证覆盖');
    expect(markdown).toContain('行为断言覆盖');
    expect(markdown).toContain('## 判定标准');
    expect(markdown).toContain('LiteAvatarField.svelte');
    expect(markdown).toContain('LiteCurrencyField.svelte');
    expect(markdown).toContain('LitePercentField.svelte');
    expect(markdown).toContain('LiteRatingField.svelte');

    const parityMdPath = resolve(import.meta.dir, '../packages/lite/PARITY.md');
    const parityJsonPath = resolve(import.meta.dir, '../packages/lite/parity.json');

    expect(existsSync(parityMdPath)).toBe(true);
    expect(existsSync(parityJsonPath)).toBe(true);
  });

  it('applies the published classification criteria to every entry', () => {
    const report = buildParityReport();
    const downgraded = report.items.filter(
      (item) => item.status === 'exact' && /降级|fallback|degraded/iu.test(item.strategy),
    );

    expect(downgraded.map((item) => item.name)).toEqual([]);

    const codeField = report.items.find((item) => item.name === 'CodeField');
    expect(codeField?.status).toBe('exact');
    expect(codeField?.strategy).not.toMatch(/降级/u);

    const relationPicker = report.items.find((item) => item.name === 'RelationPicker');
    expect(relationPicker?.status).toBe('fallback');
    const fileUpload = report.items.find((item) => item.name === 'FileUpload');
    expect(fileUpload?.status).toBe('exact');
    const tagsInput = report.items.find((item) => item.name === 'TagsInput');
    expect(tagsInput?.status).toBe('exact');
    const timePicker = report.items.find((item) => item.name === 'TimePicker');
    expect(timePicker?.status).toBe('exact');
    const datePicker = report.items.find((item) => item.name === 'DatePicker');
    expect(datePicker?.status).toBe('exact');
    const markdownField = report.items.find((item) => item.name === 'MarkdownField');
    expect(markdownField?.status).toBe('exact');
    const richTextField = report.items.find((item) => item.name === 'RichTextField');
    expect(richTextField?.status).toBe('fallback');
  });

  it('records the advanced disclosure re-audit outcome', () => {
    const report = buildParityReport();
    const status = (name: string): string | undefined =>
      report.items.find((item) => item.name === name)?.status;

    // Anchors plus a native form already preserve the whole confirm/dismiss
    // capability; only focus management and click-outside are client extras.
    expect(status('Popconfirm')).toBe('exact');
    expect(status('DetailDrawer')).toBe('exact');
    // Listing errors with field anchors is the full capability; scrolling and
    // focus are client enhancements.
    expect(status('ErrorSummary')).toBe('exact');
    // The reference `TwoFactorStepper` is a step list (no auth engine); after
    // adding `steps` and `class` passthrough Lite preserves all of it, plus a
    // native OTP form. Reviewed twice before flipping, see the audit log.
    expect(status('TwoFactorStepper')).toBe('exact');
    // Still client-owned: anchored tour highlights, accordion/tree expansion
    // state and moderate checkbox trees change what the user can reach.
    expect(status('Tour')).toBe('fallback');
    expect(status('Tree')).toBe('fallback');
    expect(status('Collapse')).toBe('fallback');
  });

  it('detects stale parity artifacts so CI cannot pass on drift', () => {
    const directory = mkdtempSync(join(tmpdir(), 'svadmin-parity-'));
    try {
      const { markdownPath, jsonPath } = parityOutputPaths(directory);
      mkdirSync(dirname(markdownPath), { recursive: true });
      const report = buildParityReport();
      writeFileSync(markdownPath, `${generateMarkdownReport(report).trimEnd()}\n`, 'utf8');
      writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
      expect(parityArtifactDrift(directory)).toEqual([]);

      writeFileSync(jsonPath, JSON.stringify({ ...report, fallbackCount: 0 }, null, 2), 'utf8');
      const drift = parityArtifactDrift(directory);
      expect(drift.some((entry) => entry.includes('parity.json'))).toBe(true);
      expect(drift.some((entry) => entry.includes('PARITY.md'))).toBe(false);

      writeFileSync(markdownPath, '# stale\n', 'utf8');
      expect(parityArtifactDrift(directory).some((entry) => entry.includes('PARITY.md'))).toBe(true);

      rmSync(jsonPath);
      expect(parityArtifactDrift(directory).some((entry) => entry.includes('missing'))).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('keeps parity checking registered in package scripts and CI', () => {
    const rootPkg = JSON.parse(readFileSync(resolve(import.meta.dir, '../package.json'), 'utf8'));
    expect(rootPkg.scripts['check:parity:verify']).toContain('--check');
    const verifyScript = readFileSync(resolve(import.meta.dir, 'verify.ts'), 'utf8');
    expect(verifyScript).toContain('check:parity:verify');
    const ci = readFileSync(resolve(import.meta.dir, '../.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('bun run check:parity:verify');
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

  it('points every mapped entry at a real Lite component and keeps names unique', () => {
    const report = buildParityReport();
    const liteComponents = resolve(import.meta.dir, '../packages/lite/src/components');
    const componentDirs = ['', 'advanced', 'buttons', 'compatibility', 'fields', 'layout', 'pages', 'widgets'];
    const names = new Set<string>();
    const missingTargets: string[] = [];
    const duplicateNames: string[] = [];

    for (const item of report.items) {
      if (names.has(item.name)) duplicateNames.push(item.name);
      names.add(item.name);
      if (item.liteComponent
        && !componentDirs.some((dir) => existsSync(resolve(liteComponents, dir, item.liteComponent ?? '')))) {
        missingTargets.push(`${item.name} -> ${item.liteComponent}`);
      }
    }

    expect(duplicateNames).toEqual([]);
    expect(missingTargets).toEqual([]);
  });
});
