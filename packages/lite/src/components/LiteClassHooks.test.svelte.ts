import { cleanup, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LiteAnchor from './LiteAnchor.svelte';
import LiteBreadcrumbs from './LiteBreadcrumbs.svelte';
import LiteFloatButton from './LiteFloatButton.svelte';
import LiteGrid from './LiteGrid.svelte';
import LiteMenu from './LiteMenu.svelte';
import LitePageHeader from './LitePageHeader.svelte';
import LiteQRCode from './LiteQRCode.svelte';
import LiteSpace from './LiteSpace.svelte';
import LiteStatistic from './LiteStatistic.svelte';
import LiteStatsCard from './LiteStatsCard.svelte';
import LiteStatusBadge from './LiteStatusBadge.svelte';
import LiteSteps from './LiteSteps.svelte';
import LiteTimeline from './LiteTimeline.svelte';
import LiteBooleanField from './fields/LiteBooleanField.svelte';
import LiteDateField from './fields/LiteDateField.svelte';
import LiteNumberField from './fields/LiteNumberField.svelte';
import LiteSelectField from './fields/LiteSelectField.svelte';
import LiteTagField from './fields/LiteTagField.svelte';
import LiteTextField from './fields/LiteTextField.svelte';
import LiteUrlField from './fields/LiteUrlField.svelte';
import LiteOtpInput from './LiteOtpInput.svelte';

function snippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }));
}

/**
 * Styling hook contract: a host `class` must land on the documented root element
 * next to the built-in class, and must never replace it. Batches add components
 * here as the hook debt is paid down (`packages/lite/CLASS-HOOKS.md`).
 *
 * Assertions stay inline per component (not in a shared loop) so the parity
 * contract's assertion budget records real proof instead of one reused check.
 */
afterEach(() => {
  cleanup();
});

describe('Lite styling hook contract', () => {
  it('merges the caller class on LiteSpace', () => {
    const element = render(LiteSpace, {
      class: 'host-surface',
      children: snippet('<span>a</span>'),
    }).container.querySelector('.lite-space');
    expect(element?.tagName.toLowerCase()).toBe('div');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-space')).toBe(true);
  });

  it('merges the caller class on LiteGrid', () => {
    const element = render(LiteGrid, {
      class: 'host-surface',
      children: snippet('<span>a</span>'),
    }).container.querySelector('.lite-grid');
    expect(element?.tagName.toLowerCase()).toBe('div');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-grid')).toBe(true);
  });

  it('merges the caller class on LiteBreadcrumbs', () => {
    const element = render(LiteBreadcrumbs, {
      class: 'host-surface',
      items: [{ label: 'Home' }],
    }).container.querySelector('.lite-breadcrumbs');
    expect(element?.tagName.toLowerCase()).toBe('nav');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-breadcrumbs')).toBe(true);
  });

  it('merges the caller class on LiteStatusBadge', () => {
    const element = render(LiteStatusBadge, {
      class: 'host-surface',
      status: 'active',
    }).container.querySelector('.lite-status-badge');
    expect(element?.tagName.toLowerCase()).toBe('span');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-status-badge')).toBe(true);
  });

  it('merges the caller class on LiteStatistic', () => {
    const element = render(LiteStatistic, {
      class: 'host-surface',
      value: 42,
    }).container.querySelector('.lite-statistic');
    expect(element?.tagName.toLowerCase()).toBe('div');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-statistic')).toBe(true);
  });

  it('merges the caller class on LiteTimeline', () => {
    const element = render(LiteTimeline, {
      class: 'host-surface',
      items: [{ id: 'e1', title: 'Shipped' }],
    }).container.querySelector('.lite-timeline');
    expect(element?.tagName.toLowerCase()).toBe('ol');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-timeline')).toBe(true);
  });

  it('merges the caller class on LiteSteps', () => {
    const element = render(LiteSteps, {
      class: 'host-surface',
      items: [{ title: 'Setup' }],
    }).container.querySelector('.lite-steps');
    expect(element?.tagName.toLowerCase()).toBe('ol');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-steps')).toBe(true);
  });

  it('merges the caller class on LiteMenu', () => {
    const element = render(LiteMenu, {
      class: 'host-surface',
      items: [{ id: 'home', label: 'Home' }],
    }).container.querySelector('.lite-menu');
    expect(element?.tagName.toLowerCase()).toBe('nav');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-menu')).toBe(true);
  });

  it('merges the caller class on LitePageHeader', () => {
    const element = render(LitePageHeader, {
      class: 'host-surface',
      title: 'Orders',
    }).container.querySelector('.lite-page-header');
    expect(element?.tagName.toLowerCase()).toBe('header');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-page-header')).toBe(true);
  });

  it('merges the caller class on LiteAnchor', () => {
    const element = render(LiteAnchor, {
      class: 'host-surface',
      items: [{ id: 'top', label: 'Top' }],
    }).container.querySelector('.lite-anchor');
    expect(element?.tagName.toLowerCase()).toBe('nav');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-anchor')).toBe(true);
  });

  it('merges the caller class on LiteFloatButton', () => {
    const element = render(LiteFloatButton, {
      class: 'host-surface',
      href: '/lite/help',
      label: 'Help',
    }).container.querySelector('.lite-float-button');
    expect(element?.tagName.toLowerCase()).toBe('div');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-float-button')).toBe(true);
  });

  it('merges the caller class on LiteStatsCard', () => {
    const element = render(LiteStatsCard, {
      class: 'host-surface',
      value: 42,
      label: 'Orders',
    }).container.querySelector('.lite-stats-card');
    expect(element?.tagName.toLowerCase()).toBe('div');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-stats-card')).toBe(true);
  });

  it('merges the caller class on LiteQRCode', () => {
    const element = render(LiteQRCode, {
      class: 'host-surface',
      value: 'svadmin',
    }).container.querySelector('.lite-qr-code');
    expect(element?.tagName.toLowerCase()).toBe('figure');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-qr-code')).toBe(true);
  });

  it('merges the caller class on LiteTextField show and edit roots', () => {
    const field = { key: 'title', label: 'Title', type: 'string' as const };
    const show = render(LiteTextField, { class: 'host-surface', field, value: 'Draft', mode: 'show' });
    const shown = show.container.querySelector('.lite-field-value');
    expect(shown?.classList.contains('host-surface')).toBe(true);
    expect(shown?.textContent).toContain('Draft');
    show.unmount();

    const edit = render(LiteTextField, { class: 'host-surface', field, value: 'Draft', mode: 'edit' });
    const editor = edit.container.querySelector('.lite-field-edit');
    expect(editor?.classList.contains('host-surface')).toBe(true);
    expect(editor?.querySelector('input')?.getAttribute('name')).toBe('title');
  });

  it('merges the caller class on LiteNumberField and LiteDateField', () => {
    const number = render(LiteNumberField, {
      class: 'host-surface',
      field: { key: 'qty', label: 'Qty', type: 'number' as const },
      value: 12,
      mode: 'edit',
    }).container.querySelector('.lite-field-edit');
    expect(number?.classList.contains('host-surface')).toBe(true);
    expect(number?.querySelector('input')?.getAttribute('type')).toBe('number');

    const date = render(LiteDateField, {
      class: 'host-surface',
      field: { key: 'due', label: 'Due', type: 'date' as const },
      value: '2026-10-31',
      mode: 'show',
    }).container.querySelector('.lite-field-value');
    expect(date?.classList.contains('host-surface')).toBe(true);
    expect(date?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('merges the caller class on LiteSelectField and LiteTagField', () => {
    const select = render(LiteSelectField, {
      class: 'host-surface',
      field: {
        key: 'status',
        label: 'Status',
        type: 'string' as const,
        options: [{ label: 'Open', value: 'open' }],
      },
      value: 'open',
      mode: 'show',
    }).container.querySelector('.lite-badge');
    expect(select?.classList.contains('host-surface')).toBe(true);
    expect(select?.textContent).toBe('Open');

    const tags = render(LiteTagField, {
      class: 'host-surface',
      field: { key: 'tags', label: 'Tags', type: 'tags' as const },
      value: ['a', 'b'],
      mode: 'edit',
    }).container.querySelector('.lite-tags-input');
    expect(tags?.classList.contains('host-surface')).toBe(true);
    expect(tags?.querySelectorAll('input').length).toBeGreaterThanOrEqual(2);
  });

  it('merges the caller class on LiteUrlField and LiteBooleanField', () => {
    const url = render(LiteUrlField, {
      class: 'host-surface',
      field: { key: 'site', label: 'Site', type: 'string' as const },
      value: 'https://example.test',
      mode: 'show',
    }).container.querySelector('.lite-field-value');
    expect(url?.classList.contains('host-surface')).toBe(true);
    expect(url?.querySelector('a')?.getAttribute('href')).toBe('https://example.test');

    const bool = render(LiteBooleanField, {
      class: 'host-surface',
      field: { key: 'active', label: 'Active', type: 'boolean' as const },
      value: true,
      mode: 'show',
    }).container.querySelector('.lite-field-value');
    expect(bool?.classList.contains('host-surface')).toBe(true);
    expect(bool?.textContent).toContain('Yes');
  });

  it('merges the caller class on LiteOtpInput', () => {
    const element = render(LiteOtpInput, {
      class: 'host-surface',
      name: 'code',
    }).container.querySelector('.lite-otp-input');
    expect(element?.classList.contains('host-surface')).toBe(true);
    expect(element?.classList.contains('lite-form-group')).toBe(true);
    expect(element?.querySelector('input')?.getAttribute('name')).toBe('code');
  });

  it('keeps the default markup unchanged when no class is passed', () => {
    const element = render(LiteStatistic, { value: 7 }).container.querySelector('.lite-statistic');
    expect(element?.classList.contains('lite-statistic')).toBe(true);
    expect(element?.className.trim().split(/\s+/u)).toHaveLength(2);
    expect(element?.textContent).toContain('7');
  });
});