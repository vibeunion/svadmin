/**
 * `svadmin add block` — installable page materials.
 *
 * Capability parity with the Arco CLI material workflow: a versioned registry of
 * page blocks that can be listed and installed into a project without a network
 * call. Blocks are generated from this module, so `--list` and installation
 * always agree.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { AddPlanEntry, AddWriteResult } from './add-command';

export interface BlockMaterial {
  name: string;
  title: string;
  description: string;
  /** Files relative to the project root. */
  files(target: string): Record<string, string>;
  registrationHint: string;
}

const BLOCK_NAME_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;

function pageSource(component: string, body: string, imports: string, script: string): string {
  return `<script lang="ts">
${imports}${script ? `\n${script}\n` : ''}</script>

${body}
`;
}

const BLOCKS: readonly BlockMaterial[] = [
  {
    name: 'search-table',
    title: 'Search table',
    description: 'Filter form + bulk actions + paginated resource table (Pro "search table" shape).',
    registrationHint:
      'Mount the page from your app shell or add a route:\n  import SearchTable from \'./features/search-table/SearchTable.svelte\';',
    files: (target) => ({
      [`src/features/${target}/SearchTable.svelte`]: pageSource(
        'SearchTable',
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
        '',
      ),
    }),
  },
  {
    name: 'record-detail',
    title: 'Record detail',
    description: 'Read-only record detail with header actions and audit drawer.',
    registrationHint:
      'Mount the page from your app shell or add a route:\n  import RecordDetail from \'./features/record-detail/RecordDetail.svelte\';',
    files: (target) => ({
      [`src/features/${target}/RecordDetail.svelte`]: pageSource(
        'RecordDetail',
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
    title: 'Settings section',
    description: 'Tabbed settings composition with basic, security, and notification panes.',
    registrationHint:
      'Mount the page from your app shell or add a route:\n  import SettingsSection from \'./features/settings-section/SettingsSection.svelte\';',
    files: (target) => ({
      [`src/features/${target}/SettingsSection.svelte`]: pageSource(
        'SettingsSection',
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
        '',
      ),
    }),
  },
];

export function listBlocks(): ReadonlyArray<Pick<BlockMaterial, 'name' | 'title' | 'description'>> {
  return BLOCKS.map(({ name, title, description }) => ({ name, title, description }));
}

export function planAddBlock(projectDirectory: string, blockName: string): {
  projectDirectory: string;
  blockName: string;
  entries: AddPlanEntry[];
  registrationHint: string;
} {
  if (!fs.existsSync(path.join(projectDirectory, 'package.json'))) {
    throw new Error(`Not a Node project: ${path.join(projectDirectory, 'package.json')} is missing`);
  }
  if (!BLOCK_NAME_PATTERN.test(blockName)) {
    throw new Error(
      `Invalid block name "${blockName}"; use lowercase letters, digits, and dashes`,
    );
  }
  const block = BLOCKS.find((candidate) => candidate.name === blockName);
  if (block === undefined) {
    const available = BLOCKS.map((candidate) => candidate.name).join(', ');
    throw new Error(`Unknown block "${blockName}"; available blocks: ${available}`);
  }
  const entries = Object.entries(block.files(blockName)).map(([relativePath, content]) => ({
    relativePath,
    content,
    filePath: path.join(projectDirectory, relativePath),
    exists: fs.existsSync(path.join(projectDirectory, relativePath)),
  }));
  return {
    projectDirectory,
    blockName,
    entries,
    registrationHint: block.registrationHint,
  };
}

export function writeAddBlock(plan: {
  entries: AddPlanEntry[];
}): AddWriteResult {
  const written: string[] = [];
  const preserved: string[] = [];
  for (const entry of plan.entries) {
    if (entry.exists || fs.existsSync(entry.filePath)) {
      preserved.push(entry.relativePath);
      continue;
    }
    fs.mkdirSync(path.dirname(entry.filePath), { recursive: true });
    fs.writeFileSync(entry.filePath, entry.content);
    written.push(entry.relativePath);
  }
  return { written, preserved };
}