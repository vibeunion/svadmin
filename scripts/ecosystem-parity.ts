/**
 * Ecosystem parity matrix for the reference Arco ecosystem.
 *
 * `docs/components/parity.md` already audits components and Pro pages. This
 * module owns the third layer — build plugins, theming, icons, CLI materials,
 * form reactions, mobile — so ecosystem claims stay evidence-backed instead of
 * drifting into aspirational prose.
 *
 * `check:parity --write` rewrites the delimited block; `--check` fails when the
 * document or the referenced evidence no longer matches.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type EcosystemStatus = 'adopted' | 'partial' | 'non_goal';

export interface EcosystemEvidence {
  /** Repository-relative file that must exist. */
  file: string;
  /** Symbol or marker that must appear in the file. */
  contains: string;
}

export interface EcosystemItem {
  /** Stable id used by the document table. */
  id: string;
  /** Reference ecosystem package or project. */
  counterpart: string;
  /** Capability being compared, not the package API. */
  capability: string;
  /** Where the capability lives in svadmin, or the recorded decision. */
  surface: string;
  status: EcosystemStatus;
  /** Why the status is what it is; required for non-goals. */
  note: string;
  /** Evidence enforced for adopted/partial entries. */
  evidence?: readonly EcosystemEvidence[];
}

export const ECOSYSTEM_MATRIX_START = '<!-- ecosystem-matrix:start -->';
export const ECOSYSTEM_MATRIX_END = '<!-- ecosystem-matrix:end -->';

export const ECOSYSTEM_ITEMS: readonly EcosystemItem[] = [
  {
    id: 'theme-tokens',
    counterpart: '@arco-design/color, arco-theme editor',
    capability: 'Derive a tonal palette from one brand color, emit light/dark tokens, exchange them as data',
    surface: '`generateColorScale`, `deriveColorPreset`, `exportColorThemes`, `importColorThemes`',
    status: 'adopted',
    note: 'OKLCH scale, DTCG/Figma token import, and a WCAG AA contrast snapshot. No Less variable layer.',
    evidence: [
      { file: 'packages/core/src/color-scale.ts', contains: 'export function deriveColorPreset' },
      { file: 'packages/core/src/theme-dtcg.ts', contains: 'export function parseDtcgTheme' },
      { file: 'scripts/audit-theme-contrast.ts', contains: 'export function snapshotDrift' },
    ],
  },
  {
    id: 'material-cli',
    counterpart: 'arco-cli, `arco add`, material market',
    capability: 'List, install, upgrade, and remove page materials without clobbering local edits',
    surface: '`svadmin add block <name> [--dry-run|--json|--upgrade|--remove]`',
    status: 'adopted',
    note: 'Shipped registry plus a hash ledger. Dry-run JSON is CI-readable. Conflicting files are never overwritten.',
    evidence: [
      { file: 'packages/create-svadmin/src/blocks.ts', contains: 'export function planAddBlock' },
      { file: 'packages/create-svadmin/src/add-command.ts', contains: "kind === 'block'" },
      { file: 'packages/create-svadmin/src/blocks.test.ts', contains: 'writeAddBlock' },
    ],
  },
  {
    id: 'icon-registry',
    counterpart: '@arco-design/web-react/icon',
    capability: 'Resolve an icon by name, including sprite sheets and remote SVG templates',
    surface: '`registerIcons`, `registerIconSource`, `Icon`',
    status: 'adopted',
    note: 'Components stay the default. Sprite sources render server-side `<svg><use>` and stay inside the icon source budget.',
    evidence: [
      { file: 'packages/ui/src/icon-registry.ts', contains: 'registerIconSource(source)' },
      { file: 'packages/ui/src/components/Icon.svelte', contains: '<use href={spriteHref} />' },
      { file: 'packages/ui/src/intent-preload.test.ts', contains: 'icon sprite stay inside the source budget' },
    ],
  },
  {
    id: 'schema-reactions',
    counterpart: '@formily/arco',
    capability: 'Schema-driven conditional visibility and derived field values',
    surface: '`visibleWhen` combinators, `equalsField`, `computed`, `applySchemaFormComputed`',
    status: 'partial',
    note: 'Closed derivations plus declarative `layout` (grid, section, steps). Expression evaluation and `Form.Item` stay rejected.',
    evidence: [
      { file: 'packages/core/src/schema-form.ts', contains: 'export function resolveSchemaFormLayout' },
      { file: 'packages/ui/src/components/JsonSchemaForm.svelte', contains: 'resolveSchemaFormLayout' },
      { file: 'packages/lite/src/components/LiteJsonSchemaForm.svelte', contains: 'resolveSchemaFormLayout' },
      { file: 'packages/ui/src/components/AutoForm.svelte', contains: 'resolveDeclaredFieldLayout' },
    ],
  },
  {
    id: 'intent-preload',
    counterpart: '@arco-plugins/vite-react lazy load',
    capability: 'Preload a module when the user hovers, focuses, or scrolls it into view',
    surface: '`intentPreload` action and `preloadModule`',
    status: 'adopted',
    note: 'SSR does not call the loader. The inflight budget is two modules; this is not a component import-rewrite plugin.',
    evidence: [
      { file: 'packages/ui/src/intent-preload.ts', contains: 'export function intentPreload' },
      { file: 'packages/ui/src/intent-preload.test.ts', contains: 'ssr does not call the loader' },
    ],
  },
  {
    id: 'component-docs',
    counterpart: 'reference design documentation site',
    capability: 'Generate a props table, state matrix, and copyable Svelte snippet per registered component',
    surface: '`scripts/component-docs.ts`',
    status: 'adopted',
    note: 'Built from the existing component registry and design contract. It does not introduce a second documentation runtime.',
    evidence: [
      { file: 'scripts/component-docs.ts', contains: 'export function generateComponentDocs' },
      { file: 'docs/components/generated-registry.md', contains: '<!-- component-docs:start -->' },
    ],
  },
  {
    id: 'build-plugins',
    counterpart: '@arco-plugins/vite-react, @arco-plugins/webpack-react, unplugin-react, babel-plugin-import',
    capability: 'On-demand component/style imports, Less variable replacement, lazy loading, icon substitution',
    surface: 'Not ported',
    status: 'non_goal',
    note: 'ESM tree-shaking and CSS variables replace import-on-demand and `modifyVars`. `pack:check` and `bundle:check` guard the real risk (exports and bundle shape).',
  },
  {
    id: 'mobile-components',
    counterpart: '@arco-design/mobile-react',
    capability: 'Mobile-first component set with touch gestures',
    surface: '`@svadmin/lite` SSR + responsive table/form layouts',
    status: 'non_goal',
    note: 'Admin consoles are covered by responsive surfaces and SSR parity. A gesture component library is a separate product with its own accessibility budget.',
  },
];

function statusLabel(status: EcosystemStatus): string {
  switch (status) {
    case 'adopted':
      return '✅ adopted';
    case 'partial':
      return '⚠️ partial';
    default:
      return '➖ non-goal';
  }
}

/** Markdown table without the delimiters. */
export function generateEcosystemMatrix(items: readonly EcosystemItem[] = ECOSYSTEM_ITEMS): string {
  const rows = items.map((item) => (
    `| ${item.counterpart} | ${item.capability} | ${item.surface} | ${statusLabel(item.status)} | ${item.note} |`
  ));
  return [
    '| Reference ecosystem | Capability | svadmin surface | Status | Decision |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

function extractBlock(markdown: string): string | undefined {
  const start = markdown.indexOf(ECOSYSTEM_MATRIX_START);
  const end = markdown.indexOf(ECOSYSTEM_MATRIX_END);
  if (start === -1 || end === -1 || end < start) return undefined;
  return markdown.slice(start + ECOSYSTEM_MATRIX_START.length, end).trim();
}

function evidenceIssues(repositoryRoot: string, items: readonly EcosystemItem[]): string[] {
  const issues: string[] = [];
  for (const item of items) {
    if (item.status === 'non_goal') continue;
    if (!item.evidence || item.evidence.length === 0) {
      issues.push(`${item.id}: ${item.status} entry has no evidence`);
      continue;
    }
    for (const evidence of item.evidence) {
      const filePath = resolve(repositoryRoot, evidence.file);
      if (!existsSync(filePath)) {
        issues.push(`${item.id}: missing evidence file ${evidence.file}`);
        continue;
      }
      if (!readFileSync(filePath, 'utf8').includes(evidence.contains)) {
        issues.push(`${item.id}: ${evidence.file} no longer contains "${evidence.contains}"`);
      }
    }
  }
  return issues;
}

/** Strip the delimiters so a drift check can compare just the table body. */
export function expectedEcosystemBlock(items: readonly EcosystemItem[] = ECOSYSTEM_ITEMS): string {
  return generateEcosystemMatrix(items);
}

/**
 * Compare the documented matrix with the generator output and verify that every
 * adopted/partial claim still resolves to real code.
 */
export function ecosystemDrift(
  repositoryRoot = resolve(import.meta.dir, '..'),
  documentPath = resolve(repositoryRoot, 'docs/components/parity.md'),
): string[] {
  const drift: string[] = [];
  if (!existsSync(documentPath)) return [`${documentPath} (missing)`];
  const documented = extractBlock(readFileSync(documentPath, 'utf8'));
  if (documented === undefined) {
    drift.push(`${documentPath} (ecosystem matrix block missing)`);
  } else if (documented !== expectedEcosystemBlock()) {
    drift.push(`${documentPath} (ecosystem matrix out of date)`);
  }
  drift.push(...evidenceIssues(repositoryRoot, ECOSYSTEM_ITEMS));
  return drift;
}

/** Render the block with delimiters, for `--write`. */
export function renderEcosystemSection(items: readonly EcosystemItem[] = ECOSYSTEM_ITEMS): string {
  return `${ECOSYSTEM_MATRIX_START}\n${generateEcosystemMatrix(items)}\n${ECOSYSTEM_MATRIX_END}`;
}