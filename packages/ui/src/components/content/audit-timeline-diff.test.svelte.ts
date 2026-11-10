import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import AuditTimeline, { type TimelineItem } from './AuditTimeline.svelte';

describe('AuditTimeline with Field Diff Viewer', () => {
  it('renders timeline item with actor, action badge, ip and field diffs', () => {
    const items: TimelineItem[] = [
      {
        id: 'log-1',
        title: 'UPDATE Product',
        action: 'update',
        timestamp: '2026-11-10T12:00:00.000Z',
        actor: {
          id: 'usr_42',
          name: 'Sarah Chen',
          ip: '192.168.1.108',
        },
        changes: [
          {
            field: 'status',
            label: 'Order Status',
            oldValue: 'PENDING',
            newValue: 'APPROVED',
          },
          {
            field: 'discount',
            oldValue: 0,
            newValue: 15,
          },
        ],
      },
    ];

    const { container } = render(AuditTimeline, {
      props: { items },
    });

    const root = container.querySelector('[data-svadmin-audit-timeline]');
    expect(root).not.toBeNull();
    expect(container.textContent).toContain('UPDATE Product');
    expect(container.textContent).toContain('Sarah Chen');
    expect(container.textContent).toContain('192.168.1.108');

    // 检查字段 Diff 差异视图
    const diffSection = container.querySelector('[data-svadmin-audit-diff]');
    expect(diffSection).not.toBeNull();
    expect(diffSection?.textContent).toContain('Order Status');
    expect(diffSection?.textContent).toContain('PENDING');
    expect(diffSection?.textContent).toContain('APPROVED');
    expect(diffSection?.textContent).toContain('discount');
    expect(diffSection?.textContent).toContain('15');
  });

  it('renders empty state when items is empty', () => {
    const { container } = render(AuditTimeline, {
      props: {
        items: [],
        emptyTitle: '无历史审计记录',
      },
    });

    expect(container.textContent).toContain('无历史审计记录');
  });
});
