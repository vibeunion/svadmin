import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const matrixPath = 'docs/ui-state-matrix.md';
const e2ePath = 'e2e/ui-state-contracts.spec.ts';
const workflowPath = '.github/workflows/ci.yml';
const pullRequestTemplatePath = '.github/pull_request_template.md';

if (!existsSync(matrixPath) || !existsSync(e2ePath) || !existsSync(workflowPath) || !existsSync(pullRequestTemplatePath)) {
  throw new Error('UI evidence contract files are missing');
}

const matrix = readFileSync(matrixPath, 'utf8');
const e2e = readFileSync(e2ePath, 'utf8');
const workflow = readFileSync(workflowPath, 'utf8');
const pullRequestTemplate = readFileSync(pullRequestTemplatePath, 'utf8');

for (const heading of ['MediaThumbnail', 'FilterToolbar', 'Collapsible containers', 'Browser evidence', 'Repository audit']) {
  if (!matrix.includes(`## ${heading}`)) throw new Error(`Missing state matrix section: ${heading}`);
}
for (const token of ['1440, height: 900', '1920, height: 1080', 'page.screenshot', 'media-state', 'aria-expanded']) {
  if (!e2e.includes(token)) throw new Error(`Missing browser evidence token: ${token}`);
}
if (!workflow.includes('bun scripts/ui-state-evidence-check.ts') || !workflow.includes('git diff --check') || !workflow.includes('two distinct screenshot attachments')) {
  throw new Error('CI must run the UI evidence contract and git diff --check');
}
for (const token of ['状态矩阵', '1440x900', '1920x1080', 'git diff --check', 'Playwright']) {
  if (!pullRequestTemplate.includes(token)) throw new Error(`Missing PR evidence requirement: ${token}`);
}

const pageDirectory = 'example/src/pages';
const pageFiles = readdirSync(pageDirectory).filter((name) => name.endsWith('.svelte'));
const violations: string[] = [];
for (const pageFile of pageFiles) {
  const source = readFileSync(join(pageDirectory, pageFile), 'utf8');
  if (/<img\b/u.test(source)) violations.push(`${pageFile}: use MediaThumbnail or a semantic media component instead of a page-level img preview`);
  if (/<details\b(?![^>]*(?:svadmin-collapsible|data-svadmin-collapsible))/u.test(source)) violations.push(`${pageFile}: scope details collapse styling with an svadmin hook`);
  for (const match of source.matchAll(/min-h-\[(\d+)px\]/gu)) {
    if (Number(match[1]) >= 160) violations.push(`${pageFile}: remove fixed empty-shell minimum height ${match[0]}`);
  }
}
for (const sharedFile of ['packages/ui/src/components/EmptyState.svelte', 'packages/ui/src/components/ErrorComponent.svelte', 'packages/ui/src/components/account/MembersStarterPage.svelte', 'packages/ui/src/components/content/SystemErrorState.svelte', 'packages/ui/src/components/TaskQueueDrawer.svelte']) {
  const source = readFileSync(sharedFile, 'utf8');
  if (/min-h-\[(?:160|[2-9]\d{2,}|\d{4,})px\]/u.test(source) || /min-h-\[(?:2|3|4|5|6|7|8)\drem\]/u.test(source)) {
    violations.push(`${sharedFile}: remove fixed empty-state minimum height`);
  }
}
const repeatedMediaSource = readFileSync('packages/ui/src/components/content/ProjectCard.svelte', 'utf8');
if (/<img\b/u.test(repeatedMediaSource) || !repeatedMediaSource.includes('MediaThumbnail')) {
  violations.push('packages/ui/src/components/content/ProjectCard.svelte: use the shared MediaThumbnail state machine');
}
for (const liteFile of ['packages/lite/src/components/LiteShowField.svelte', 'packages/lite/src/components/fields/LiteImageField.svelte']) {
  const source = readFileSync(liteFile, 'utf8');
  if (/<img\b/u.test(source) || !source.includes('LiteMediaThumbnail')) violations.push(`${liteFile}: use LiteMediaThumbnail for repeated lite media states`);
}
if (violations.length > 0) throw new Error(`UI repository audit failed:\n${violations.join('\n')}`);

const allowedImageOwners = new Set([
  'packages/ui/src/components/ProfilePage.svelte',
  'packages/ui/src/components/TenantSwitcher.svelte',
  'packages/ui/src/components/ThemedTitle.svelte',
  'packages/ui/src/components/fields/AvatarField.svelte',
  'packages/ui/src/components/profile/ProfileCard.svelte',
  'packages/ui/src/components/ui/avatar/avatar.svelte',
  'packages/ui/src/components/content/MediaThumbnail.svelte',
  'packages/lite/src/components/LiteMediaThumbnail.svelte',
  'packages/lite/src/components/compatibility/LiteVisualFallback.svelte',
]);
const mediaFiles = [
  ...readdirSync('packages/ui/src/components', { recursive: true }).map((name) => join('packages/ui/src/components', String(name))),
  ...readdirSync('packages/lite/src/components', { recursive: true }).map((name) => join('packages/lite/src/components', String(name))),
].filter((name) => name.endsWith('.svelte'));
for (const mediaFile of mediaFiles) {
  if (/<img\b/u.test(readFileSync(mediaFile, 'utf8')) && !allowedImageOwners.has(mediaFile)) {
    throw new Error(`Unowned image state machine: ${mediaFile}`);
  }
}

const fixedFormatOwners = new Set([
  'example/src/pages/TodoWorkspacePage.svelte',
  'packages/ui/src/components/PermissionMatrix.svelte',
  'packages/ui/src/components/ResourceOperationsPage.svelte',
  'packages/ui/src/components/LazyPage.svelte',
  'packages/ui/src/components/AdminApp.svelte',
  'packages/ui/src/components/content/WorkspaceInspector.svelte',
  'packages/ui/src/components/account/GetStartedPage.svelte',
  'packages/lite/src/components/LiteChatDialog.svelte',
  'packages/lite/src/components/fields/LiteMarkdownField.svelte',
  'packages/lite/src/components/fields/LiteMultiSelectField.svelte',
  'packages/lite/src/components/fields/LiteRichTextField.svelte',
]);
const layoutFiles = [
  ...pageFiles.map((name) => join(pageDirectory, name)),
  ...mediaFiles,
];
for (const layoutFile of layoutFiles) {
  if (fixedFormatOwners.has(layoutFile)) continue;
  const source = readFileSync(layoutFile, 'utf8');
  const fixedHeight = /min-h-\[(?:(?:1[6-9]\d|[2-9]\d{2,}|\d{4,})px|(?:1\d|[2-9]\d+)rem)\]|min-height:\s*(?:(?:1[6-9]\d|[2-9]\d{2,}|\d{4,})px|(?:1\d|[2-9]\d+)rem)/u.test(source);
  const largeTailwindMinHeight = /\bmin-h-(?:40|4[0-9]|[5-9]\d|\d{3,})\b/u.test(source);
  if (fixedHeight || largeTailwindMinHeight) {
    throw new Error(`Unowned fixed-height layout: ${layoutFile}`);
  }
}

process.stdout.write('UI state evidence contract: PASS\n');
