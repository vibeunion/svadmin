import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dir, '..');
function readRepositoryFile(path: string): string {
  return readFileSync(join(repositoryRoot, path), 'utf8');
}
function readCleanFlatCss(): string {
  const uiCss = readRepositoryFile('packages/ui/src/components.css');
  const marker = '/* --- Stripe-first layout preset (clean-flat) --- */';
  const markerIndex = uiCss.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);
  const nextSection = uiCss.indexOf('/* Business components', markerIndex);
  return uiCss.slice(markerIndex, nextSection === -1 ? undefined : nextSection);
}

describe('@svadmin/ui native stylesheet contract', () => {
  it('ships plain CSS without requiring component scanning or compiler imports', () => {
    for (const path of [
      'packages/ui/src/app.css',
      'example/src/app.css',
      'packages/create-svadmin/template/src/app.css',
    ]) {
      const css = readRepositoryFile(path);
      expect(css).not.toMatch(/@(?:source|theme|apply|tailwind|utility|custom-variant)\b/);
      expect(css).not.toMatch(/@import\s+["'](?:tailwindcss|tw-animate-css)/);
    }
    const readme = readRepositoryFile('README.md');
    expect(readme).toContain('No host CSS compiler required');
    expect(readme).not.toContain('registers its published `dist/components` directory');
  });

  it('uses precompiled CSS for both the example and generated apps', () => {
    for (const path of [
      'example/src/app.css',
      'packages/create-svadmin/template/src/app.css',
    ]) {
      const css = readRepositoryFile(path);
      expect(css).toContain('@import "@svadmin/ui/app.css";');
      expect(css).not.toContain('@svadmin/ui/app.theme.css');
      expect(css).not.toMatch(/--primary\s*:/);
    }
    expect(readRepositoryFile('example/src/App.svelte')).toContain("colorPreset: 'indigo'");
  });

  it('keeps clean-flat semantic and bounded after the native CSS split', () => {
    const cleanFlatCss = readCleanFlatCss();
    expect(cleanFlatCss).toContain('.layout-clean-flat');
    expect(cleanFlatCss).toContain('background: var(--primary);');
    expect(cleanFlatCss).toContain('--svadmin-focus-ring: var(--ring);');
    expect(cleanFlatCss).toContain('--svadmin-border: var(--border);');
    expect(cleanFlatCss).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(cleanFlatCss).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|oklab|oklch)\(/i);
    expect(cleanFlatCss).not.toContain('!important');
    expect(cleanFlatCss).not.toContain('[class*=');
    expect(cleanFlatCss).not.toContain(':has(');
  });

  it('records the Stripe-first visual authority boundary', () => {
    const designContract = readRepositoryFile('DESIGN.md');
    expect(designContract).toContain('Stripe-first');
    expect(designContract).toContain('Metronic is a capability reference only');
  });
});
