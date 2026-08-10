import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planReleasePublication } from './plan-release-publication';

interface FixturePackage {
  path: string;
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function createRepositoryFixture(packages: FixturePackage[]): string {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-release-publication-'));
  for (const packageDefinition of packages) {
    const packageDirectory = join(root, packageDefinition.path);
    mkdirSync(packageDirectory, { recursive: true });
    writeFileSync(
      join(packageDirectory, 'package.json'),
      JSON.stringify({
        name: packageDefinition.name,
        version: packageDefinition.version,
        dependencies: packageDefinition.dependencies,
        devDependencies: packageDefinition.devDependencies,
      }),
    );
  }
  return root;
}

const refineAdapter: FixturePackage = {
  path: 'packages/refine-adapter',
  name: '@svadmin/refine-adapter',
  version: '0.10.0',
};

const supabase: FixturePackage = {
  path: 'packages/supabase',
  name: '@svadmin/supabase',
  version: '0.11.8',
  dependencies: { '@svadmin/refine-adapter': 'workspace:*' },
};

describe('release publication planning', () => {
  test('rejects release paths that could inject output or JavaScript', () => {
    const root = createRepositoryFixture([supabase]);
    try {
      for (const maliciousPath of [
        'packages/supabase\nSVADMIN_RELEASE_PATHS',
        "packages/supabase');process.exit(0)",
      ]) {
        expect(() =>
          planReleasePublication({
            repositoryRoot: root,
            releaseManifest: JSON.stringify([{ path: maliciousPath }]),
            isPackageVersionPublished: () => true,
          }),
        ).toThrow(`Invalid release package path: ${maliciousPath}`);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects a workspace dependency that is neither released nor published', () => {
    const root = createRepositoryFixture([refineAdapter, supabase]);
    try {
      expect(() =>
        planReleasePublication({
          repositoryRoot: root,
          releaseManifest: JSON.stringify([{ path: supabase.path, tag: 'supabase-v0.11.8' }]),
          isPackageVersionPublished: () => false,
        }),
      ).toThrow(
        '@svadmin/supabase@0.11.8 depends on unpublished workspace package @svadmin/refine-adapter@0.10.0',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('includes workspace dev dependencies in the release closure', () => {
    const releaseTool: FixturePackage = {
      path: 'packages/release-tool',
      name: '@svadmin/release-tool',
      version: '0.1.0',
      devDependencies: { '@svadmin/refine-adapter': 'workspace:*' },
    };
    const root = createRepositoryFixture([refineAdapter, releaseTool]);
    try {
      expect(() =>
        planReleasePublication({
          repositoryRoot: root,
          releaseManifest: JSON.stringify([{ path: releaseTool.path }]),
          isPackageVersionPublished: () => false,
        }),
      ).toThrow(
        '@svadmin/release-tool@0.1.0 depends on unpublished workspace package @svadmin/refine-adapter@0.10.0',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('accepts a workspace dependency whose exact version is already published', () => {
    const root = createRepositoryFixture([refineAdapter, supabase]);
    const lookups: string[] = [];
    try {
      expect(
        planReleasePublication({
          repositoryRoot: root,
          releaseManifest: JSON.stringify([{ path: supabase.path, tag: 'supabase-v0.11.8' }]),
          isPackageVersionPublished: (name, version) => {
            lookups.push(`${name}@${version}`);
            return true;
          },
        }),
      ).toEqual([supabase.path]);
      expect(lookups).toEqual(['@svadmin/refine-adapter@0.10.0']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('orders a same-batch workspace dependency before its dependent', () => {
    const root = createRepositoryFixture([refineAdapter, supabase]);
    try {
      expect(
        planReleasePublication({
          repositoryRoot: root,
          releaseManifest: JSON.stringify([
            { path: supabase.path, tag: 'supabase-v0.11.8' },
            { path: refineAdapter.path, tag: 'refine-adapter-v0.10.0' },
          ]),
          isPackageVersionPublished: () => {
            throw new Error('same-batch dependencies must not query npm');
          },
        }),
      ).toEqual([refineAdapter.path, supabase.path]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects circular workspace dependencies in the release batch', () => {
    const cyclicAdapter: FixturePackage = {
      ...refineAdapter,
      dependencies: { '@svadmin/supabase': 'workspace:*' },
    };
    const root = createRepositoryFixture([cyclicAdapter, supabase]);
    try {
      expect(() =>
        planReleasePublication({
          repositoryRoot: root,
          releaseManifest: JSON.stringify([
            { path: supabase.path, tag: 'supabase-v0.11.8' },
            { path: refineAdapter.path, tag: 'refine-adapter-v0.10.0' },
          ]),
          isPackageVersionPublished: () => true,
        }),
      ).toThrow('Circular workspace dependencies in release manifest');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
