import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

const currentDir = dirname(fileURLToPath(import.meta.url));

// src/app.css is the live entry that build-static-css.mjs publishes.
// src/components.css is a hash-pinned historical snapshot used by the design
// contract, so assertions must never read it as if it were the shipped CSS.
function readAppCss(): string {
  return readFileSync(join(currentDir, 'app.css'), 'utf8');
}

function readCleanFlatCss(): string {
  const css = readAppCss();
  const marker = '/* --- Admin UI layout preset (clean-flat) --- */';
  const markerIndex = css.indexOf(marker);
  const endMarker = css.indexOf('/* Business components', markerIndex);

  expect(markerIndex).toBeGreaterThanOrEqual(0);
  return css.slice(markerIndex, endMarker === -1 ? undefined : endMarker);
}

/** Literal palette values are only allowed when defining a token. */
function hardcodedColors(css: string): string[] {
  const offenders: string[] = [];
  postcss.parse(css).walkRules((rule) => {
    rule.walkDecls((decl) => {
      if (decl.prop.startsWith('--')) return;
      for (const match of decl.value.matchAll(/#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklab|oklch)\(/gi)) {
        offenders.push(`${rule.selector}: ${decl.prop}: ${match[0]}`);
      }
    });
  });
  return offenders;
}

function readPublishedAppCss(): string {
  return readFileSync(join(currentDir, 'app.css'), 'utf8');
}

function readSidebar(): string {
  return readFileSync(join(currentDir, 'components', 'Sidebar.svelte'), 'utf8');
}

function readAppShellCss(): string {
  return readFileSync(join(currentDir, 'app-shell.css'), 'utf8');
}

describe('native component CSS', () => {
  it('preserves a semantic keyboard focus outline without color-mix support', () => {
    const css = postcss.parse(readFileSync(join(currentDir, 'app.css'), 'utf8'));
    const outlines: string[] = [];
    css.walkRules((rule) => {
      if (!rule.selector.includes('.sidebar-menu-item:focus-visible')) return;
      rule.walkDecls('outline', (decl) => { outlines.push(decl.value); });
    });
    expect(outlines).toEqual([
      '2px solid var(--ring)',
      '2px solid color-mix(in oklch, var(--ring) 48%, transparent)',
    ]);
  });

  it('keeps compiler directives out of native component CSS', () => {
    const css = readAppCss();

    expect(css).not.toContain('@theme');
  });

  it('uses the semantic border token in the global reset', () => {
    const css = readAppCss();

    const values: string[] = [];
    postcss.parse(css).walkRules((rule) => {
      if (rule.selector.replace(/\s+/g, ' ').trim() !== '*, ::after, ::before') return;
      rule.walkDecls('border-color', (decl) => { values.push(decl.value); });
    });
    expect(values).toEqual(['var(--color-border, var(--border))']);
  });

  it('does not require component source scanning', () => {
    const css = readAppCss();

    expect(css).not.toContain('@source');
    expect(css).not.toContain('@source "./src";');
  });

  it('scopes collapsed container defenses to svadmin-owned state hooks', () => {
    const css = readAppCss();

    expect(css).toContain('details.svadmin-collapsible:not([open])');
    expect(css).toContain('[data-svadmin-collapsible]:not([data-open="true"])');
    expect(css).toContain('[data-svadmin-filter-toolbar] .svadmin-filter-toolbar-advanced[hidden]');
    expect(css).not.toMatch(/^\s*details:not\(\[open\]\)/m);
  });

  it('keeps clean-flat as a semantic Admin UI compatibility preset', () => {
    const cleanFlatCss = readCleanFlatCss();

    expect(cleanFlatCss).toContain('--svadmin-surface: var(--card);');
    expect(cleanFlatCss).toContain('--svadmin-surface-shadow: var(--shadow-surface);');
    expect(cleanFlatCss).toContain('background: var(--primary);');
    expect(cleanFlatCss).toContain('--svadmin-focus-ring: var(--ring);');
    expect(hardcodedColors(cleanFlatCss)).toEqual([]);
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
    expect(cleanFlatCss).toContain('.layout-clean-flat [data-svadmin-content-page] {');
    expect(cleanFlatCss).not.toMatch(/^\s*\[data-svadmin-content-page\]/m);
    expect(readSidebar()).toMatch(/<aside\s+data-svadmin-sidebar/);
  });

  it('leaves content-page stack spacing to ContentPageShell recipes', () => {
    const css = readPublishedAppCss();

    expect(css).not.toContain('.layout-clean-flat [data-svadmin-content-page] > :is(div, section, form)');
    expect(css).not.toContain('.layout-clean-flat [data-svadmin-content-page] > :is(div, section, form):last-child');
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

  it('documents svadmin as the visual authority and Metronic as capability reference only', () => {
    const designContract = readFileSync(join(currentDir, '../../../DESIGN.md'), 'utf8');

    expect(designContract).toContain('Admin UI');
    expect(designContract).toContain('Metronic is a capability reference only');
  });

  it('normalizes collapsible details and filter containers', () => {
    const css = readAppCss();
    expect(css).not.toMatch(/^details:not\(\[open\]\)/m);
    expect(css).toContain('details[data-svadmin-filter]:not([open]) > :not(summary)');
    expect(css).toContain('details.svadmin-collapsible-filter:not([open]) > :not(summary)');
  });

  it('keeps collapsible triggers dense without dropping focus or scoped hooks', () => {
    for (const css of [readAppCss(), readPublishedAppCss()]) {
      expect(css).toContain('details.svadmin-collapsible > summary');
      expect(css).toContain('details.svadmin-collapsible-filter > summary');
      expect(css).toContain('details[data-svadmin-filter] > summary');
      expect(css).toContain('[data-svadmin-collapsible] > summary');
      expect(css).toContain('padding: 0.25rem 0;');
      expect(css).toContain('list-style: none;');
      expect(css).toContain('::-webkit-details-marker');
      expect(css).toContain('summary::marker');
      expect(css).toContain('border-bottom: 1px solid var(--border);');
      expect(css).toContain('[data-svadmin-collapsible][data-open="true"]');
      expect(css).toContain('[data-svadmin-sidebar] .svadmin-collapsible-trigger');
      expect(css).toContain('[data-svadmin-sidebar] .svadmin-collapsible-trigger:focus-visible');
      expect(css).toContain('outline: 2px solid var(--ring);');
      expect(css).toContain('padding-block: 0.375rem;');
      expect(css).not.toMatch(/^\s*details:not\(\[open\]\)/m);
    }
  });

  it('keeps sidebar geometry explicit across desktop, mobile and RTL layouts', () => {
    const css = readAppCss();
    const sidebar = readSidebar();

    expect(sidebar).toContain('class:svadmin-sidebar-expanded={!collapsed}');
    expect(sidebar).toContain('class:svadmin-sidebar-collapsed={collapsed}');
    expect(css).toContain('.svadmin-sidebar-expanded {\n  --svadmin-sidebar-width: 252px;');
    expect(css).toContain('.svadmin-sidebar-collapsed {\n  --svadmin-sidebar-width: 70px;');
    expect(css).toContain('.svadmin-sidebar-content-expanded {\n    margin-left: 252px;');
    expect(css).toContain('.svadmin-sidebar-content-collapsed {\n    margin-left: 70px;');
    expect(css).toContain('[dir="rtl"] .svadmin-sidebar-content-expanded {\n    margin-left: 0;\n    margin-right: 252px;');
    expect(css).toContain('[dir="rtl"] .svadmin-sidebar-content-collapsed {\n    margin-left: 0;\n    margin-right: 70px;');
    expect(css).toMatch(/@media \(min-width: 768px\) \{[\s\S]*?\.svadmin-sidebar-content-expanded/);
    expect(css).not.toContain('class:w-[252px]');
    expect(css).not.toContain('class:w-[70px]');
  });

  it('disables sidebar offset transitions only below the desktop breakpoint', () => {
    const overrides: string[][] = [];
    postcss.parse(readAppCss()).walkRules((rule) => {
      if (!rule.selectors.includes('.svadmin-sidebar-content-expanded')) return;
      rule.walkDecls('transition-property', (declaration) => {
        expect(declaration.value).toBe('none');
        const media = rule.parent;
        expect(media?.type).toBe('atrule');
        if (media?.type === 'atrule') expect(media.params).toBe('(max-width: 767px)');
        overrides.push(rule.selectors);
      });
    });

    expect(overrides).toEqual([[
      '.svadmin-sidebar-content-expanded',
      '.svadmin-sidebar-content-collapsed',
      '.sidebar-content-expanded',
      '.sidebar-content-collapsed',
    ]]);
  });

  it('mirrors the mobile app-shell drawer in RTL layouts', () => {
    const css = readAppShellCss();
    expect(css).toContain('[dir="rtl"] .svadmin-app-shell__sidebar');
    expect(css).toContain('transform: translateX(100%);');
  });
});
