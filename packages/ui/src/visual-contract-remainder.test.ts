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

describe('Remaining visual style contract', () => {
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
    expect(css).toContain('--primary-light-1: var(--primary-1);');
    expect(css).toContain('--primary-1: #E8F3FF;');
    expect(css).toContain('--color-border-1: var(--svadmin-fill-2);');
  });

  it('matches the remaining official control, overlay, and type metrics', () => {
    expect(css).toContain('padding: 0 15px;');
    expect(css).toContain('padding: 0 11px;');
    expect(css).toContain('padding: 0 19px;');
    expect(css).toContain('font-weight: 400;');
    expect(css).toContain('background: var(--primary-5, var(--primary));');
    expect(css).not.toContain('color-mix(in oklch, var(--primary) 80%');
    expect(css).toContain('background: var(--primary-light-1);');
    expect(css).toContain('padding: 8px 15px;');
    expect(css).toContain('padding: 24px 20px;');
    expect(css).toContain('min-height: 48px;');
    expect(css).toContain('min-height: var(--svadmin-shell-topbar-h);');
    expect(css).toContain('padding: 12px 16px;');
    expect(css).toContain('min-height: 36px;');
    expect(rule('.svadmin-result__title')).toContain('font-size: 14px');
    expect(rule('.svadmin-result__title')).toContain('font-weight: 500');
    expect(rule('.svadmin-input::placeholder')).toContain('color: var(--muted-foreground);');
    expect(css).toContain('--svadmin-leading-body: 1.5715;');
    expect(css).toContain('--svadmin-shadow-popup: 0 4px 10px rgb(0 0 0 / 0.1);');
    expect(css).toContain('padding: 9px 16px;');
    expect(css).toContain('padding: 1px 4px;');
    expect(css).toContain('min-height: 46px;');
    expect(css).toContain('gap: 8px;');
  });

  it('matches the remaining official select, pagination, list, and progress metrics', () => {
    const smallSelect = rule('.svadmin-select[data-size="small"]');
    expect(smallSelect).toContain('height: var(--svadmin-control-h-sm)');
    expect(smallSelect).toContain('font-size: var(--svadmin-text-body)');
    expect(smallSelect).not.toContain('0.8125rem');
    expect(rule('.svadmin-select[data-size="mini"]')).toContain('height: var(--svadmin-control-h-mini)');
    expect(rule('.svadmin-select[data-size="large"]')).toContain('height: var(--svadmin-control-h-lg)');
    expect(css).toContain('--svadmin-switch-width: 2.5rem;');
    expect(css).toContain('--svadmin-switch-height: 1.5rem;');
    expect(css).toContain('--svadmin-switch-width-sm: 1.75rem;');
    expect(css).toContain('--svadmin-switch-height-sm: 1rem;');
    const page = rule('[data-slot="pagination-link"].svadmin-pagination-item[data-active="true"]');
    expect(page).toContain('background: var(--primary-light-1)');
    expect(page).toContain('color: var(--primary)');
    expect(rule(':is([data-slot="pagination-link"], [data-slot="pagination-previous"], [data-slot="pagination-next"]).svadmin-pagination-item')).toContain('border: 0 solid transparent');
    expect(rule(':is([data-slot="pagination-link"], [data-slot="pagination-previous"], [data-slot="pagination-next"]).svadmin-pagination-item')).toContain('height: 32px');
    expect(rule('.svadmin-breadcrumb-page')).toContain('font-weight: 500');
    expect(css).not.toContain('.svadmin-breadcrumb-list {\n    gap: 0.625rem;');
    expect(rule('.svadmin-item-list__item')).toContain('padding: 13px 20px');
    expect(rule('.svadmin-item-list__title')).toContain('var(--svadmin-text-section)');
    expect(rule('.svadmin-progress')).toContain('height: 4px');
    expect(rule('.svadmin-result__icon')).toContain('margin-bottom: 16px');
    expect(css).toContain('--svadmin-mask: rgb(29 33 41 / 60%);');
  });

  it('publishes host aliases and the remaining shared state colors', () => {
    expect(css).toContain('--color-secondary-hover: var(--svadmin-fill-3);');
    expect(css).toContain('--color-link-light-3: var(--primary-light-3);');
    expect(css).toContain('--color-neutral-8: var(--muted-foreground);');
    expect(css).toContain('--border-radius-small: 2px;');
    expect(css).toContain('--color-tooltip-bg: #1D2129;');
    expect(css).toContain('--svadmin-shadow-notification: 0 4px 12px rgb(0 0 0 / 0.15);');
    expect(rule('.svadmin-link[aria-disabled="true"]')).toContain('var(--color-link-light-3, var(--primary-light-3))');
    expect(rule('.svadmin-link[data-status="warning"][aria-disabled="true"]')).toContain('var(--warning-light-2, var(--warning-2))');
    expect(rule('.svadmin-switch')).toContain('--svadmin-switch-dot: 16px');
    expect(rule('.svadmin-switch-thumb')).toContain('box-shadow: none');
    expect(rule('.svadmin-switch[aria-invalid="true"]')).toContain('outline: var(--svadmin-focus-width)');
    expect(rule('.svadmin-dropdown-item:hover')).toContain('var(--svadmin-fill-2, var(--muted))');
    expect(rule('[data-slot="tooltip-content"]')).toContain('var(--color-tooltip-bg, #1D2129)');
    expect(css).toContain('background-color: var(--danger-light-1, #FFECE8);');
    expect(css).not.toContain('font-size: 0.9375rem;');
    expect(css).not.toContain('font-size: 0.6875rem;');
  });
});
