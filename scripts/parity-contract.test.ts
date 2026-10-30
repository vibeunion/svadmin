import { describe, expect, it } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildParityReport,
  collectBehaviorAssertionBudgets,
  collectBehaviorTestedComponents,
  generateMarkdownReport,
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
