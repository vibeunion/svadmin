import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import type { ResourceDefinition } from '@svadmin/core';
import LiteBadge from './LiteBadge.svelte';
import LiteMetricStrip, { type LiteMetricStripItem } from './LiteMetricStrip.svelte';
import LiteTable from './LiteTable.svelte';

vi.mock('@svadmin/core/i18n', () => ({
  t: (key: string) => key,
}));

describe('Lite PR #358 component parity', () => {
  it('renders metric links, badges, trends, and loading placeholders without client state', () => {
    const items: LiteMetricStripItem[] = [
      { label: 'Pending', value: 12, tone: 'primary', href: '/lite/orders' },
      { label: 'Overdue', value: 3, badge: { text: 'Urgent', tone: 'danger' } },
      { label: 'Completion', value: '98.5%', trend: { value: 4.2, label: 'weekly' } },
      { label: 'Loading metric', value: 0, loading: true },
    ];
    const { container, getByRole } = render(LiteMetricStrip, {
      items,
      columns: 4,
      ariaLabel: 'Operations metrics',
    });

    expect(getByRole('region', { name: 'Operations metrics' })).not.toBeNull();
    expect(container.querySelector('a[href="/lite/orders"]')?.textContent).toContain('Pending');
    expect(container.querySelector('.lite-badge-subtle-destructive')?.textContent).toContain('Urgent');
    expect(container.querySelector('.lite-metric-trend-up')?.textContent).toContain('4.2%');
    expect(container.querySelector('.lite-metric-loading')?.getAttribute('aria-label')).toBe('Loading');
  });

  it('matches the UI Badge subtle variants with native links or spans', () => {
    const subtle = render(LiteBadge, {
      variant: 'subtle-success',
      children: createRawSnippet(() => ({ render: () => '<span>Healthy</span>' })),
    });
    expect(subtle.container.querySelector('span.lite-badge-subtle-success')?.textContent).toContain('Healthy');
    subtle.unmount();

    const pill = render(LiteBadge, {
      variant: 'subtle-pill',
      href: '/lite/status',
      children: createRawSnippet(() => ({ render: () => '<span>Details</span>' })),
    });
    expect(pill.container.querySelector('a.lite-badge-subtle-pill')?.getAttribute('href')).toBe('/lite/status');
  });

  it('marks a field and action column as sticky in SSR output', () => {
    const resource: ResourceDefinition = {
      name: 'posts',
      label: 'Posts',
      fields: [
        { key: 'id', label: 'ID', type: 'number' },
        { key: 'title', label: 'Title', type: 'text' },
      ],
      canEdit: false,
      canDelete: false,
    };
    const fieldView = render(LiteTable, {
      records: [{ id: 1, title: 'SSR parity' }],
      resource,
      stickyColumns: { left: 'id', right: 'title' },
      canShow: false,
    });
    expect(fieldView.container.querySelectorAll('[data-sticky="left"]')).toHaveLength(2);
    expect(fieldView.container.querySelectorAll('[data-sticky="right"]')).toHaveLength(2);
    fieldView.unmount();

    const actionView = render(LiteTable, {
      records: [{ id: 1, title: 'SSR parity' }],
      resource,
      stickyColumns: { right: 'title' },
      stickyActions: true,
    });
    expect(actionView.container.querySelectorAll('[data-sticky="right"]')).toHaveLength(2);
    expect(actionView.container.querySelector('[data-sticky="right"]')?.textContent).toContain('common.actions');
    expect(actionView.container.querySelector('th:nth-child(2)')?.getAttribute('data-sticky')).toBeNull();
  });
});
