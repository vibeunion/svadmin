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

test('guidance CLI previews changes and only adds missing project standards', async () => {
  const projectDirectory = await mkdtemp(join(tmpdir(), 'create-svadmin-guidance-cli-'));
  const customDesign = '# Customer design\n';

  try {
    await writeFile(join(projectDirectory, 'DESIGN.md'), customDesign);

    const dryRun = runCli(['guidance', projectDirectory]);
    expect(dryRun.status).toBe(0);
    expect(dryRun.stdout).toContain('Dry run only');
    expect(await readdir(projectDirectory)).toEqual(['DESIGN.md']);

    const write = runCli(['guidance', projectDirectory, '--write']);
    expect(write.status).toBe(0);
    expect(write.stdout).toContain('existing files were preserved');
    expect(await readFile(join(projectDirectory, 'DESIGN.md'), 'utf8')).toBe(customDesign);
    expect(await readFile(join(projectDirectory, 'AGENTS.md'), 'utf8')).toContain(
      'one event -> one primary feedback surface',
    );

    const repeat = runCli(['guidance', projectDirectory, '--write']);
    expect(repeat.status).toBe(0);
    expect(repeat.stdout).toContain('nothing was changed');
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
    expect(smokeOutput).toContain('packed guidance migration passed');
    expect(smokeOutput).toContain('packed infer generation passed');
  } finally {
    await rm(packDirectory, { recursive: true, force: true });
  }
}, 180_000);

test('infer CLI previews in dry-run and generates files on --write', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'create-svadmin-infer-cli-'));
  const schemaPath = join(tempDir, 'schema.graphql');
  const outDir = join(tempDir, 'src/resources');

  const sdl = `
    type Customer {
      id: ID!
      name: String!
      email: String!
      active: Boolean
    }
  `;

  try {
    await writeFile(schemaPath, sdl);

    // Dry run
    const dryRun = runCli(['infer', '--file', schemaPath, '--out-dir', outDir]);
    expect(dryRun.status).toBe(0);
    expect(dryRun.stdout).toContain('Dry run plan');
    expect(dryRun.stdout).toContain('customers.resource.ts');
    expect(dryRun.stdout).toContain('customers.schema.ts');

    // Write mode
    const writeRun = runCli(['infer', '--file', schemaPath, '--out-dir', outDir, '--write']);
    expect(writeRun.status).toBe(0);
    expect(writeRun.stdout).toContain('Written');

    const generatedResource = await readFile(join(outDir, 'customers.resource.ts'), 'utf8');
    expect(generatedResource).toContain("name: 'customers'");
    expect(generatedResource).toContain("key: 'email'");

    const generatedSchema = await readFile(join(outDir, 'customers.schema.ts'), 'utf8');
    expect(generatedSchema).toContain('export const CustomerSchema = Type.Object({');

    const generatedList = await readFile(join(outDir, 'customers/ListPage.svelte'), 'utf8');
    expect(generatedList).toContain('<ListPage resourceName="customers">');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
