import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuditTimeline, { type TimelineItem } from './AuditTimeline.svelte';
import utilityClasses from '../../../scripts/utility-class-map.json';

afterEach(cleanup);

describe('AuditTimeline enterprise component', () => {
  it('renders empty state when items are empty', () => {
    const view = render(AuditTimeline, { items: [], emptyTitle: 'No Records' });
    expect(view.container.textContent).toContain('No Records');
    expect(view.container.querySelector('[data-svadmin-audit-timeline]')?.getAttribute('data-svadmin-audit-state')).toBe('empty');
  });

  it('renders timeline items with titles, timestamps, and status badges', () => {
    const items: TimelineItem[] = [
      {
        id: '1',
        title: 'Application Created',
        actor: 'CSY',
        timestamp: '2026-08-27 10:00:00',
        status: 'info',
        description: 'Initiated intake workflow.',
      },
      {
        id: '2',
        title: 'Review Approved',
        actor: 'Approver A',
        timestamp: '2026-08-27 10:15:00',
        status: 'success',
        tag: 'Approved',
        description: 'Passed verification checks.',
      },
    ];

    const view = render(AuditTimeline, { items });
    expect(view.container.textContent).toContain('Application Created');
    expect(view.container.textContent).toContain('by CSY');
    expect(view.container.textContent).toContain('Review Approved');
    expect(view.container.textContent).toContain('by Approver A');
    expect(view.container.textContent).toContain('Approved');
    expect(view.container.querySelector(`.${utilityClasses['text-success']}`)).not.toBeNull();
    expect(view.container.querySelector('[data-svadmin-audit-events]')).toBeTruthy();
    expect(view.container.querySelector('[data-svadmin-audit-timeline]')?.getAttribute('data-svadmin-audit-state')).toBe('ready');
  });

  it.each(['loading', 'filtered-empty', 'forbidden'] as const)('renders an explicit %s boundary without exposing stale events', state => {
    const view = render(AuditTimeline, {
      state,
      items: [{ id: 'secret', title: 'Hidden event' }],
    });

    expect(view.container.querySelector(`[data-svadmin-data-state="${state}"]`)).toBeTruthy();
    expect(view.queryByText('Hidden event')).toBeNull();
    expect(view.container.querySelector('[data-svadmin-audit-events]')).toBeNull();
    expect(view.container.querySelector('[data-svadmin-audit-timeline]')?.getAttribute('data-svadmin-audit-state')).toBe(state);
  });

  it('keeps error recovery owned by the timeline provider', async () => {
    const retry = vi.fn();
    const view = render(AuditTimeline, { state: 'error', retry, stateTitle: 'Audit unavailable' });

    await fireEvent.click(view.getByRole('button', { name: /retry/i }));
    expect(retry).toHaveBeenCalledOnce();
    expect(view.getByText('Audit unavailable')).toBeTruthy();
  });
});
