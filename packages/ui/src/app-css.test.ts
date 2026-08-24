import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));

describe('src/app.css (Tailwind source)', () => {
  it('keeps @theme block so Tailwind v4 generates utility classes', () => {
    const css = readFileSync(join(currentDir, 'app.css'), 'utf8');

    expect(css).toContain('@theme');
  });

  it('uses the semantic border token in the global reset', () => {
    const css = readFileSync(join(currentDir, 'app.css'), 'utf8');

    expect(css).toContain('border-color: var(--color-border, var(--border));');
    expect(css).not.toMatch(/border-color:\s*var\(--border\);/);
  });

  it('registers the published component directory as its own Tailwind source', () => {
    const css = readFileSync(join(currentDir, 'app.css'), 'utf8');

    expect(css).toContain('@source "./components";');
    expect(css).not.toContain('@source "./src";');
  });

  it('scopes clean-flat structural selectors to svadmin-owned nodes', () => {
    const css = readFileSync(join(currentDir, 'app.css'), 'utf8');
    const sidebar = readFileSync(join(currentDir, 'components', 'Sidebar.svelte'), 'utf8');

    expect(css).not.toMatch(/\.layout-clean-flat\s+(?:aside|main|th|td|tr)(?=[\s:>,.{])/);
    expect(css).not.toMatch(/\.layout-clean-flat\s+(?:\[data-svadmin-layout-scope\]\s+)?\.bg-card/);
    expect(css).toContain('.layout-clean-flat [data-svadmin-main]');
    expect(css).toContain('.layout-clean-flat [data-svadmin-sidebar]');
    expect(css).toContain('.layout-clean-flat [data-slot="table-head"]');
    expect(css).toContain('.layout-clean-flat [data-slot="table-cell"]');
    expect(css).toContain('.layout-clean-flat [data-slot="table-row"]:hover [data-slot="table-cell"]');
    expect(css).toContain('.layout-clean-flat [data-svadmin-content-page] .bg-card');
    expect(sidebar).toMatch(/<aside\s+data-svadmin-sidebar/);
  });

  it('keeps clean-flat svadmin surface rules behind the layout preset', () => {
    const css = readFileSync(join(currentDir, 'app.css'), 'utf8');
    const cleanFlatCss = css.slice(css.indexOf('.layout-clean-flat {'));

    expect(cleanFlatCss).not.toMatch(/^\s*\[data-svadmin-/m);
    expect(cleanFlatCss).not.toMatch(/^\.dark \[data-svadmin-/m);
    for (const selector of [
      '[data-svadmin-table-head] [data-slot="table-head"]',
      '[data-svadmin-table-row]',
      '[data-svadmin-table-row] [data-slot="table-cell"]',
      '[data-svadmin-table-row]:hover [data-slot="table-cell"]',
      '[data-svadmin-form-row]',
    ]) {
      expect(cleanFlatCss).toContain(`.dark.layout-clean-flat ${selector}`);
      expect(cleanFlatCss).toContain(`.dark .layout-clean-flat ${selector}`);
    }
  });
});
