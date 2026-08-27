import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import AuditTimeline, { type TimelineItem } from './AuditTimeline.svelte';

describe('AuditTimeline enterprise component', () => {
  it('renders empty state when items are empty', () => {
    const view = render(AuditTimeline, { items: [], emptyTitle: 'No Records' });
    expect(view.container.textContent).toContain('No Records');
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
    expect(view.container.querySelector('.text-success')).not.toBeNull();
  });
});
