import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dir, '..');
function readRepositoryFile(path: string): string {
  return readFileSync(join(repositoryRoot, path), 'utf8');
}
function readCleanFlatCss(): string {
  const uiCss = readRepositoryFile('packages/ui/src/components.css');
  const marker = '/* --- Admin UI layout preset (clean-flat) --- */';
  const markerIndex = uiCss.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);
  const nextSection = uiCss.indexOf('/* Business components', markerIndex);
  return uiCss.slice(markerIndex, nextSection === -1 ? undefined : nextSection);
}

describe('@svadmin/ui native stylesheet contract', () => {
  it('ships plain CSS without requiring component scanning or compiler imports', () => {
    for (const path of [
      'packages/ui/src/app.css',
      'packages/create-svadmin/template/src/app.css',
    ]) {
      const css = readRepositoryFile(path);
      expect(css).not.toMatch(
        /@(?:source|theme|apply|tailwind|utility|custom-variant)\b/,
      );
      expect(css).not.toMatch(/@import\s+["'](?:tailwindcss|tw-animate-css)/);
    }
    const readme = readRepositoryFile('README.md');
    expect(readme).toContain('No host CSS compiler required');
    expect(readme).not.toContain(
      'registers its published `dist/components` directory',
    );
  });

  it('allows example-only Tailwind authoring without replacing current UI styles', () => {
    const css = readRepositoryFile('example/src/app.css');
    expect(css).toContain('@import "@svadmin/ui/app.css";');
    expect(css).toContain('@source "./";');
    expect(css).toContain('@import "tailwindcss/utilities.css"');
    expect(css).not.toContain('tailwindcss/preflight.css');
    expect(readRepositoryFile('example/vite.config.ts')).toContain('tailwindcss()');
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
    expect(readRepositoryFile('example/src/App.svelte')).toContain(
      "colorPreset: 'stripe'",
    );
    expect(readRepositoryFile('packages/create-svadmin/template/src/App.svelte')).toContain(
      "colorPreset: 'stripe'",
    );
    const scaffoldLogin = readRepositoryFile('packages/create-svadmin/template/src/pages/Login.svelte');
    expect(scaffoldLogin).not.toMatch(/bg-gradient|backdrop-blur|rounded-(?:xl|2xl|3xl)|shadow-xl/);
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

  it('records the Admin UI visual authority boundary', () => {
    const designContract = readRepositoryFile('DESIGN.md');
    expect(designContract).toContain('Admin UI');
    expect(designContract).toContain('Metronic is a capability reference only');
  });

  it('keeps the Stripe preset scoped to the clean-flat layout', () => {
    const css = readRepositoryFile('packages/ui/src/app.css');
    expect(css).toContain('--primary: oklch(0.54 0.24 293);');
    expect(css).toContain('--ring: oklch(0.54 0.24 293);');
    expect(readRepositoryFile('packages/core/src/theme.svelte.ts')).toContain("? stored as ColorTheme:'stripe'");
    expect(css).toContain('.layout-clean-flat[data-theme="stripe"]');
    expect(css).toContain('--svadmin-grid-size: 40px;');
    expect(css).toContain('background-size: var(--svadmin-grid-size) var(--svadmin-grid-size);');
    expect(css).toContain('--svadmin-shadow-control: 0 1px 2px rgb(15 23 42 / 0.04), 0 0 0 1px rgb(15 23 42 / 0.02);');
    expect(css).toContain('inset 0 1px 0 rgb(255 255 255 / 0.2)');
    expect(css).toContain('transition: background-color 180ms ease-out, color 180ms ease-out;');
    expect(css).not.toContain('.layout-default[data-theme="stripe"]');
  });
});
