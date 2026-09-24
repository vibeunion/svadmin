import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { INIT_PRESETS, parseInitArguments, resolvePresetSelections } from './init-arguments';
import { ADMIN_AI_MANIFEST_FILENAME, ADMIN_SCHEMA_FILENAME, SCAFFOLD_CONFIG_PATH } from './scaffold-platform';

const cliEntry = resolve(import.meta.dir, 'index.ts');

test('parseInitArguments captures presets, providers, and install flags', () => {
  const preset = parseInitArguments(['my-app', '--preset', 'supabase', '--no-install']);
  expect(preset.projectName).toBe('my-app');
  expect(preset.preset).toBe('supabase');
  expect(preset.installDependencies).toBe(false);

  const explicit = parseInitArguments(['--data-provider', 'graphql', '--auth-provider', 'none', '--install']);
  expect(explicit.dataProvider).toBe('graphql');
  expect(explicit.authProvider).toBe('none');
  expect(explicit.installDependencies).toBe(true);
});

test('parseInitArguments rejects unknown presets, providers, and extra positionals', () => {
  expect(() => parseInitArguments(['--preset', 'sveltekit'])).toThrow(/Unknown preset/);
  expect(() => parseInitArguments(['--data-provider', 'mysql'])).toThrow(/Unknown data provider/);
  expect(() => parseInitArguments(['--auth-provider', 'oidc'])).toThrow(/Unknown auth provider/);
  expect(() => parseInitArguments(['a', 'b'])).toThrow(/Unexpected argument/);
  expect(() => parseInitArguments(['--preset'])).toThrow(/requires a value/);
});

test('resolvePresetSelections applies presets and explicit overrides', () => {
  expect(resolvePresetSelections({ preset: 'rest' })).toEqual(INIT_PRESETS.rest);
  expect(resolvePresetSelections({ preset: 'supabase', authProvider: 'none' }))
    .toEqual({ dataProvider: 'supabase', authProvider: 'none' });
  expect(resolvePresetSelections({ dataProvider: 'simple-rest', authProvider: 'mock' }))
    .toEqual({ dataProvider: 'simple-rest', authProvider: 'mock' });
  expect(resolvePresetSelections({ dataProvider: 'simple-rest' })).toBeUndefined();
  expect(resolvePresetSelections({})).toBeUndefined();
});

test('init runs non-interactively with a preset and writes platform files', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'create-svadmin-preset-'));
  const projectDirectory = join(parent, 'rest-app');
  try {
    const run = spawnSync(process.execPath, [cliEntry, projectDirectory, '--preset', 'rest', '--no-install'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(run.status).toBe(0);
    expect(existsSync(join(projectDirectory, SCAFFOLD_CONFIG_PATH))).toBe(true);
    expect(existsSync(join(projectDirectory, ADMIN_AI_MANIFEST_FILENAME))).toBe(true);
    expect(existsSync(join(projectDirectory, ADMIN_SCHEMA_FILENAME))).toBe(true);
    expect(existsSync(join(projectDirectory, 'src/providers/supabase.ts'))).toBe(false);
    expect(existsSync(join(projectDirectory, 'patches/bits-ui@2.19.0.patch'))).toBe(true);

    const manifest = JSON.parse(readFileSync(join(projectDirectory, ADMIN_AI_MANIFEST_FILENAME), 'utf8'));
    expect(manifest.providers.data.choice).toBe('simple-rest');
    expect(manifest.providers.auth.choice).toBe('jwt');

    const config = readFileSync(join(projectDirectory, SCAFFOLD_CONFIG_PATH), 'utf8');
    expect(config).toContain("import { createSimpleRestDataProvider } from '@svadmin/simple-rest';");
    expect(config).toContain('createSimpleRestAuthProvider');
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
