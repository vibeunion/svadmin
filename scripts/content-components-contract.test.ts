import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const contentDir = join(root, 'packages/ui/src/components/content');
const components = [
  'ContentPageShell.svelte', 'ContentPageHeader.svelte', 'SectionHeader.svelte',
  'PageToolbar.svelte', 'WorkspaceLayout.svelte', 'SettingsGroup.svelte',
  'SettingsFieldRow.svelte', 'MetricBlock.svelte', 'DescriptionList.svelte',
  'StatusBadge.svelte', 'FilterToolbar.svelte', 'DataState.svelte',
  'ProjectCard.svelte', 'TeamCard.svelte', 'FileList.svelte',
  'IntegrationCard.svelte', 'ApiKeyList.svelte', 'SecurityEventTable.svelte',
  'MemberList.svelte', 'ImportDropzone.svelte', 'NetworkUserCard.svelte',
  'NetworkTable.svelte', 'OtpInput.svelte', 'TwoFactorStepper.svelte',
  'SystemErrorState.svelte', 'FeedbackNotice.svelte',
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
    expect(index).toContain("export type { MetricTrendTone } from './components/content/MetricBlock.svelte';");
    expect(index).toContain("export type { NetworkUser, NetworkMetric } from './components/content/NetworkUserCard.svelte';");
    expect(index).toContain("export type { NetworkColumn } from './components/content/NetworkTable.types.js';");
  });

  it('keeps reusable copy and metric meaning explicit for localized examples', () => {
    const dataState = readFileSync(join(contentDir, 'DataState.svelte'), 'utf8');
    const filterToolbar = readFileSync(join(contentDir, 'FilterToolbar.svelte'), 'utf8');
    const metricBlock = readFileSync(join(contentDir, 'MetricBlock.svelte'), 'utf8');
    const dataLists = ['ApiKeyList.svelte', 'MemberList.svelte', 'FileList.svelte', 'SecurityEventTable.svelte', 'NetworkTable.svelte'];

    expect(dataState).toContain('retryLabel');
    expect(dataState).toContain('loadingLabel');
    expect(filterToolbar).toContain('clearLabel');
    expect(metricBlock).toContain('MetricTrendTone');
    expect(metricBlock).toContain("negative: 'text-destructive'");
    for (const name of dataLists) expect(readFileSync(join(contentDir, name), 'utf8')).toContain('<DataState');
  });

  it('uses semantic tokens and bounded primitives instead of a second palette', () => {
    for (const name of components) {
      const source = readFileSync(join(contentDir, name), 'utf8');
      expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(source).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|oklab|oklch)\(/i);
      expect(source).not.toContain('!important');
    }
  });

  it('keeps persistent feedback actionable and excludes success banners', () => {
    const source = readFileSync(join(contentDir, 'FeedbackNotice.svelte'), 'utf8');
    expect(source).toContain("export type FeedbackNoticeTone = 'info' | 'warning' | 'danger';");
    expect(source).not.toContain("'success'");
    expect(source).toContain("priority === 'blocking'");
    expect(source).toContain('role={isBlocking');
  });
});
