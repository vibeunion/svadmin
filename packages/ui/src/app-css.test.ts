import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));

function readAppCss(): string {
  return readFileSync(join(currentDir, 'app.css'), 'utf8');
}

function readCleanFlatCss(): string {
  const css = readAppCss();
  const marker = '/* --- Stripe-first layout preset (clean-flat) --- */';
  const markerIndex = css.indexOf(marker);

  expect(markerIndex).toBeGreaterThanOrEqual(0);
  return css.slice(markerIndex);
}

function readSidebar(): string {
  return readFileSync(join(currentDir, 'components', 'Sidebar.svelte'), 'utf8');
}

describe('src/app.css (Tailwind source)', () => {
  it('keeps @theme block so Tailwind v4 generates utility classes', () => {
    const css = readAppCss();

    expect(css).toContain('@theme');
  });

  it('uses the semantic border token in the global reset', () => {
    const css = readAppCss();

    expect(css).toContain('border-color: var(--color-border, var(--border));');
    expect(css).not.toMatch(/border-color:\s*var\(--border\);/);
  });

  it('registers the published component directory as its own Tailwind source', () => {
    const css = readAppCss();

    expect(css).toContain('@source "./components";');
    expect(css).not.toContain('@source "./src";');
  });

  it('scopes collapsed container defenses to svadmin-owned state hooks', () => {
    const css = readAppCss();

    expect(css).toContain('details.svadmin-collapsible:not([open])');
    expect(css).toContain('[data-svadmin-collapsible]:not([data-open="true"])');
    expect(css).toContain('[data-svadmin-filter-toolbar] .svadmin-filter-toolbar-advanced[hidden]');
    expect(css).not.toMatch(/^\s*details:not\(\[open\]\)/m);
  });

  it('keeps clean-flat as a semantic Stripe-first compatibility preset', () => {
    const cleanFlatCss = readCleanFlatCss();

    expect(cleanFlatCss).toContain('--svadmin-surface: var(--card);');
    expect(cleanFlatCss).toContain('--svadmin-surface-shadow: var(--shadow-surface);');
    expect(cleanFlatCss).toContain('background: var(--primary);');
    expect(cleanFlatCss).toContain('--svadmin-focus-ring: var(--ring);');
    expect(cleanFlatCss).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(cleanFlatCss).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|oklab|oklch)\(/i);
    expect(cleanFlatCss).not.toContain('!important');
    expect(cleanFlatCss).not.toContain('linear-gradient(');
    expect(cleanFlatCss).not.toContain('[class*=');
    expect(cleanFlatCss).not.toContain(':has(');
    expect(cleanFlatCss).not.toMatch(/letter-spacing:\s*-/);
  });

  it('scopes clean-flat structural selectors to svadmin-owned nodes', () => {
    const cleanFlatCss = readCleanFlatCss();

    expect(cleanFlatCss).not.toMatch(/\.layout-clean-flat\s+(?:aside|main|th|td|tr)(?=[\s:>,.{])/);
    expect(cleanFlatCss).not.toMatch(/\.layout-clean-flat\s+(?:\[data-svadmin-layout-scope\]\s+)?\.bg-card/);
    expect(cleanFlatCss).toContain('.layout-clean-flat [data-svadmin-main]');
    expect(cleanFlatCss).toContain('.layout-clean-flat [data-svadmin-sidebar]');
    expect(cleanFlatCss).toContain('.layout-clean-flat [data-svadmin-table-head] [data-slot="table-head"]');
    expect(cleanFlatCss).toContain('.layout-clean-flat [data-svadmin-table-row] [data-slot="table-cell"]');
    expect(cleanFlatCss).toContain(
      '.layout-clean-flat [data-svadmin-table-row]:hover [data-slot="table-cell"]',
    );
    expect(cleanFlatCss).toContain('.layout-clean-flat [data-svadmin-content-page] .bg-card');
    expect(readSidebar()).toMatch(/<aside\s+data-svadmin-sidebar/);
  });

  it('keeps clean-flat svadmin surface rules behind the layout preset', () => {
    const cleanFlatCss = readCleanFlatCss();

    expect(cleanFlatCss).not.toMatch(/^\s*\[data-svadmin-/m);
    expect(cleanFlatCss).not.toMatch(/^\.dark \[data-svadmin-/m);
    for (const selector of [
      '[data-svadmin-table-head] [data-slot="table-head"]',
      '[data-svadmin-table-row]',
      '[data-svadmin-table-row] [data-slot="table-cell"]',
      '[data-svadmin-table-row]:hover [data-slot="table-cell"]',
      '[data-svadmin-form-row]',
    ]) {
      expect(cleanFlatCss).toContain(`.layout-clean-flat ${selector}`);
    }
  });

  it('documents Stripe as the visual authority and Metronic as capability reference only', () => {
    const designContract = readFileSync(join(currentDir, '../../../DESIGN.md'), 'utf8');

    expect(designContract).toContain('Stripe-first');
    expect(designContract).toContain('Metronic is a capability reference only');
  });

  it('normalizes collapsible details and filter containers', () => {
    const css = readAppCss();
    expect(css).not.toMatch(/^details:not\(\[open\]\)/m);
    expect(css).toContain('details[data-svadmin-filter]:not([open]) > :not(summary)');
    expect(css).toContain('details.svadmin-collapsible-filter:not([open]) > :not(summary)');
  });
});
