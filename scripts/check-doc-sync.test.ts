import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { checkDocSync } from './check-doc-sync';

describe('Doc-Sync contract gate', () => {
  const repositoryRoot = resolve(import.meta.dir, '..');

  test('verifies all workspace packages are documented in README and match MIT license', async () => {
    const report = await checkDocSync(repositoryRoot);
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.scannedPackages.length).toBeGreaterThanOrEqual(25);
  });
});
