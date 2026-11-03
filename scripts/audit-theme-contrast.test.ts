import { expect, test } from 'bun:test';
import { failingContrastChecks } from '../packages/core/src/theme-dtcg';
import { buildSnapshot, snapshotDrift } from './audit-theme-contrast';

test('committed theme contrast snapshot matches the generator and stays at AA', () => {
  expect(snapshotDrift()).toEqual([]);
  const failures = buildSnapshot().brands.flatMap((brand) => failingContrastChecks(brand.checks));
  expect(failures).toEqual([]);
});
