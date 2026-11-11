import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LiteTrendIndicator from './LiteTrendIndicator.svelte';
import LiteMetricGrid from './LiteMetricGrid.svelte';
import LiteOrgChart from './LiteOrgChart.svelte';
import LiteCronExpressionBuilder from './LiteCronExpressionBuilder.svelte';
import LiteVirtualTreeSelect from './LiteVirtualTreeSelect.svelte';
import LiteConcurrentConflictModal from './LiteConcurrentConflictModal.svelte';
import LiteTaskCenter from './LiteTaskCenter.svelte';
import LiteMicroAppFrame from './LiteMicroAppFrame.svelte';
import LiteSafeDeleteConfirm from './LiteSafeDeleteConfirm.svelte';
import LiteAuditLog from './LiteAuditLog.svelte';
import LitePresenceAvatarGroup from './LitePresenceAvatarGroup.svelte';
import LiteTour from './LiteTour.svelte';
import LiteGaugeChart from './widgets/LiteGaugeChart.svelte';

afterEach(() => cleanup());

describe('recent UI parity fallbacks', () => {
  it('computes trend direction and supports reversed color semantics', () => {
    const up = render(LiteTrendIndicator, { value: 12, prevValue: 10 });
    expect(up.container.textContent).toContain('20.0%');
    expect(up.container.querySelector('[data-tone="positive"]')).toBeTruthy();

    const reversed = render(LiteTrendIndicator, { value: -5, prevValue: 10, reverseColor: true });
    expect(reversed.container.textContent).toContain('150.0%');
    expect(reversed.container.querySelector('[data-tone="positive"]')).toBeTruthy();
  });

  it('renders metric grid items and empty/loading states', () => {
    const view = render(LiteMetricGrid, {
      title: 'Operations',
      items: [
        { label: 'Open', value: 12, trend: 'up', trendValue: '+4%' },
        { label: 'Closed', value: 30 },
      ],
    });
    expect(view.getByRole('heading', { name: 'Operations' })).toBeTruthy();
    expect(view.container.querySelectorAll('.lite-stats-card')).toHaveLength(2);

    const empty = render(LiteMetricGrid, { empty: true, emptyMessage: 'No metrics' });
    expect(empty.getByText('No metrics')).toBeTruthy();
  });

  it('renders organization hierarchy and cron fallback forms', () => {
    const org = render(LiteOrgChart, {
      data: [
        {
          id: 'ceo',
          name: 'Ada',
          title: 'CEO',
          department: 'Executive',
          children: [{ id: 'cto', name: 'Lin', title: 'CTO', href: '/people/lin' }],
        },
      ],
    });
    expect(org.container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(org.getByRole('link', { name: 'Lin' }).getAttribute('href')).toBe('/people/lin');

    const cron = render(LiteCronExpressionBuilder, {
      value: '0 9 * * 1',
      formAction: '/schedules',
      presets: [{ label: 'Weekly', value: '0 9 * * 1' }],
    });
    expect((cron.getByLabelText('Expression') as HTMLInputElement).value).toBe('0 9 * * 1');
    expect(cron.container.querySelector('form')?.getAttribute('action')).toBe('/schedules');
    expect(cron.getByText('Weekly')).toBeTruthy();
  });

  it('renders native tree select values and multiple selection', () => {
    const single = render(LiteVirtualTreeSelect, {
      label: 'Team',
      value: 'child',
      nodes: [{ value: 'root', label: 'Root', children: [{ value: 'child', label: 'Child' }] }],
    });
    expect((single.getByLabelText('Team') as HTMLSelectElement).value).toBe('child');
    expect(single.getByRole('option', { name: /Child/ })).toBeTruthy();

    const multiple = render(LiteVirtualTreeSelect, {
      label: 'Teams',
      multiple: true,
      value: ['root', 'child'],
      nodes: [{ value: 'root', label: 'Root', children: [{ value: 'child', label: 'Child' }] }],
    });
    const multipleSelect = multiple.container.querySelector('select') as HTMLSelectElement;
    const selected = [...multipleSelect.querySelectorAll('option')]
      .filter((option) => option.selected)
      .map((option) => option.getAttribute('value'));
    expect(selected).toEqual(['root', 'child']);
  });

  it('renders conflict fields, task actions and micro app iframe', () => {
    const conflict = render(LiteConcurrentConflictModal, {
      formAction: '/orders/7/conflict',
      fields: [{ field: 'price', label: 'Price', localValue: 10, remoteValue: 12 }],
      modifiedBy: 'Ada',
    });
    expect(conflict.getByRole('dialog')).toBeTruthy();
    expect(conflict.getByRole('radio', { name: 'Mine' })).toBeTruthy();
    expect(conflict.getByRole('radio', { name: 'Theirs' })).toBeTruthy();
    expect(conflict.container.querySelector('form')?.getAttribute('action')).toBe('/orders/7/conflict');

    const tasks = render(LiteTaskCenter, {
      tasks: [
        { id: 't1', title: 'Export orders', status: 'running', progress: 42 },
        { id: 't2', title: 'Import users', status: 'completed', downloadHref: '/files/users.csv' },
      ],
    });
    expect(tasks.container.querySelector('progress')?.getAttribute('value')).toBe('42');
    expect(tasks.getByRole('link', { name: 'Download' }).getAttribute('href')).toBe('/files/users.csv');

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const frame = render(LiteMicroAppFrame, {
      src: 'about:blank',
      title: 'Metrics',
      fallbackHref: 'https://example.test/app',
    });
    const iframe = frame.container.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe('about:blank');
    expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');
    expect(frame.getByRole('link', { name: 'Open in a new tab' })).toBeTruthy();
    consoleError.mockRestore();
  });

  it('renders safe-delete impact and native confirmation form', () => {
    const view = render(LiteSafeDeleteConfirm, {
      action: '/orders/7/delete',
      impactItems: [{ label: 'Line items', count: 3 }, { label: 'Attachments' }],
      confirmationText: 'DELETE',
    });
    expect(view.getByText('Line items')).toBeTruthy();
    expect(view.getByText('3')).toBeTruthy();
    expect(view.getByLabelText(/Type DELETE to confirm/)).toBeTruthy();
    expect(view.container.querySelector('form')?.getAttribute('action')).toBe('/orders/7/delete');
  });

  it('renders audit entries with field diffs and legacy logs', () => {
    const view = render(LiteAuditLog, {
      entries: [{
        id: 'a1',
        timestamp: '2026-11-10T00:00:00.000Z',
        action: 'update',
        resource: 'orders',
        recordId: 7,
        userId: 'ada',
        previousData: { status: 'pending' },
        data: { status: 'approved' },
      }],
    });
    expect(view.getByText('orders #7')).toBeTruthy();
    expect(view.getByText('pending')).toBeTruthy();
    expect(view.getByText('approved')).toBeTruthy();

    const legacy = render(LiteAuditLog, {
      logs: [{ id: 1, action: 'create', resource: 'users', userName: 'Lin', createdAt: '2026-11-10T00:00:00.000Z' }],
    });
    expect(legacy.getByText('Lin')).toBeTruthy();
  });

  it('renders presence overflow, tour targets and gauge thresholds', () => {
    const presence = render(LitePresenceAvatarGroup, {
      users: [
        { id: '1', name: 'Ada', status: 'editing', avatar: '/ada.png' },
        { id: '2', name: 'Lin', status: 'viewing' },
        { id: '3', name: 'Sam', status: 'idle' },
      ],
      maxVisible: 2,
    });
    expect(presence.container.querySelectorAll('[data-presence-user]')).toHaveLength(2);
    expect(presence.getByText('+1')).toBeTruthy();

    const tour = render(LiteTour, {
      steps: [{ title: 'Open settings', target: '#settings', placement: 'bottom', href: '/settings' }],
    });
    expect(tour.getByText('Open settings')).toBeTruthy();

    const gauge = render(LiteGaugeChart, {
      props: {
        value: 72,
        unit: '%',
        target: 80,
        thresholds: [{ value: 60, label: 'Normal' }, { value: 85, label: 'Warning' }],
      },
    });
    expect(gauge.getAllByText('72%').length).toBeGreaterThan(0);
    expect(gauge.getAllByText('Warning').length).toBeGreaterThan(0);
  });
});
