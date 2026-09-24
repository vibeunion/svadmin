import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

const currentDir = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(currentDir, 'app.css'), 'utf8');
const root = postcss.parse(css);
const stripe = '.layout-clean-flat[data-theme="stripe"]';

describe('Stripe state and density ownership', () => {
  it('uses shared duration and easing tokens for component transitions', () => {
    root.walkDecls(/^transition(?:-duration|-timing-function)?$/, (decl) => {
      expect(decl.value).not.toMatch(/\b(?:120|140|150|160|180|200|250|300)ms\b/);
      expect(decl.value).not.toMatch(/\bease(?:-out)?\b/);
    });
    expect(css).toContain('--svadmin-motion-easing: ease-out;');
  });

  it('leaves typography and control geometry to component recipes', () => {
    root.walkRules((rule) => {
      if (!rule.selector.includes(stripe)) return;
      if (!rule.selector.includes(' h1') && !rule.selector.includes('[data-slot="input"]')
        && !rule.selector.includes('[data-slot="table-cell"]')) return;
      rule.walkDecls((decl) => {
        expect(['font-size', 'height', 'min-height']).not.toContain(decl.prop);
      });
    });
  });

  it('preserves compact density for owned data tables', () => {
    const selectors: string[] = [];
    root.walkRules((rule) => {
      if (!rule.selector.startsWith('.layout-clean-flat ') || !rule.selector.includes('[data-density="compact"]')) return;
      rule.walkDecls('height', (decl) => {
        expect(decl.value).toBe('2rem');
        selectors.push(rule.selector);
      });
    });
    expect(selectors.join()).toContain('[data-slot="table-head"]');
    expect(selectors.join()).toContain('[data-slot="table-cell"]');
  });

  it('keeps selected rows and invalid fields distinct from hover and focus', () => {
    expect(css).toContain(`${stripe} [data-svadmin-table-row][data-state="selected"] [data-slot="table-cell"]`);
    expect(css).toMatch(/\[aria-invalid="true"\]:focus-visible\s*\{\s*outline-color: var\(--destructive\)/);
  });

  it('guards button transforms and keeps interactive cards stationary', () => {
    let hoverTransforms = 0;
    root.walkRules((rule) => {
      if (!rule.selector.includes(stripe)) return;
      rule.walkDecls('transform', (decl) => {
        if (decl.value === 'none') return;
        expect(rule.selector).not.toContain('[data-slot="card"]');
        expect(rule.selector).toContain(':not(:disabled, [aria-disabled="true"], [data-disabled])');
        if (rule.selector.includes(':hover')) {
          hoverTransforms++;
          expect(rule.selector).toContain(':not(:active)');
          expect(rule.parent?.type).toBe('atrule');
          expect((rule.parent as postcss.AtRule).params).toContain('prefers-reduced-motion: no-preference');
        }
      });
    });
    expect(hoverTransforms).toBe(1);
    root.walkRules((rule) => {
      if (!rule.selector.includes('[data-slot="button"]') || !rule.selector.includes(':active')) return;
      rule.walkDecls('transform', (decl) => {
        if (decl.value !== 'none') {
          expect(rule.selector).toContain(':not(:disabled, [aria-disabled="true"], [data-disabled])');
        }
      });
    });
  });

  it('keeps root and scaffold design guidance identical', () => {
    const design = readFileSync(resolve(currentDir, '../../../DESIGN.md'), 'utf8');
    const scaffold = readFileSync(resolve(currentDir, '../../create-svadmin/guidance/DESIGN.md'), 'utf8');
    expect(scaffold).toBe(design);
  });
});
