/**
 * Generate Props tables, state matrices, and copy-paste Svelte snippets from
 * the authoring registry and the surface design contract.
 *
 * `--write` refreshes docs/components/generated-registry.md. `--check` fails
 * when the committed document drifts.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { surfaceDesignContract } from '../packages/ui/src/design-contract';
import {
  componentRegistry,
  type ComponentPropMetadata,
  type ComponentRegistryEntry,
} from '../packages/ui/src/component-registry';

export const COMPONENT_DOCS_START = '<!-- component-docs:start -->';
export const COMPONENT_DOCS_END = '<!-- component-docs:end -->';
const DOCUMENT_PATH = resolve(import.meta.dir, '..', 'docs/components/generated-registry.md');

function componentName(entry: ComponentRegistryEntry): string {
  const file = entry.component.split('/').pop() ?? entry.component;
  return file.replace(/\.svelte$/, '');
}

function propAttribute(name: string, meta: ComponentPropMetadata): string | undefined {
  if (name === 'class' || meta.kind === 'callback') return undefined;
  const required = meta.required === true;
  if (!required && meta.default === undefined) return undefined;
  if (meta.kind === 'boolean') {
    const value = meta.default === undefined ? true : meta.default;
    return `${name}={${value ? 'true' : 'false'}}`;
  }
  if (meta.kind === 'number' || meta.kind === 'string | number') {
    const value = typeof meta.default === 'number' ? meta.default : 0;
    return `${name}={${value}}`;
  }
  if (meta.kind === 'string[]') return `${name}={[]}`;
  if (meta.kind === 'enum') {
    const value = typeof meta.default === 'string' ? meta.default : meta.values?.[0];
    return value === undefined ? undefined : `${name}="${value}"`;
  }
  const value = typeof meta.default === 'string' ? meta.default : 'Title';
  return `${name}="${value}"`;
}

function snippetFor(entry: ComponentRegistryEntry): string {
  const name = componentName(entry);
  const attributes = Object.entries(entry.props)
    .map(([prop, meta]) => propAttribute(prop, meta))
    .filter((attribute): attribute is string => attribute !== undefined);
  const slots = Object.keys(entry.slots);
  const open = attributes.length > 0 ? `<${name}\n  ${attributes.join('\n  ')}\n>` : `<${name}>`;
  if (slots.length === 0) return `${open.replace(/>$/, ' />')}`;
  const bodies = slots.map((slot) => `  {#snippet ${slot}()}\n  {/snippet}`);
  return `${open}\n${bodies.join('\n')}\n</${name}>`;
}

function propRows(entry: ComponentRegistryEntry): string[] {
  return Object.entries(entry.props).map(([name, meta]) => {
    const values = meta.values ? meta.values.join(', ') : '';
    const fallback = meta.default === undefined ? '' : String(meta.default);
    return `| ${name} | ${meta.kind} | ${meta.required === true ? 'yes' : ''} | ${fallback} | ${values} | ${meta.description ?? ''} |`;
  });
}

export function generateComponentDocs(
  entries: readonly ComponentRegistryEntry[] = componentRegistry,
): string {
  const sections = entries.map((entry) => {
    const states = entry.states.map((state) => `| ${state} | ${entry.id} |`).join('\n');
    return [
      `## ${componentName(entry)}`,
      '',
      `\`${entry.component}\``,
      '',
      '### Props',
      '',
      '| Prop | Kind | Required | Default | Values | Description |',
      '| --- | --- | --- | --- | --- | --- |',
      ...propRows(entry),
      '',
      '### State matrix',
      '',
      '| State | Component |',
      '| --- | --- |',
      states,
      '',
      '### Copy as Svelte',
      '',
      '```svelte',
      snippetFor(entry),
      '```',
    ].join('\n');
  });
  return [
    COMPONENT_DOCS_START,
    '# Generated component reference',
    '',
    'Generated from `packages/ui/src/component-registry.ts` and `packages/ui/src/design-contract.ts`.',
    'Do not edit by hand. Refresh with `bun scripts/component-docs.ts --write`.',
    '',
    '## Design contract',
    '',
    `| Contract | ${surfaceDesignContract.version} |`,
    `| Page families | ${surfaceDesignContract.pageFamilies.join(', ')} |`,
    `| Page states | ${surfaceDesignContract.pageStates.join(', ')} |`,
    `| Metric tones | ${surfaceDesignContract.metric.tone.join(', ')} |`,
    '',
    ...sections,
    COMPONENT_DOCS_END,
    '',
  ].join('\n');
}

export function componentDocsDrift(documentPath = DOCUMENT_PATH): string[] {
  const expected = generateComponentDocs().trimEnd();
  if (!existsSync(documentPath)) return [`${documentPath} (missing)`];
  const current = readFileSync(documentPath, 'utf8').trimEnd();
  return current === expected ? [] : [`${documentPath} (out of date)`];
}

if (import.meta.main) {
  const write = process.argv.includes('--write');
  const check = process.argv.includes('--check');
  if (write) {
    writeFileSync(DOCUMENT_PATH, generateComponentDocs());
    console.info(`[OK] Wrote ${DOCUMENT_PATH}`);
  } else {
    console.info(generateComponentDocs());
  }
  if (check) {
    const drift = componentDocsDrift();
    if (drift.length > 0) {
      console.error(`[FAIL] ${drift.join(', ')}`);
      process.exit(1);
    }
    console.info('[OK] Component docs match the registry.');
  }
}
