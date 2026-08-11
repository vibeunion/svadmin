import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  createProjectPackageJson,
  loadScaffoldManifest,
} from './project-manifest';
import {
  doctorProjectPackageJson,
  planProjectUpgrade,
  planProjectPackageFileUpgrade,
  writeProjectPackageJsonUpgrade,
} from './project-maintenance';

const scaffold = loadScaffoldManifest(resolve(import.meta.dir, '..', 'scaffold-manifest.json'));

describe('create-svadmin doctor', () => {
  test('reports a generated project as clean', () => {
    const project = createProjectPackageJson(scaffold, {
      projectName: 'clean-admin',
      dataProvider: 'none',
      authProvider: 'none',
    });

    expect(doctorProjectPackageJson(project, scaffold)).toEqual({
      status: 'clean',
      exitCode: 0,
      issues: [],
    });
  });

  test('distinguishes missing, drifted, and clearly incompatible dependencies', () => {
    const project = createProjectPackageJson(scaffold, {
      projectName: 'drifted-admin',
      dataProvider: 'simple-rest',
      authProvider: 'mock',
    });
    project.dependencies['@svadmin/core'] = '^0.1.0';
    project.dependencies['@svadmin/simple-rest'] = '^0.9.10';
    delete project.dependencies['@tanstack/svelte-query'];
    delete project.dependencies['@refinedev/core'];

    const report = doctorProjectPackageJson(project, scaffold);

    expect(report.status).toBe('issues');
    expect(report.exitCode).toBe(1);
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ packageName: '@svadmin/core', kind: 'incompatible' }),
      expect.objectContaining({ packageName: '@svadmin/simple-rest', kind: 'drift' }),
      expect.objectContaining({ packageName: '@tanstack/svelte-query', kind: 'missing' }),
      expect.objectContaining({ packageName: '@refinedev/core', kind: 'missing' }),
    ]));
    expect(report.issues.every((issue) => issue.action.length > 0)).toBe(true);
  });
});

describe('create-svadmin upgrade', () => {
  test('plans changes without mutating the input and preserves unknown fields', () => {
    const project = {
      name: 'custom-admin',
      private: true,
      scripts: {
        dev: 'custom-dev-command',
        custom: 'keep-me',
      },
      dependencies: {
        '@svadmin/core': '^0.1.0',
        '@svadmin/simple-rest': '^0.8.0',
        'user-owned-runtime': '^9.9.9',
      },
      devDependencies: {
        svelte: '^5.0.0',
        'user-owned-tool': '^1.2.3',
      },
      customMetadata: {
        keep: true,
      },
    };
    const original = structuredClone(project);

    const plan = planProjectUpgrade(project, scaffold);

    expect(project).toEqual(original);
    expect(plan.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ packageName: '@svadmin/core', action: 'update' }),
      expect.objectContaining({ packageName: '@svadmin/simple-rest', action: 'update' }),
      expect.objectContaining({ packageName: '@refinedev/core', action: 'add' }),
    ]));
    expect(plan.updatedPackageJson.scripts).toEqual(project.scripts);
    expect(plan.updatedPackageJson.customMetadata).toEqual(project.customMetadata);
    expect(plan.updatedPackageJson.dependencies?.['user-owned-runtime']).toBe('^9.9.9');
    expect(plan.updatedPackageJson.devDependencies?.['user-owned-tool']).toBe('^1.2.3');
  });

  test('dry-run is read-only and --write creates an exact backup before replacement', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'create-svadmin-upgrade-'));
    const packagePath = join(temporaryDirectory, 'package.json');
    const originalProject = {
      name: 'upgrade-admin',
      scripts: { dev: 'custom-dev-command', custom: 'keep-me' },
      dependencies: {
        '@svadmin/core': '^0.1.0',
        '@svadmin/ui': '^0.1.0',
        'user-owned-runtime': '^9.9.9',
      },
      devDependencies: {
        svelte: '^5.0.0',
        'user-owned-tool': '^1.2.3',
      },
      customMetadata: { keep: true },
    };
    const originalSource = `${JSON.stringify(originalProject, null, 4)}\n`;

    try {
      await writeFile(packagePath, originalSource);

      const dryRun = planProjectPackageFileUpgrade(packagePath, scaffold);
      expect(dryRun.wrote).toBe(false);
      expect(dryRun.backupPath).toBeNull();
      expect(await readFile(packagePath, 'utf8')).toBe(originalSource);
      expect(await readdir(temporaryDirectory)).toEqual(['package.json']);

      const written = writeProjectPackageJsonUpgrade(
        packagePath,
        scaffold,
        new Date('2026-08-11T06:07:08.009Z'),
      );
      if (!written.wrote) {
        throw new Error('writeProjectPackageJsonUpgrade must return a written result');
      }
      expect(written.backupPath).toBe(
        join(temporaryDirectory, 'package.json.svadmin-backup-20260811T060708009Z'),
      );
      expect(await readFile(written.backupPath, 'utf8')).toBe(originalSource);

      const upgraded: unknown = JSON.parse(await readFile(packagePath, 'utf8'));
      expect(upgraded).toMatchObject({
        scripts: originalProject.scripts,
        customMetadata: originalProject.customMetadata,
        dependencies: {
          'user-owned-runtime': '^9.9.9',
        },
        devDependencies: {
          'user-owned-tool': '^1.2.3',
        },
      });
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
