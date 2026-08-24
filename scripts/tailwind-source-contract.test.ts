import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dir, '..');

function readRepositoryFile(path: string): string {
  return readFileSync(join(repositoryRoot, path), 'utf8');
}

function readCleanFlatCss(): string {
  const uiCss = readRepositoryFile('packages/ui/src/app.css');
  const marker = '/* --- Stripe-first layout preset (clean-flat) --- */';
  const markerIndex = uiCss.indexOf(marker);

  expect(markerIndex).toBeGreaterThanOrEqual(0);
  return uiCss.slice(markerIndex);
}

describe('@svadmin/ui Tailwind source contract', () => {
  it('keeps source discovery inside the published UI stylesheet', () => {
    const uiCss = readRepositoryFile('packages/ui/src/app.css');
    const exampleCss = readRepositoryFile('example/src/app.css');
    const templateCss = readRepositoryFile('packages/create-svadmin/template/src/app.css');
    const readme = readRepositoryFile('README.md');

    expect(uiCss).toContain('@source "./components";');
    expect(uiCss).not.toContain('linear-gradient(');
    expect(exampleCss).not.toContain('@source "../node_modules/@svadmin/ui";');
    expect(templateCss).not.toContain('@source "../node_modules/@svadmin/ui";');
    expect(readme).not.toContain('@source "../node_modules/@svadmin/ui";');
    expect(readme).toContain('registers its published `dist/components` directory');
  });

  it('keeps the example and generated app on the published Tailwind theme artifact', () => {
    const exampleCss = readRepositoryFile('example/src/app.css');
    const templateCss = readRepositoryFile('packages/create-svadmin/template/src/app.css');
    const exampleApp = readRepositoryFile('example/src/App.svelte');

    expect(exampleCss).toContain('@import "@svadmin/ui/app.theme.css";');
    expect(templateCss).toContain('@import "@svadmin/ui/app.theme.css";');
    expect(exampleCss).not.toMatch(/--primary\s*:/);
    expect(templateCss).not.toMatch(/--primary\s*:/);
    expect(exampleApp).toContain("colorPreset: 'indigo'");
  });

  it('keeps clean-flat semantic and bounded', () => {
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
