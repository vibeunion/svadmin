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
import LiteActivityFeed from './LiteActivityFeed.svelte';
import LiteDetailDrawer from './LiteDetailDrawer.svelte';
import LiteDrawerForm from './LiteDrawerForm.svelte';
import LiteModalForm from './LiteModalForm.svelte';
import LiteStepForm from './LiteStepForm.svelte';
import LiteEditableTable from './LiteEditableTable.svelte';
import LiteFilterBuilder from './LiteFilterBuilder.svelte';
import LiteColumnSettings from './LiteColumnSettings.svelte';
import LiteColumnHeaderFilter from './LiteColumnHeaderFilter.svelte';
import LiteTableSummary from './LiteTableSummary.svelte';
import LiteSensitiveDataMask from './LiteSensitiveDataMask.svelte';
import LiteApprovalActionCard from './LiteApprovalActionCard.svelte';
import LiteVersionDiffViewer from './LiteVersionDiffViewer.svelte';
import LiteDraggableRowTable from './LiteDraggableRowTable.svelte';
import LiteMediaLibraryModal from './LiteMediaLibraryModal.svelte';
import LiteAnomalyBadge from './widgets/LiteAnomalyBadge.svelte';

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

  it('merges the caller class on the form containers', () => {
    const modal = render(LiteModalForm, { class: 'host-surface', title: 'Confirm' })
      .container.querySelector('.lite-modal-card');
    expect(modal?.classList.contains('host-surface')).toBe(true);
    expect(modal?.classList.contains('lite-modal-card')).toBe(true);

    const drawer = render(LiteDrawerForm, { class: 'host-surface', title: 'Edit' })
      .container.querySelector('.lite-drawer-card');
    expect(drawer?.classList.contains('host-surface')).toBe(true);
    expect(drawer?.classList.contains('lite-drawer-card')).toBe(true);
  });

  it('merges the caller class on LiteStepForm and LiteDetailDrawer', () => {
    const step = render(LiteStepForm, {
      class: 'host-surface',
      steps: [
        { title: 'Account' },
        { title: 'Payment' },
      ],
    }).container.querySelector('.lite-step-form-card');
    expect(step?.classList.contains('host-surface')).toBe(true);
    expect(step?.classList.contains('lite-step-form-card')).toBe(true);

    const drawer = render(LiteDetailDrawer, {
      class: 'host-surface',
      id: 'order-detail',
      title: 'Order detail',
      children: snippet('<p>Total</p>'),
    }).container.querySelector('.lite-detail-drawer');
    expect(drawer?.classList.contains('host-surface')).toBe(true);
    expect(drawer?.classList.contains('lite-detail-drawer')).toBe(true);
  });

  it('merges the caller class on the table containers', () => {
    const editable = render(LiteEditableTable, {
      class: 'host-surface',
      columns: [{ key: 'title', label: 'Title' }],
      data: [{ id: 1, title: 'Row' }],
    }).container.querySelector('.lite-editable-table-card');
    expect(editable?.classList.contains('host-surface')).toBe(true);
    expect(editable?.classList.contains('lite-editable-table-card')).toBe(true);

    const sortable = render(LiteDraggableRowTable, {
      class: 'host-surface',
      columns: [{ key: 'name', label: 'Name' }],
      items: [{ id: 1, name: 'First' }],
    }).container.querySelector('.lite-sortable-table-card');
    expect(sortable?.classList.contains('host-surface')).toBe(true);
    expect(sortable?.classList.contains('lite-sortable-table-card')).toBe(true);
  });

  it('merges the caller class on LiteTableSummary and LiteVersionDiffViewer', () => {
    const summary = render(LiteTableSummary, {
      class: 'host-surface',
      columns: [{ key: 'amount', label: 'Amount' }],
      data: [{ amount: 10 }, { amount: 5 }],
    }).container.querySelector('.lite-table-summary-container');
    expect(summary?.classList.contains('host-surface')).toBe(true);
    expect(summary?.classList.contains('lite-table-summary-container')).toBe(true);

    const diff = render(LiteVersionDiffViewer, {
      class: 'host-surface',
      oldValue: { name: 'A' },
      newValue: { name: 'B' },
    }).container.querySelector('.lite-diff-viewer');
    expect(diff?.classList.contains('host-surface')).toBe(true);
    expect(diff?.classList.contains('lite-diff-viewer')).toBe(true);
  });

  it('merges the caller class on LiteFilterBuilder and LiteColumnSettings', () => {
    const filters = render(LiteFilterBuilder, {
      class: 'host-surface',
      fields: [{ key: 'name', label: 'Name', type: 'text' }],
      filters: [{ field: 'name', operator: 'contains', value: 'Ann' }],
    }).container.querySelector('.lite-filter-builder');
    expect(filters?.classList.contains('host-surface')).toBe(true);
    expect(filters?.classList.contains('lite-filter-builder')).toBe(true);

    const columns = render(LiteColumnSettings, {
      class: 'host-surface',
      columns: [{ key: 'name', label: 'Name' }],
    }).container.querySelector('.lite-column-settings');
    expect(columns?.classList.contains('host-surface')).toBe(true);
    expect(columns?.classList.contains('lite-column-settings')).toBe(true);
  });

  it('merges the caller class on the compact widgets', () => {
    const header = render(LiteColumnHeaderFilter, {
      class: 'host-surface',
      field: { key: 'name', label: 'Name', type: 'text' },
    }).container.querySelector('.lite-column-header-filter');
    expect(header?.classList.contains('host-surface')).toBe(true);
    expect(header?.tagName.toLowerCase()).toBe('span');

    const mask = render(LiteSensitiveDataMask, {
      class: 'host-surface',
      value: '13800001111',
    }).container.querySelector('.lite-sensitive-mask');
    expect(mask?.classList.contains('host-surface')).toBe(true);
    expect(mask?.textContent).not.toContain('13800001111');
  });

  it('merges the caller class on LiteApprovalActionCard and LiteActivityFeed', () => {
    const approval = render(LiteApprovalActionCard, {
      class: 'host-surface',
      title: 'Approve refund',
    }).container.querySelector('.lite-approval-card');
    expect(approval?.classList.contains('host-surface')).toBe(true);
    expect(approval?.textContent).toContain('Approve refund');

    const feed = render(LiteActivityFeed, {
      class: 'host-surface',
      activities: [{ id: 'a1', title: 'Shipped', time: '09:00' }],
    } as never).container.querySelector('.lite-activity-card');
    expect(feed?.classList.contains('host-surface')).toBe(true);
    expect(feed?.classList.contains('lite-activity-card')).toBe(true);
  });

  it('merges the caller class on LiteMediaLibraryModal and LiteAnomalyBadge', () => {
    const library = render(LiteMediaLibraryModal, {
      class: 'host-surface',
      mediaItems: [{ id: 'm1', name: 'cover.png', url: '/cover.png' }],
    } as never).container.querySelector('.lite-media-library-card');
    expect(library?.classList.contains('host-surface')).toBe(true);
    expect(library?.classList.contains('lite-media-library-card')).toBe(true);

    const anomaly = render(LiteAnomalyBadge, {
      class: 'host-surface',
      value: 140,
      baseline: 100,
    }).container.querySelector('.lite-badge');
    expect(anomaly?.classList.contains('host-surface')).toBe(true);
    expect(anomaly?.textContent).toContain('140');
  });

  it('keeps the default markup unchanged when no class is passed', () => {
    const element = render(LiteStatistic, { value: 7 }).container.querySelector('.lite-statistic');
    expect(element?.classList.contains('lite-statistic')).toBe(true);
    expect(element?.className.trim().split(/\s+/u)).toHaveLength(2);
    expect(element?.textContent).toContain('7');
  });
});