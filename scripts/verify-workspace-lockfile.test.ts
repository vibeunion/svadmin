import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  formatWorkspaceLockfileMismatches,
  readLockfileWorkspaceMetadata,
  verifyWorkspaceLockfile,
} from './verify-workspace-lockfile';

const lockfile = `{
  "lockfileVersion": 3,
  "workspaces": {
    "packages/charts": {
      "name": "@svadmin/charts",
      "version": "0.1.0",
      "dependencies": {
        "d3-transition": "^3.0.1",
      },
    },
    "packages/dock": {
      "name": "@svadmin/dock",
      "version": "0.2.0",
    },
  },
  "packages": {},
}
`;

function createRepositoryFixture(packages: Array<{ name: string; version: string }>): string {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-lockfile-'));
  packages.forEach((pkg, index) => {
    const directory = join(root, 'packages', index === 0 ? 'charts' : 'dock');
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'package.json'), JSON.stringify(pkg));
  });
  return root;
}

describe('workspace lockfile verification', () => {
  test('parses workspace name and version despite trailing commas', () => {
    expect(readLockfileWorkspaceMetadata(lockfile)).toEqual(
      new Map([
        ['packages/charts', { name: '@svadmin/charts', version: '0.1.0' }],
        ['packages/dock', { name: '@svadmin/dock', version: '0.2.0' }],
      ]),
    );
  });

  test('accepts a release commit whose bun.lock matches every package version', () => {
    const root = createRepositoryFixture([
      { name: '@svadmin/charts', version: '0.1.0' },
      { name: '@svadmin/dock', version: '0.2.0' },
    ]);
    try {
      expect(verifyWorkspaceLockfile({ repositoryRoot: root, lockfile })).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('reports each stale workspace version with its package.json version', () => {
    const root = createRepositoryFixture([
      { name: '@svadmin/charts', version: '0.2.0' },
      { name: '@svadmin/dock', version: '0.2.0' },
    ]);
    try {
      const mismatches = verifyWorkspaceLockfile({ repositoryRoot: root, lockfile });
      expect(mismatches).toEqual([
        {
          path: 'packages/charts',
          name: '@svadmin/charts',
          packageVersion: '0.2.0',
          lockfileName: '@svadmin/charts',
          lockfileVersion: '0.1.0',
        },
      ]);
      expect(formatWorkspaceLockfileMismatches(mismatches)).toEqual([
        'packages/charts (@svadmin/charts) package.json=0.2.0 lock=0.1.0',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('reports a workspace that is missing from bun.lock entirely', () => {
    const root = createRepositoryFixture([
      { name: '@svadmin/charts', version: '0.2.0' },
      { name: '@svadmin/dock', version: '0.2.0' },
    ]);
    try {
      const withoutDock = lockfile.replace(/ {4}"packages\/dock": \{[\s\S]*?\n {4}\},\n/, '');
      const mismatches = verifyWorkspaceLockfile({ repositoryRoot: root, lockfile: withoutDock });
      expect(mismatches.map((mismatch) => mismatch.path)).toEqual([
        'packages/charts',
        'packages/dock',
      ]);
      expect(mismatches[1].lockfileVersion).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});