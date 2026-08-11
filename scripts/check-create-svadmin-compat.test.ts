import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadScaffoldManifest } from '../packages/create-svadmin/src/project-manifest';
import {
  checkCreateSvadminCompatibility,
  rangesOverlap,
} from './check-create-svadmin-compat';

test('generated create-svadmin manifests match workspace versions and peer ranges', async () => {
  const repositoryRoot = resolve(import.meta.dir, '..');
  expect(await checkCreateSvadminCompatibility(repositoryRoot)).toEqual([]);
});

test('peer range comparison rejects incompatible generated toolchains', () => {
  expect(rangesOverlap('^6.0.3', '^5.0.0 || ^6.0.0')).toBe(true);
  expect(rangesOverlap('^7.0.2', '^5.0.0 || ^6.0.0')).toBe(false);
});

test('compatibility check rejects a shipped scaffold that drifts from workspace versions', async () => {
  const repositoryRoot = resolve(import.meta.dir, '..');
  const scaffold = loadScaffoldManifest(
    join(repositoryRoot, 'packages', 'create-svadmin', 'scaffold-manifest.json'),
  );
  scaffold.dependencies['@svadmin/core'] = '^0.0.1';

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'svadmin-scaffold-compat-'));
  const scaffoldManifestPath = join(temporaryDirectory, 'scaffold-manifest.json');
  try {
    await writeFile(scaffoldManifestPath, `${JSON.stringify(scaffold, null, 2)}\n`);
    const issues = await checkCreateSvadminCompatibility(repositoryRoot, { scaffoldManifestPath });
    expect(issues.some((issue) => issue.includes('@svadmin/core must be'))).toBe(true);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
