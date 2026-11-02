import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listBlocks, planAddBlock, writeAddBlock } from './blocks';
import { parseAddArguments } from './add-command';

async function project(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'svadmin-block-'));
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'app', private: true }));
  return directory;
}

test('block registry lists installable materials with descriptions', () => {
  const blocks = listBlocks();
  expect(blocks.length).toBeGreaterThanOrEqual(3);
  expect(blocks.map((block) => block.name)).toContain('search-table');
  for (const block of blocks) {
    expect(block.title.length).toBeGreaterThan(0);
    expect(block.description.length).toBeGreaterThan(0);
  }
});

test('planAddBlock is dry-run by default and never writes', async () => {
  const directory = await project();
  try {
    const plan = planAddBlock(directory, 'search-table');
    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]?.relativePath).toBe('src/features/search-table/SearchTable.svelte');
    expect(plan.entries[0]?.exists).toBe(false);
    expect(plan.registrationHint).toContain('SearchTable.svelte');
    expect(existsSync(join(directory, 'src/features/search-table/SearchTable.svelte'))).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('writeAddBlock installs the block once and preserves existing files', async () => {
  const directory = await project();
  try {
    const first = writeAddBlock(planAddBlock(directory, 'settings-section'));
    expect(first.written).toEqual(['src/features/settings-section/SettingsSection.svelte']);
    expect(first.preserved).toEqual([]);

    const file = join(directory, 'src/features/settings-section/SettingsSection.svelte');
    expect(await readFile(file, 'utf8')).toContain('SettingsPage');

    const second = writeAddBlock(planAddBlock(directory, 'settings-section'));
    expect(second.written).toEqual([]);
    expect(second.preserved).toEqual(['src/features/settings-section/SettingsSection.svelte']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('planAddBlock rejects unknown blocks and unsafe names', async () => {
  const directory = await project();
  try {
    expect(() => planAddBlock(directory, 'nope')).toThrow(/Unknown block/);
    expect(() => planAddBlock(directory, '../escape')).toThrow(/Invalid block name/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('parseAddArguments accepts the block kind', () => {
  const options = parseAddArguments(['block', 'search-table', '--write']);
  expect(options.kind).toBe('block');
  expect(options.target).toBe('search-table');
  expect(options.write).toBe(true);
});