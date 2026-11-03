import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  listBlocks,
  planAddBlock,
  readMaterialState,
  serializeAddBlockPlan,
  writeAddBlock,
} from './blocks';
import { parseAddArguments } from './add-command';

async function project(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'svadmin-block-'));
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'app', private: true }));
  return directory;
}

test('block registry exposes version and peer range', () => {
  const blocks = listBlocks();
  expect(blocks.map((block) => block.name)).toContain('search-table');
  for (const block of blocks) {
    expect(block.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(block.peerRange.length).toBeGreaterThan(0);
    expect(block.requires).toContain('@svadmin/ui');
  }
});

test('install records a hash ledger and is idempotent', async () => {
  const directory = await project();
  try {
    const plan = planAddBlock(directory, 'search-table');
    expect(plan.mode).toBe('install');
    expect(plan.entries[0]?.action).toBe('create');
    expect(existsSync(join(directory, 'src/features/search-table/SearchTable.svelte'))).toBe(false);

    const result = writeAddBlock(plan);
    expect(result.conflicts).toEqual([]);
    const state = readMaterialState(directory);
    expect(state.blocks['search-table']?.version).toBe('1.0.0');
    expect(Object.keys(state.blocks['search-table']?.files ?? {})).toHaveLength(1);

    const again = planAddBlock(directory, 'search-table', { mode: 'upgrade' });
    expect(again.entries[0]?.action).toBe('skip');
    expect(writeAddBlock(again).written).toEqual([]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('locally edited files are conflicts and are never overwritten', async () => {
  const directory = await project();
  try {
    writeAddBlock(planAddBlock(directory, 'settings-section'));
    const file = join(directory, 'src/features/settings-section/SettingsSection.svelte');
    await writeFile(file, '<!-- local change -->\n');

    const plan = planAddBlock(directory, 'settings-section', { mode: 'upgrade' });
    expect(plan.entries[0]?.action).toBe('conflict');
    const result = writeAddBlock(plan);
    expect(result.conflicts).toEqual(['src/features/settings-section/SettingsSection.svelte']);
    expect(await readFile(file, 'utf8')).toBe('<!-- local change -->\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('unmanaged files at the target path are conflicts, not silent overwrites', async () => {
  const directory = await project();
  try {
    const file = join(directory, 'src/features/record-detail/RecordDetail.svelte');
    await writeFile(file, '<!-- pre-existing -->\n', { encoding: 'utf8' }).catch(async () => {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(join(directory, 'src/features/record-detail'), { recursive: true });
      await writeFile(file, '<!-- pre-existing -->\n');
    });
    const plan = planAddBlock(directory, 'record-detail');
    expect(plan.entries[0]?.action).toBe('conflict');
    expect(writeAddBlock(plan).written).toEqual([]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('remove deletes only unmodified owned files and clears the ledger', async () => {
  const directory = await project();
  try {
    writeAddBlock(planAddBlock(directory, 'search-table'));
    const plan = planAddBlock(directory, 'search-table', { mode: 'remove' });
    expect(plan.entries[0]?.action).toBe('update');
    const result = writeAddBlock(plan);
    expect(result.written).toEqual(['src/features/search-table/SearchTable.svelte']);
    expect(readMaterialState(directory).blocks['search-table']).toBeUndefined();

    expect(() => planAddBlock(directory, 'search-table', { mode: 'remove' })).toThrow(/not installed/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('json plan is serializable and contains no file contents', async () => {
  const directory = await project();
  try {
    writeAddBlock(planAddBlock(directory, 'search-table'));
    const payload = serializeAddBlockPlan(planAddBlock(directory, 'search-table', { mode: 'upgrade' }));
    expect(payload.mode).toBe('upgrade');
    expect(payload.requires).toContain('@svadmin/ui');
    expect(payload.entries[0]?.action).toBe('skip');
    expect(payload.entries[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(payload)).not.toContain('<script');
    expect(JSON.stringify(payload)).not.toContain('pageSource');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a malformed material ledger fails loudly', async () => {
  const directory = await project();
  try {
    await writeFile(join(directory, 'svadmin.materials.json'), JSON.stringify({ version: 2, blocks: {} }));
    expect(() => planAddBlock(directory, 'search-table')).toThrow(/unsupported or malformed/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('parseAddArguments understands lifecycle flags and rejects invalid combinations', () => {
  const options = parseAddArguments(['block', 'search-table', '--upgrade', '--json', '--write']);
  expect(options).toMatchObject({ kind: 'block', upgrade: true, json: true, write: true, remove: false });
  expect(() => parseAddArguments(['block', 'x', '--upgrade', '--remove'])).toThrow(/mutually exclusive/);
  expect(() => parseAddArguments(['resource', 'orders', '--remove'])).toThrow(/only apply to/);
  expect(() => parseAddArguments(['block', 'search-table', '--dry-run', '--write'])).toThrow(/mutually exclusive/);
  const dryRun = parseAddArguments(['block', 'search-table', '--dry-run', '--json']);
  expect(dryRun.write).toBe(false);
  expect(dryRun.json).toBe(true);
});

test('a conflict does not drop the installed hash or claim the upgrade', async () => {
  const directory = await project();
  try {
    writeAddBlock(planAddBlock(directory, 'search-table'));
    const before = readMaterialState(directory).blocks['search-table'];
    const file = join(directory, 'src/features/search-table/SearchTable.svelte');
    await writeFile(file, '<!-- local change -->\n');
    const plan = planAddBlock(directory, 'search-table', { mode: 'upgrade' });
    writeAddBlock(plan);
    const after = readMaterialState(directory).blocks['search-table'];
    expect(after?.version).toBe(before?.version);
    expect(after?.files['src/features/search-table/SearchTable.svelte']).toBe(
      before?.files['src/features/search-table/SearchTable.svelte'],
    );
    expect(await readFile(file, 'utf8')).toBe('<!-- local change -->\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('block peer ranges match the scaffold UI dependency', async () => {
  const manifest = JSON.parse(await readFile(join(import.meta.dir, '..', 'scaffold-manifest.json'), 'utf8')) as {
    dependencies: Record<string, string>;
  };
  const uiVersion = manifest.dependencies['@svadmin/ui'];
  if (uiVersion === undefined) throw new Error('scaffold-manifest.json is missing @svadmin/ui');
  for (const block of listBlocks()) expect(block.peerRange).toBe(uiVersion);
});
