import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  addCommand,
  parseAddArguments,
  planAddProvider,
  planAddResource,
  writeAddResource,
} from './add-command';
import { loadScaffoldManifest } from './project-manifest';
import { ADMIN_AI_MANIFEST_FILENAME, buildAdminAiManifest } from './scaffold-platform';

const scaffold = loadScaffoldManifest(resolve(import.meta.dir, '..', 'scaffold-manifest.json'));

async function makeProject(): Promise<string> {
  const projectDirectory = await mkdtemp(join(tmpdir(), 'create-svadmin-add-'));
  await writeFile(
    join(projectDirectory, 'package.json'),
    `${JSON.stringify({ name: 'demo', private: true, type: 'module', dependencies: {}, devDependencies: {} }, null, 2)}\n`,
  );
  return projectDirectory;
}

test('parseAddArguments accepts kinds, --write, and --project-dir', () => {
  expect(parseAddArguments(['resource', 'orders']).kind).toBe('resource');
  expect(parseAddArguments(['provider', 'supabase', '--write']).write).toBe(true);
  const withDir = parseAddArguments(['auth', 'jwt', '--project-dir', '/tmp/x']);
  expect(withDir.projectDirectory).toBe(resolve('/tmp/x'));
  expect(() => parseAddArguments(['resource'])).toThrow(/exactly one target/);
  expect(() => parseAddArguments(['unknown', 'x'])).toThrow(/Usage: create-svadmin add/);
  expect(() => parseAddArguments(['resource', 'a', '--project-dir'])).toThrow(/requires a value/);
});

test('planAddResource creates a feature module and is idempotent', async () => {
  const projectDirectory = await makeProject();
  try {
    const plan = planAddResource(projectDirectory, 'order_items');
    expect(plan.entries.map((entry) => entry.relativePath)).toEqual([
      'src/features/order_items/index.ts',
      'src/features/order_items/order_items.resource.ts',
    ]);
    expect(plan.entries.every((entry) => !entry.exists)).toBe(true);

    const first = writeAddResource(plan);
    expect(first.written).toHaveLength(2);
    expect(existsSync(join(projectDirectory, 'src/features/order_items/order_items.resource.ts'))).toBe(true);

    const second = writeAddResource(planAddResource(projectDirectory, 'order_items'));
    expect(second.written).toHaveLength(0);
    expect(second.preserved).toHaveLength(2);
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});

test('planAddResource rejects invalid names', async () => {
  const projectDirectory = await makeProject();
  try {
    expect(() => planAddResource(projectDirectory, 'Order-Items')).toThrow(/Invalid resource name/);
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});

test('planAddProvider adds missing dependency packs only once and updates the manifest', async () => {
  const projectDirectory = await makeProject();
  try {
    const first = planAddProvider(projectDirectory, scaffold, 'provider', 'supabase');
    expect(first.addedDependencies.map((dependency) => dependency.packageName)).toContain('@svadmin/supabase');
    expect(first.updatedPackageJson?.dependencies?.['@svadmin/supabase']).toBeDefined();

    await writeFile(join(projectDirectory, 'package.json'), `${JSON.stringify(first.updatedPackageJson, null, 2)}\n`);
    await writeFile(
      join(projectDirectory, ADMIN_AI_MANIFEST_FILENAME),
      `${JSON.stringify(buildAdminAiManifest({ projectName: 'demo', dataProvider: 'simple-rest', authProvider: 'mock' }))}\n`,
    );

    const second = planAddProvider(projectDirectory, scaffold, 'provider', 'supabase');
    expect(second.addedDependencies).toEqual([]);
    expect(second.updatedPackageJson).toBeNull();
    expect(second.updatedManifest?.providers.data.choice).toBe('supabase');
    expect(second.updatedManifest?.providers.data.package).toBe('@svadmin/supabase');
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});

test('planAddProvider rejects unknown choices', async () => {
  const projectDirectory = await makeProject();
  try {
    expect(() => planAddProvider(projectDirectory, scaffold, 'auth', 'oidc' as never)).toThrow(/Unknown auth/);
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});

test('addCommand dry run does not write files', async () => {
  const projectDirectory = await makeProject();
  try {
    addCommand(['resource', 'notes', '--project-dir', projectDirectory], scaffold);
    expect(existsSync(join(projectDirectory, 'src/features/notes/notes.resource.ts'))).toBe(false);
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});

test('addCommand --write updates package.json and manifest', async () => {
  const projectDirectory = await makeProject();
  try {
    await mkdir(join(projectDirectory, 'src'), { recursive: true });
    await writeFile(join(projectDirectory, 'src', 'svadmin.config.ts'), 'export default {};\n');
    await writeFile(
      join(projectDirectory, ADMIN_AI_MANIFEST_FILENAME),
      `${JSON.stringify(buildAdminAiManifest({ projectName: 'demo', dataProvider: 'simple-rest', authProvider: 'mock' }))}\n`,
    );

    addCommand(['provider', 'graphql', '--project-dir', projectDirectory, '--write'], scaffold);

    const packageJson = JSON.parse(await readFile(join(projectDirectory, 'package.json'), 'utf8'));
    expect(packageJson.dependencies['@svadmin/graphql']).toBeDefined();
    const manifest = JSON.parse(await readFile(join(projectDirectory, ADMIN_AI_MANIFEST_FILENAME), 'utf8'));
    expect(manifest.providers.data.choice).toBe('graphql');
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});