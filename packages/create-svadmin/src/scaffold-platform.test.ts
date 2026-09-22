import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ADMIN_AI_MANIFEST_FILENAME,
  ADMIN_SCHEMA_FILENAME,
  SCAFFOLD_CONFIG_PATH,
  buildAdminAiManifest,
  buildAdminSchemaJson,
  buildScaffoldPlatformFiles,
  buildSvadminConfigSource,
  checkAdminManifest,
} from './scaffold-platform';

test('config source wires the selected data and auth providers', () => {
  const simpleRest = buildSvadminConfigSource({
    projectName: 'demo-app',
    dataProvider: 'simple-rest',
    authProvider: 'mock',
  });
  expect(simpleRest).toContain("import { createProviderBundle, defineAdminConfig } from '@svadmin/app';");
  expect(simpleRest).toContain("import { createSimpleRestDataProvider } from '@svadmin/simple-rest';");
  expect(simpleRest).toContain("import { mockAuthProvider } from './providers/mockAuth';");
  expect(simpleRest).toContain("name: 'demo-app'");
  expect(simpleRest).toContain('dataProvider,');
  expect(simpleRest).toContain('authProvider: mockAuthProvider,');
  expect(simpleRest).toContain("import { resources } from './resources';");

  const supabase = buildSvadminConfigSource({
    projectName: 'supa',
    dataProvider: 'supabase',
    authProvider: 'supabase',
  });
  expect(supabase).toContain("import { createSupabaseDataProvider } from '@svadmin/supabase';");
  expect(supabase).toContain("import { createSupabaseAuthProvider } from '@svadmin/supabase';");
  expect(supabase).toContain("import { supabaseClient } from './providers/supabase';");
  expect(supabase).toContain('const dataProvider = createSupabaseDataProvider(supabaseClient);');
  expect(supabase).toContain('const authProvider = createSupabaseAuthProvider(supabaseClient);');
  expect(supabase).toContain('authProvider: authProvider,');
  expect(supabase).toContain('VITE_SUPABASE_URL');
});

test('custom data provider yields a typed placeholder instead of a broken import', () => {
  const source = buildSvadminConfigSource({
    projectName: 'custom',
    dataProvider: 'none',
    authProvider: 'none',
  });
  expect(source).toContain("import type { DataProvider } from '@svadmin/core';");
  expect(source).toContain('const dataProvider: DataProvider = {');
  expect(source).not.toContain('authProvider:');
});

test('AI manifest captures providers, resources, and guardrails', () => {
  const manifest = buildAdminAiManifest({
    projectName: 'shop',
    dataProvider: 'graphql',
    authProvider: 'jwt',
  });
  expect(manifest.version).toBe(1);
  expect(manifest.$schema).toBe(`./${ADMIN_SCHEMA_FILENAME}`);
  expect(manifest.project.name).toBe('shop');
  expect(manifest.project.entrypoints.config).toBe(SCAFFOLD_CONFIG_PATH);
  expect(manifest.project.entrypoints.manifest).toBe(ADMIN_AI_MANIFEST_FILENAME);
  expect(manifest.providers.data).toEqual({
    choice: 'graphql',
    package: '@svadmin/graphql',
    capabilities: ['data', 'graphql'],
  });
  expect(manifest.providers.auth.package).toBe('@svadmin/simple-rest');
  expect(manifest.resources.map((resource) => resource.name)).toEqual(['posts', 'users', 'comments', 'todos']);
  expect(manifest.routes[0]).toEqual({ resource: 'posts', path: '/posts', operations: ['list', 'create', 'edit', 'show', 'delete'] });
  expect(manifest.components.some((component) => component.name === 'AdminApp')).toBe(true);
  expect(manifest.components.find((component) => component.name === 'ResizableGrid')?.import).toBe('@svadmin/ui');
  expect(manifest.components.find((component) => component.name === 'AppFooter')?.import).toBe('@svadmin/ui');
  expect(manifest.components.find((component) => component.name === 'CodeEditor')?.import).toBe('@svadmin/ui/code-editor');
  expect(manifest.components.find((component) => component.name === 'JsonEditor')?.import).toBe('@svadmin/ui/json-editor');
  expect(manifest.components.find((component) => component.name === 'QRCode')?.import).toBe('@svadmin/ui/qr-code');
  expect(manifest.components.find((component) => component.name === 'CodeEditorPresets')?.import).toBe('@svadmin/ui/code-editor/presets');
  expect(manifest.providerCatalog.map((entry) => entry.name)).toContain('pocketbase');
  expect(manifest.providerCatalog.find((entry) => entry.name === 'hasura')?.capabilities).toEqual(['data', 'graphql', 'live']);
  expect(manifest.migration.scaffoldVersion).toBe('0.0.0');
  expect(manifest.migration.notes.length).toBeGreaterThan(0);
  expect(manifest.project.forbiddenImports).toContain('@svadmin/ui/src');
  expect(() => JSON.stringify(manifest)).not.toThrow();
});

test('buildScaffoldPlatformFiles emits the config, manifest, and schema entrypoints', () => {
  const files = buildScaffoldPlatformFiles({
    projectName: 'demo',
    dataProvider: 'simple-rest',
    authProvider: 'mock',
  });
  expect(files.config.path).toBe(SCAFFOLD_CONFIG_PATH);
  expect(files.aiManifest.path).toBe(ADMIN_AI_MANIFEST_FILENAME);
  expect(files.schema.path).toBe(ADMIN_SCHEMA_FILENAME);
  expect(JSON.parse(files.aiManifest.content).version).toBe(1);
  expect(JSON.parse(files.schema.content).$schema).toBe('https://json-schema.org/draft/2020-12/schema');
});

test('buildAdminSchemaJson requires the core manifest fields', () => {
  const schema = buildAdminSchemaJson();
  expect(schema['required']).toEqual(['version', 'project', 'providers', 'resources']);
});

test('checkAdminManifest flags provider core-range mismatches', async () => {
  const projectDirectory = await mkdtemp(join(tmpdir(), 'create-svadmin-provider-meta-'));
  try {
    await mkdir(join(projectDirectory, 'src'), { recursive: true });
    await writeFile(join(projectDirectory, SCAFFOLD_CONFIG_PATH), 'export default {};\n');
    await writeFile(
      join(projectDirectory, ADMIN_AI_MANIFEST_FILENAME),
      `${JSON.stringify(buildAdminAiManifest({ projectName: 'demo', dataProvider: 'simple-rest', authProvider: 'mock' }))}\n`,
    );
    await writeFile(join(projectDirectory, ADMIN_SCHEMA_FILENAME), `${JSON.stringify(buildAdminSchemaJson())}\n`);
    const project = {
      name: 'demo',
      dependencies: { '@svadmin/simple-rest': '^0.11.0', '@svadmin/core': '^0.55.0' },
    };

    const providerDirectory = join(projectDirectory, 'node_modules', '@svadmin', 'simple-rest');
    await mkdir(providerDirectory, { recursive: true });
    await writeFile(
      join(providerDirectory, 'package.json'),
      `${JSON.stringify({ name: '@svadmin/simple-rest', svadmin: { capabilities: ['data'], core: '^0.40.0' } })}\n`,
    );

    const issues = checkAdminManifest(projectDirectory, project);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('@svadmin/core ^0.40.0');

    await writeFile(
      join(providerDirectory, 'package.json'),
      `${JSON.stringify({ name: '@svadmin/simple-rest', svadmin: { capabilities: ['data'], core: '^0.55.0' } })}\n`,
    );
    expect(checkAdminManifest(projectDirectory, project)).toEqual([]);
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});

test('checkAdminManifest is opt-in and validates provider dependencies', async () => {
  const projectDirectory = await mkdtemp(join(tmpdir(), 'create-svadmin-manifest-'));
  const project = {
    name: 'demo',
    dependencies: { '@svadmin/simple-rest': '^0.11.0' },
  };

  try {
    expect(checkAdminManifest(projectDirectory, project)).toEqual([]);

    await mkdir(join(projectDirectory, 'src'), { recursive: true });
    await writeFile(join(projectDirectory, SCAFFOLD_CONFIG_PATH), 'export default {};\n');
    const missing = checkAdminManifest(projectDirectory, project);
    expect(missing).toHaveLength(1);
    expect(missing[0]?.message).toContain(`${ADMIN_AI_MANIFEST_FILENAME} is missing`);

    const manifest = buildAdminAiManifest({
      projectName: 'demo',
      dataProvider: 'simple-rest',
      authProvider: 'mock',
    });
    await writeFile(join(projectDirectory, ADMIN_AI_MANIFEST_FILENAME), `${JSON.stringify(manifest)}\n`);
    await writeFile(join(projectDirectory, ADMIN_SCHEMA_FILENAME), `${JSON.stringify(buildAdminSchemaJson())}\n`);
    expect(checkAdminManifest(projectDirectory, project)).toEqual([]);

    const driftManifest = buildAdminAiManifest({
      projectName: 'demo',
      dataProvider: 'supabase',
      authProvider: 'supabase',
    });
    await writeFile(join(projectDirectory, ADMIN_AI_MANIFEST_FILENAME), `${JSON.stringify(driftManifest)}\n`);
    const drift = checkAdminManifest(projectDirectory, project);
    expect(drift[0]?.message).toContain('@svadmin/supabase');

    await writeFile(join(projectDirectory, ADMIN_AI_MANIFEST_FILENAME), '{ invalid json');
    const invalid = checkAdminManifest(projectDirectory, project);
    expect(invalid[0]?.message).toContain('not valid JSON');
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
});