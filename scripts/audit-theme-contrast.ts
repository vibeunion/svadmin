/**
 * Contrast audit for generated theme palettes.
 *
 * `--write` refreshes the snapshot, `--check` fails on drift or on any AA
 * failure, and the default prints the report. Colors come from the brand list
 * below so the audit covers the generated token ring, not hand-written presets.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deriveColorPreset } from '../packages/core/src/color-scale';
import {
  auditThemeContrast,
  failingContrastChecks,
  formatContrastReport,
  type ContrastCheck,
} from '../packages/core/src/theme-dtcg';

const BRANDS = ['#165DFF', '#0EA5E9', '#22C55E', '#F97316', '#F43F5E', '#8B5CF6', '#111827'] as const;
const SNAPSHOT_PATH = resolve(import.meta.dir, '..', 'packages/core/theme-contrast.json');

export interface ContrastSnapshot {
  generatedBy: string;
  brands: Array<{ color: string; name: string; checks: ContrastCheck[] }>;
}

export function buildSnapshot(): ContrastSnapshot {
  return {
    generatedBy: 'scripts/audit-theme-contrast.ts',
    brands: BRANDS.map((color, index) => {
      const preset = deriveColorPreset({ name: `brand-${index + 1}`, color });
      return { color, name: preset.name, checks: auditThemeContrast(preset) };
    }),
  };
}

export function snapshotDrift(): string[] {
  const expected = JSON.stringify(buildSnapshot(), null, 2);
  if (!existsSync(SNAPSHOT_PATH)) return [`${SNAPSHOT_PATH} (missing)`];
  const current = readFileSync(SNAPSHOT_PATH, 'utf8').trimEnd();
  return current === expected ? [] : [`${SNAPSHOT_PATH} (out of date)`];
}

function contrastFailures(): ContrastCheck[] {
  return buildSnapshot().brands.flatMap((brand) => failingContrastChecks(brand.checks));
}

if (import.meta.main) {
  const snapshot = buildSnapshot();
  const failures = contrastFailures();
  const write = process.argv.includes('--write');
  const check = process.argv.includes('--check');

  for (const brand of snapshot.brands) {
    console.info(formatContrastReport(brand.name, brand.checks));
    console.info();
  }
  if (failures.length > 0) {
    console.error(`[FAIL] ${failures.length} contrast check(s) below WCAG AA`);
    for (const failure of failures) {
      console.error(`  - ${failure.mode} ${failure.pair}: ${failure.ratio}`);
    }
    process.exit(1);
  }
  if (write) {
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.info(`[OK] Wrote ${SNAPSHOT_PATH}`);
  }
  if (check) {
    const drift = snapshotDrift();
    if (drift.length > 0) {
      console.error(`[FAIL] ${drift.join(', ')}`);
      process.exit(1);
    }
    console.info('[OK] Theme contrast snapshot matches.');
  }
}
