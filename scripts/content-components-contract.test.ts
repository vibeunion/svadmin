import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const contentDir = join(root, 'packages/ui/src/components/content');
const components = [
  'ContentPageShell.svelte', 'ContentPageHeader.svelte', 'SectionHeader.svelte',
  'PageToolbar.svelte', 'MetricBlock.svelte', 'DescriptionList.svelte',
  'StatusBadge.svelte', 'FilterToolbar.svelte', 'DataState.svelte',
  'ProjectCard.svelte', 'TeamCard.svelte', 'FileList.svelte',
  'IntegrationCard.svelte', 'ApiKeyList.svelte', 'SecurityEventTable.svelte',
  'MemberList.svelte', 'ImportDropzone.svelte', 'NetworkUserCard.svelte',
  'NetworkTable.svelte', 'OtpInput.svelte', 'TwoFactorStepper.svelte',
  'SystemErrorState.svelte',
];

describe('Stripe-first content component contract', () => {
  it('ships every reference-family primitive as a typed Svelte component', () => {
    for (const name of components) {
      expect(existsSync(join(contentDir, name))).toBe(true);
      expect(readFileSync(join(contentDir, name), 'utf8')).toContain('$props');
    }
  });

  it('keeps the public export surface explicit', () => {
    const index = readFileSync(join(root, 'packages/ui/src/index.ts'), 'utf8');
    for (const name of components.map((entry) => entry.replace('.svelte', ''))) {
      expect(index).toContain('./components/content/' + name + '.svelte');
    }
    expect(index).toContain("export type { DescriptionItem } from './components/content/DescriptionList.svelte';");
    expect(index).toContain("export type { Status } from './components/content/StatusBadge.svelte';");
    expect(index).toContain("export type { NetworkColumn } from './components/content/NetworkTable.types.js';");
  });

  it('uses semantic tokens and bounded primitives instead of a second palette', () => {
    for (const name of components) {
      const source = readFileSync(join(contentDir, name), 'utf8');
      expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(source).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|oklab|oklch)\(/i);
      expect(source).not.toContain('!important');
    }
  });
});
