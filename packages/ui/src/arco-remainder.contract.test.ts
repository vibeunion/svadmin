import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'app.css'), 'utf8');

function rule(selector: string): string {
  const start = css.indexOf(selector);
  expect(start, selector).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
}

describe('Arco remainder style contract', () => {
  it('drops whole-control opacity on the disabled controls that still had it', () => {
    for (const selector of [
      '.svadmin-textarea:disabled',
      '.svadmin-select:disabled',
      '.svadmin-checkbox:disabled',
      '.svadmin-switch:disabled',
      '.svadmin-tabs-trigger:disabled',
      '.svadmin-command-input:disabled',
      '.svadmin-command-item[data-disabled]',
      '.svadmin-dropdown-item:disabled',
      '.svadmin-label:has(+ :disabled)',
    ]) {
      const block = rule(selector);
      expect(block, selector).not.toContain('opacity: 0.5');
      expect(block, selector).toContain('opacity: 1');
    }
    expect(css).toContain('50% {\n    opacity: 0.5;');
  });

  it('shares the focus width and offset, including native select', () => {
    const focus = rule(':is([data-slot="button"], .svadmin-button):focus-visible');
    expect(focus).toContain('[data-slot="select"]:focus-visible');
    expect(focus).toContain('outline: var(--svadmin-focus-width)');
    expect(focus).toContain('outline-offset: var(--svadmin-focus-offset)');
    expect(rule('.svadmin-checkbox:focus-visible')).toContain('var(--svadmin-focus-width)');
    expect(rule('.svadmin-switch:focus-visible')).toContain('var(--svadmin-focus-offset)');
    expect(rule('.svadmin-checkbox:focus-visible')).not.toContain('0 0 0 3px');
    expect(rule('.svadmin-switch:focus-visible')).not.toContain('0 0 0 3px');
  });

  it('uses the official title steps and keeps display tokens for larger type', () => {
    expect(rule('.svadmin-title[data-level="1"]')).toContain('var(--svadmin-text-title-3)');
    expect(rule('.svadmin-title[data-level="2"]')).toContain('var(--svadmin-text-title)');
    expect(rule('.svadmin-title[data-level="3"]')).toContain('var(--svadmin-text-section)');
    expect(rule('.svadmin-title[data-level="4"]')).toContain('var(--svadmin-text-body)');
    expect(css).not.toContain('.svadmin-title[data-level="2"] { font-size: 1.125rem; }');
    expect(css).not.toContain('font-size: 1.125rem;');
    expect(rule('.svadmin-dialog-title')).toContain('var(--svadmin-text-section)');
    expect(rule('.svadmin-sheet-title')).toContain('font-weight: 500');
    expect(css).toContain('--svadmin-text-display-1: 2.25rem;');
  });

  it('keeps one focus width on the rings that were still hardcoded', () => {
    for (const selector of [
      '.svadmin-input:focus-visible',
      '.svadmin-textarea:focus-visible',
      '.svadmin-select:focus-visible',
      '.svadmin-tabs-trigger:focus-visible',
      '.svadmin-sheet-close:focus-visible',
      '.svadmin-navigation-link:focus-visible',
      'details.svadmin-collapsible > summary:focus-visible',
    ]) {
      const block = rule(selector);
      expect(block, selector).not.toContain('0 0 0 2px');
      expect(block, selector).not.toContain('outline: 2px');
    }
    expect(rule('.svadmin-tabs-trigger:focus-visible')).toContain('var(--svadmin-focus-width)');
    expect(rule('.svadmin-checkbox')).toContain('width: 14px');
    expect(rule('.svadmin-checkbox')).toContain('border: 2px solid');
    expect(rule('[data-slot="tooltip-content"]')).toContain('padding: 8px 12px');
    expect(rule('[data-slot="tooltip-content"][data-size="mini"]')).toContain('padding: 4px 12px');
    expect(rule('[data-slot="tooltip-content"][data-size="mini"]')).toContain('min-height: 30px');
  });

  it('names official motion durations without replacing the existing easings', () => {
    expect(css).toContain('--svadmin-duration-1: 0.1s;');
    expect(css).toContain('--svadmin-duration-5: 0.5s;');
    expect(css).toContain('--svadmin-duration-loading: 1s;');
    expect(css).toContain('--svadmin-easing-linear: cubic-bezier(0, 0, 1, 1);');
    expect(css).toContain('--svadmin-easing-standard: cubic-bezier(0.34, 0.69, 0.1, 1);');
    expect(css).toContain('--svadmin-easing-overshoot: cubic-bezier(0.3, 1.3, 0.3, 1);');
    expect(css).toContain('--svadmin-easing-decelerate: cubic-bezier(0.4, 0.8, 0.74, 1);');
    expect(css).toContain('--svadmin-easing-accelerate: cubic-bezier(0.26, 0, 0.6, 0.2);');
    expect(css).toContain('--svadmin-motion-fast: 150ms;');
    expect(css).toContain('--svadmin-motion-easing: ease-out;');
  });

  it('adds text, border, background and light aliases without renaming the existing tokens', () => {
    expect(css).toContain('--color-text-1: var(--foreground);');
    expect(css).toContain('--color-text-2: var(--muted-foreground);');
    expect(css).toContain('--color-border-4: var(--svadmin-text-3);');
    expect(css).toContain('--color-bg-3: var(--background);');
    expect(css).toContain('--color-primary-light-3: var(--primary-light-3);');
    expect(css).toContain('--foreground: #1D2129;');
    expect(css).toContain('--primary: #165DFF;');
  });
});
