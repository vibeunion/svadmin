import { expect, test } from 'bun:test';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  createProjectPackageJson,
  loadScaffoldManifest,
} from './project-manifest';
import { verifyCreateSvadminPackedCli } from '../../../scripts/check-package-packs';

const cliEntry = resolve(import.meta.dir, 'index.ts');
const scaffold = loadScaffoldManifest(resolve(import.meta.dir, '..', 'scaffold-manifest.json'));

function runCli(args: string[]) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function packedTarballFilename(packOutput: string): string {
  const parsedOutput: unknown = JSON.parse(packOutput);
  if (!Array.isArray(parsedOutput) || parsedOutput.length !== 1) {
    throw new Error('npm pack must return exactly one tarball');
  }
  const packedArtifact: unknown = parsedOutput[0];
  if (typeof packedArtifact !== 'object' || packedArtifact === null) {
    throw new Error('npm pack output must contain one artifact object');
  }
  const filename = Reflect.get(packedArtifact, 'filename');
  if (typeof filename !== 'string') {
    throw new Error('npm pack output is missing the tarball filename');
  }
  return filename;
}

test('doctor exits 0 for clean projects, 1 for drift, and 2 for invalid input', async () => {
  const projectDirectory = await mkdtemp(join(tmpdir(), 'create-svadmin-doctor-cli-'));
  const packagePath = join(projectDirectory, 'package.json');
  const project = createProjectPackageJson(scaffold, {
    projectName: 'doctor-cli',
    dataProvider: 'none',
    authProvider: 'none',
  });

  try {
    await writeFile(packagePath, `${JSON.stringify(project, null, 2)}\n`);
    const clean = runCli(['doctor', projectDirectory]);
    expect(clean.status).toBe(0);
    expect(clean.stdout).toContain('Dependencies match');

    project.dependencies['@svadmin/core'] = '^0.1.0';
    await writeFile(packagePath, `${JSON.stringify(project, null, 2)}\n`);
    const drift = runCli(['doctor', projectDirectory]);
    expect(drift.status).toBe(1);
    expect(drift.stdout).toContain('@svadmin/core: incompatible');
    expect(drift.stdout).toContain('actionable issue');

    await writeFile(packagePath, '{ invalid json');
    const invalid = runCli(['doctor', projectDirectory]);
    expect(invalid.status).toBe(2);
    expect(invalid.stderr).toContain('✗');
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});

test('upgrade CLI stays read-only until --write and then preserves custom fields', async () => {
  const projectDirectory = await mkdtemp(join(tmpdir(), 'create-svadmin-upgrade-cli-'));
  const packagePath = join(projectDirectory, 'package.json');
  const project = createProjectPackageJson(scaffold, {
    projectName: 'upgrade-cli',
    dataProvider: 'none',
    authProvider: 'none',
  });
  project.dependencies['@svadmin/core'] = '^0.1.0';
  project.dependencies['user-owned-runtime'] = '^9.9.9';
  const projectWithCustomFields = {
    ...project,
    scripts: { ...project.scripts, custom: 'keep-me' },
    customMetadata: { keep: true },
  };
  const originalSource = `${JSON.stringify(projectWithCustomFields, null, 2)}\n`;

  try {
    await writeFile(packagePath, originalSource);
    const dryRun = runCli(['upgrade', projectDirectory]);
    expect(dryRun.status).toBe(0);
    expect(dryRun.stdout).toContain('Dry run only');
    expect(await readFile(packagePath, 'utf8')).toBe(originalSource);
    expect(await readdir(projectDirectory)).toEqual(['package.json']);

    const write = runCli(['upgrade', projectDirectory, '--write']);
    expect(write.status).toBe(0);
    expect(write.stdout).toContain('Backup:');
    expect((await readdir(projectDirectory)).some(
      (fileName) => fileName.startsWith('package.json.svadmin-backup-'),
    )).toBe(true);

    const upgraded = JSON.parse(await readFile(packagePath, 'utf8')) as {
      dependencies: Record<string, string>;
      scripts: Record<string, string>;
      customMetadata: { keep: boolean };
    };
    expect(upgraded.dependencies['@svadmin/core']).toBe(scaffold.dependencies['@svadmin/core']);
    expect(upgraded.dependencies['user-owned-runtime']).toBe('^9.9.9');
    expect(upgraded.scripts.custom).toBe('keep-me');
    expect(upgraded.customMetadata).toEqual({ keep: true });
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});

test('release pack gate runs maintenance commands from the packed Node CLI', async () => {
  const packageDirectory = resolve(import.meta.dir, '..');
  const packDirectory = await mkdtemp(join(tmpdir(), 'create-svadmin-packed-cli-test-'));

  try {
    const buildExecution = spawnSync('bun', ['run', 'build'], {
      cwd: packageDirectory,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(buildExecution.status, buildExecution.stderr || buildExecution.stdout).toBe(0);

    const packExecution = spawnSync(
      'npm',
      ['pack', '--json', '--pack-destination', packDirectory],
      {
        cwd: packageDirectory,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    expect(packExecution.status, packExecution.stderr || packExecution.stdout).toBe(0);

    const tarballPath = join(packDirectory, packedTarballFilename(packExecution.stdout));
    const smokeOutput = await verifyCreateSvadminPackedCli(tarballPath);
    expect(smokeOutput).toContain('packed npm install passed');
    expect(smokeOutput).toContain('packed bin shim doctor passed');
    expect(smokeOutput).toContain('packed doctor clean passed');
    expect(smokeOutput).toContain('packed doctor drift passed');
    expect(smokeOutput).toContain('packed upgrade dry-run passed');
  } finally {
    await rm(packDirectory, { recursive: true, force: true });
  }
}, 180_000);
