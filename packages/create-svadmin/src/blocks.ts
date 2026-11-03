/**
 * `svadmin add block` — installable page materials with lifecycle management.
 *
 * Capability parity with the Arco CLI material workflow, extended to the parts
 * that matter once a project has more than one material:
 * - a versioned manifest with content hashes and peer ranges;
 * - dry-run/JSON plans that CI can consume;
 * - upgrade and remove that refuse to clobber locally edited files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { AddPlanEntry, AddWriteResult } from './add-command';

export const MATERIAL_STATE_FILENAME = 'svadmin.materials.json';
export const MATERIAL_STATE_VERSION = 1;

export interface BlockMaterial {
  name: string;
  version: string;
  /** Minimum svadmin UI version the block was authored against. */
  peerRange: string;
  /** Packages the generated page imports. Kept aligned with scaffold-manifest.json. */
  requires: readonly string[];
  title: string;
  description: string;
  files(target: string): Record<string, string>;
  registrationHint: string;
}

export interface InstalledMaterial {
  version: string;
  /** path → sha256 of the file as installed. */
  files: Record<string, string>;
}

export interface MaterialState {
  version: typeof MATERIAL_STATE_VERSION;
  blocks: Record<string, InstalledMaterial>;
}

export type BlockEntryAction = 'create' | 'update' | 'skip' | 'conflict';

export interface BlockPlanEntry extends AddPlanEntry {
  action: BlockEntryAction;
  installedHash?: string;
}

export interface AddBlockPlan {
  projectDirectory: string;
  blockName: string;
  version: string;
  peerRange: string;
  requires: readonly string[];
  mode: 'install' | 'upgrade' | 'remove';
  entries: BlockPlanEntry[];
  statePath: string;
  nextState: MaterialState;
  registrationHint: string;
}

const BLOCK_NAME_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;

function pageSource(body: string, imports: string, script = ''): string {
  return `<script lang="ts">
${imports}${script ? `\n${script}\n` : ''}</script>

${body}
`;
}

export const BLOCKS: readonly BlockMaterial[] = [
  {
    name: 'search-table',
    version: '1.0.0',
    peerRange: '^0.111.0',
    requires: ['@svadmin/ui'],
    title: 'Search table',
    description: 'Filter form + bulk actions + paginated resource table (Pro "search table" shape).',
    registrationHint:
      'Mount the page from your app shell or add a route:\n  import SearchTable from \'./features/search-table/SearchTable.svelte\';',
    files: (target) => ({
      [`src/features/${target}/SearchTable.svelte`]: pageSource(
        `<PageHeader title="Search table" description="Filter, act, and page through one resource.">
  {#snippet actions()}
    <Button variant="ghost" href="/${target}/new">New record</Button>
  {/snippet}
  <div class="flex flex-col gap-4">
    <AutoForm resourceName="records" mode="filter" submitLabel="Apply filters" />
    <AutoTable resourceName="records" syncWithLocation selectable showBulkActions />
  </div>
</PageHeader>`,
        `  import { AutoForm, AutoTable, Button, PageHeader } from '@svadmin/ui';`,
      ),
    }),
  },
  {
    name: 'record-detail',
    version: '1.0.0',
    peerRange: '^0.111.0',
    requires: ['@svadmin/ui'],
    title: 'Record detail',
    description: 'Read-only record detail with header actions and audit drawer.',
    registrationHint:
      'Mount the page from your app shell or add a route:\n  import RecordDetail from \'./features/record-detail/RecordDetail.svelte\';',
    files: (target) => ({
      [`src/features/${target}/RecordDetail.svelte`]: pageSource(
        `<ShowPage resourceName="records" recordId={recordId}>
  {#snippet actions()}
    <Button variant="outline" href="/${target}">Back to list</Button>
    <AuditLogDrawer resourceName="records" recordId={recordId} />
  {/snippet}
</ShowPage>`,
        `  import { AuditLogDrawer, Button, ShowPage } from '@svadmin/ui';`,
        `  let { recordId }: { recordId: string } = $props();`,
      ),
    }),
  },
  {
    name: 'settings-section',
    version: '1.0.0',
    peerRange: '^0.111.0',
    requires: ['@svadmin/ui'],
    title: 'Settings section',
    description: 'Tabbed settings composition with basic, security, and notification panes.',
    registrationHint:
      'Mount the page from your app shell or add a route:\n  import SettingsSection from \'./features/settings-section/SettingsSection.svelte\';',
    files: (target) => ({
      [`src/features/${target}/SettingsSection.svelte`]: pageSource(
        `<SettingsPage title="Workspace settings" description="Profile, security, and notification preferences.">
  {#snippet basic()}
    <NotificationSettings />
  {/snippet}
  {#snippet security()}
    <SecuritySettings />
  {/snippet}
  {#snippet notifications()}
    <NotificationsSettings />
  {/snippet}
</SettingsPage>`,
        `  import {
    NotificationSettings,
    NotificationsSettings,
    SecuritySettings,
    SettingsPage,
  } from '@svadmin/ui';`,
      ),
    }),
  },
];

export function listBlocks(): ReadonlyArray<Pick<BlockMaterial, 'name' | 'version' | 'peerRange' | 'requires' | 'title' | 'description'>> {
  return BLOCKS.map(({ name, version, peerRange, requires, title, description }) => ({
    name, version, peerRange, requires, title, description,
  }));
}

export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function emptyState(): MaterialState {
  return { version: MATERIAL_STATE_VERSION, blocks: {} };
}

export function materialStatePath(projectDirectory: string): string {
  return path.join(projectDirectory, MATERIAL_STATE_FILENAME);
}

/** Read the installed-material ledger; a malformed file fails loudly instead of guessing. */
export function readMaterialState(projectDirectory: string): MaterialState {
  const statePath = materialStatePath(projectDirectory);
  if (!fs.existsSync(statePath)) return emptyState();
  const parsed: unknown = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Reflect.get(parsed, 'version') !== MATERIAL_STATE_VERSION) {
    throw new Error(`${MATERIAL_STATE_FILENAME}: unsupported or malformed material state`);
  }
  const blocks = Reflect.get(parsed, 'blocks');
  if (typeof blocks !== 'object' || blocks === null || Array.isArray(blocks)) {
    throw new Error(`${MATERIAL_STATE_FILENAME}: blocks must be an object`);
  }
  const result: MaterialState = emptyState();
  for (const [name, value] of Object.entries(blocks as Record<string, unknown>)) {
    if (!BLOCK_NAME_PATTERN.test(name)) throw new Error(`${MATERIAL_STATE_FILENAME}: invalid block name "${name}"`);
    if (typeof value !== 'object' || value === null) throw new Error(`${MATERIAL_STATE_FILENAME}: invalid entry for "${name}"`);
    const version = Reflect.get(value, 'version');
    const files = Reflect.get(value, 'files');
    if (typeof version !== 'string' || typeof files !== 'object' || files === null || Array.isArray(files)) {
      throw new Error(`${MATERIAL_STATE_FILENAME}: invalid entry for "${name}"`);
    }
    const recorded: Record<string, string> = {};
    for (const [filePath, hash] of Object.entries(files as Record<string, unknown>)) {
      if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) {
        throw new Error(`${MATERIAL_STATE_FILENAME}: invalid hash for "${name}/${filePath}"`);
      }
      recorded[filePath] = hash;
    }
    result.blocks[name] = { version, files: recorded };
  }
  return result;
}

function writeMaterialState(projectDirectory: string, state: MaterialState): void {
  const statePath = materialStatePath(projectDirectory);
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function requireProject(projectDirectory: string): void {
  if (!fs.existsSync(path.join(projectDirectory, 'package.json'))) {
    throw new Error(`Not a Node project: ${path.join(projectDirectory, 'package.json')} is missing`);
  }
}

export function findBlock(name: string): BlockMaterial {
  if (!BLOCK_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid block name "${name}"; use lowercase letters, digits, and dashes`);
  }
  const block = BLOCKS.find((candidate) => candidate.name === name);
  if (block === undefined) {
    throw new Error(`Unknown block "${name}"; available blocks: ${BLOCKS.map((candidate) => candidate.name).join(', ')}`);
  }
  return block;
}

/**
 * Plan install/upgrade/remove without writing.
 *
 * Conflict rules are intentionally conservative: a file that exists but does not
 * match the recorded hash is treated as locally owned and never overwritten.
 */
export function planAddBlock(
  projectDirectory: string,
  blockName: string,
  options: { mode?: 'install' | 'upgrade' | 'remove' } = {},
): AddBlockPlan {
  requireProject(projectDirectory);
  const block = findBlock(blockName);
  const state = readMaterialState(projectDirectory);
  const installed = state.blocks[block.name];
  const mode = options.mode ?? (installed ? 'upgrade' : 'install');
  if (mode !== 'install' && installed === undefined) {
    throw new Error(`Block "${block.name}" is not installed in ${projectDirectory}`);
  }

  const nextState: MaterialState = {
    version: MATERIAL_STATE_VERSION,
    blocks: { ...state.blocks },
  };
  const entries: BlockPlanEntry[] = [];

  for (const [relativePath, content] of Object.entries(block.files(block.name))) {
    const filePath = path.join(projectDirectory, relativePath);
    const exists = fs.existsSync(filePath);
    const currentHash = exists ? sha256(fs.readFileSync(filePath, 'utf8')) : undefined;
    const installedHash = installed?.files[relativePath];
    const contentHash = sha256(content);
    const base = { relativePath, filePath, content, exists, ...(installedHash ? { installedHash } : {}) };

    if (mode === 'remove') {
      if (!exists) entries.push({ ...base, action: 'skip' });
      else if (currentHash === installedHash) entries.push({ ...base, action: 'update' });
      else entries.push({ ...base, action: 'conflict' });
      continue;
    }

    if (!exists) entries.push({ ...base, action: 'create' });
    else if (currentHash === contentHash) entries.push({ ...base, action: 'skip' });
    else if (installedHash === undefined) entries.push({ ...base, action: 'conflict' });
    else if (currentHash === installedHash) entries.push({ ...base, action: 'update' });
    else entries.push({ ...base, action: 'conflict' });
  }

  const previousFiles = installed?.files ?? {};
  const removed = new Set(entries
    .filter((entry) => mode === 'remove' && (entry.action === 'update' || entry.action === 'skip'))
    .map((entry) => entry.relativePath));
  const ownedFiles: Record<string, string> = {};
  for (const [file, hash] of Object.entries(previousFiles)) {
    if (!removed.has(file)) ownedFiles[file] = hash;
  }
  if (mode !== 'remove') {
    for (const entry of entries) {
      if (entry.action !== 'conflict') ownedFiles[entry.relativePath] = sha256(entry.content);
    }
  }
  const conflicted = entries.some((entry) => entry.action === 'conflict');
  const keepBlock = mode === 'remove'
    ? conflicted && installed !== undefined
    : Object.keys(ownedFiles).length > 0;
  const blocks = Object.fromEntries(Object.entries(nextState.blocks).filter(([name]) => name !== block.name));
  if (keepBlock) {
    blocks[block.name] = {
      version: conflicted && installed !== undefined ? installed.version : block.version,
      files: ownedFiles,
    };
  }
  nextState.blocks = blocks;

  return {
    projectDirectory,
    blockName: block.name,
    version: block.version,
    peerRange: block.peerRange,
    requires: block.requires,
    mode,
    entries,
    statePath: materialStatePath(projectDirectory),
    nextState,
    registrationHint: block.registrationHint,
  };
}

export function writeAddBlock(plan: AddBlockPlan): AddWriteResult & { conflicts: string[] } {
  const written: string[] = [];
  const preserved: string[] = [];
  const conflicts: string[] = [];
  for (const entry of plan.entries) {
    if (entry.action === 'conflict') {
      conflicts.push(entry.relativePath);
      preserved.push(entry.relativePath);
      continue;
    }
    if (entry.action === 'skip') {
      preserved.push(entry.relativePath);
      continue;
    }
    if (plan.mode === 'remove') {
      fs.rmSync(entry.filePath, { force: true });
      written.push(entry.relativePath);
      continue;
    }
    fs.mkdirSync(path.dirname(entry.filePath), { recursive: true });
    fs.writeFileSync(entry.filePath, entry.content);
    written.push(entry.relativePath);
  }
  writeMaterialState(plan.projectDirectory, plan.nextState);
  return { written, preserved, conflicts };
}

/** Serializable plan for `--json`; relative paths only, no file contents. */
export function serializeAddBlockPlan(plan: AddBlockPlan) {
  return {
    block: plan.blockName,
    version: plan.version,
    peerRange: plan.peerRange,
    peerRanges: [plan.peerRange],
    requires: plan.requires,
    mode: plan.mode,
    statePath: MATERIAL_STATE_FILENAME,
    files: plan.entries.map((entry) => ({ path: entry.relativePath, sha256: sha256(entry.content) })),
    entries: plan.entries.map((entry) => ({
      path: entry.relativePath,
      action: entry.action,
      sha256: sha256(entry.content),
      ...(entry.installedHash ? { installedHash: entry.installedHash } : {}),
    })),
    needsWrite: plan.entries.some((entry) => entry.action === 'create' || entry.action === 'update'),
  };
}
