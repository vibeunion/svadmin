import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { generateDeclarationBridges } from './generate-declaration-bridges.mjs';

const directories = [];

async function fixture(files) {
  const directory = await mkdtemp(join(tmpdir(), 'svadmin-declaration-bridges-'));
  directories.push(directory);
  for (const [path, content] of Object.entries(files)) {
    const file = join(directory, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return directory;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test('generates a bridge for explicit svelte.js declaration imports', async () => {
  const directory = await fixture({
    'index.d.ts': "export * from './runes.svelte.js';\nexport type { State } from './runes.svelte.js';\n",
    'runes.svelte.js': 'export function createState() {}\n',
    'runes.svelte.d.ts': 'export declare function createState(): void;\nexport default createState;\n',
  });

  expect(await generateDeclarationBridges(directory)).toBe(1);
  expect(await readFile(join(directory, 'runes.d.svelte.ts'), 'utf8'))
    .toBe("export * from './runes.svelte.js';\nexport { default } from './runes.svelte.js';\n");
});

test('ignores non-relative, missing and already bridged declarations', async () => {
  const directory = await fixture({
    'index.d.ts': [
      "export * from 'external.svelte.js';",
      "export * from './missing.svelte.js';",
      "export * from './existing.svelte.js';",
    ].join('\n'),
    'existing.svelte.js': 'export const value = 1;\n',
    'existing.svelte.d.ts': 'export declare const value: number;\n',
    'existing.d.svelte.ts': "export * from './existing.svelte.js';\n",
  });

  expect(await generateDeclarationBridges(directory)).toBe(0);
  expect(await readFile(join(directory, 'existing.d.svelte.ts'), 'utf8'))
    .toBe("export * from './existing.svelte.js';\n");
});

test('is idempotent across repeated builds', async () => {
  const directory = await fixture({
    'index.d.ts': "export * from './notifications.svelte.js';\n",
    'notifications.svelte.js': 'export const notify = () => {};\n',
    'notifications.svelte.d.ts': 'export declare const notify: () => void;\n',
  });

  expect(await generateDeclarationBridges(directory)).toBe(1);
  const first = await readFile(join(directory, 'notifications.d.svelte.ts'), 'utf8');
  expect(await generateDeclarationBridges(directory)).toBe(0);
  expect(await readFile(join(directory, 'notifications.d.svelte.ts'), 'utf8')).toBe(first);
});