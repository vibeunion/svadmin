import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { metricBlock as metricRecipe } from '../packages/ui/design/content-recipes';
import { contentSemanticTokens } from '../packages/ui/design/content-tokens';

const root = resolve(import.meta.dir, '..');
const contentDir = join(root, 'packages/ui/src/components/content');
const components = [
  'ContentPageShell.svelte', 'ContentPageHeader.svelte', 'SectionHeader.svelte',
  'PageToolbar.svelte', 'WorkspaceLayout.svelte', 'WorkspaceStageStepper.svelte',
  'WorkspaceActionBar.svelte', 'WorkspaceTabBar.svelte', 'WorkspaceInspector.svelte', 'WorkspaceSplitPane.svelte', 'SettingsGroup.svelte',
  'SettingsFieldRow.svelte', 'MetricBlock.svelte', 'DescriptionList.svelte',
  'StatusBadge.svelte', 'FilterToolbar.svelte', 'DataState.svelte',
  'ProjectCard.svelte', 'TeamCard.svelte', 'FileList.svelte',
  'IntegrationCard.svelte', 'ApiKeyList.svelte', 'SecurityEventTable.svelte',
  'MemberList.svelte', 'ImportDropzone.svelte', 'NetworkUserCard.svelte',
  'NetworkTable.svelte', 'OtpInput.svelte', 'TwoFactorStepper.svelte',
  'SystemErrorState.svelte', 'FeedbackNotice.svelte', 'StatusTabs.svelte',
  'AuditTimeline.svelte', 'MediaThumbnail.svelte',
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
    expect(index).toContain("export type { WorkspaceActionBarTone } from './components/content/WorkspaceActionBar.svelte';");
    expect(index).toContain("export type { WorkspaceTabItem } from './components/content/WorkspaceTabBar.svelte';");
    expect(index).toContain("export type { DescriptionItem } from './components/content/DescriptionList.svelte';");
    expect(index).toContain("export type { Status } from './components/content/StatusBadge.svelte';");
    expect(index).toContain("export type { StatusTabItem } from './components/content/StatusTabs.svelte';");
    expect(index).toContain("export type { MetricTrendTone } from './components/content/MetricBlock.svelte';");
    expect(index).toContain("export type { NetworkUser, NetworkMetric } from './components/content/NetworkUserCard.svelte';");
    expect(index).toContain("export type { NetworkColumn } from './components/content/NetworkTable.types.js';");
    expect(index).toContain("export type { TimelineItem } from './components/content/AuditTimeline.svelte';");
    expect(index).toContain("export type { MediaThumbnailSize, MediaThumbnailFit } from './components/content/MediaThumbnail.svelte';");
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
    expect(metricBlock).toContain("import { metricBlock } from '../../styled-system/recipes/index.js'");
    expect(metricBlock).toContain('$derived(metricBlock({ trendTone }))');
    // Follow actual recipe definitions through to public theme tokens instead of
    // requiring an old, uncompiled utility-class string in the Svelte source.
    expect(metricRecipe.variants?.['trendTone']).toEqual({
      positive: { trend: { color: 'content.positive' } },
      negative: { trend: { color: 'content.negative' } },
      warning: { trend: { color: 'content.warning' } },
      neutral: { trend: { color: 'content.muted' } },
    });
    expect(contentSemanticTokens.colors.content.positive.value).toBe('var(--color-success)');
    expect(contentSemanticTokens.colors.content.negative.value).toBe('var(--color-destructive)');
    expect(contentSemanticTokens.colors.content.warning.value).toBe('var(--color-warning-foreground)');
    expect(contentSemanticTokens.colors.content.muted.value).toBe('var(--color-muted-foreground)');
    for (const name of dataLists) expect(readFileSync(join(contentDir, name), 'utf8')).toContain('<DataState');
  });

  it('uses semantic tokens and bounded primitives instead of a second palette', () => {
    const sources = components.map(name => readFileSync(join(contentDir, name), 'utf8'));
    // The moved style definitions remain subject to the same palette gate.
    sources.push(readFileSync(join(root, 'packages/ui/design/content-recipes.ts'), 'utf8'));
    for (const source of sources) {
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
