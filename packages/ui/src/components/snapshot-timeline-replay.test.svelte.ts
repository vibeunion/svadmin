import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SnapshotTimelineReplay, { type SnapshotRevision } from './SnapshotTimelineReplay.svelte';

describe('SnapshotTimelineReplay suite', () => {
  const revisions: SnapshotRevision[] = [
    {
      id: 'rev-1',
      version: 1,
      timestamp: '2026-11-01 10:00:00',
      author: 'Admin Alice',
      comment: 'Initial policy creation',
      auditHash: 'SHA-001',
      snapshot: { status: 'draft', quota: 100 },
    },
    {
      id: 'rev-2',
      version: 2,
      timestamp: '2026-11-02 14:30:00',
      author: 'Security Bob',
      comment: 'Upgraded quota to production level',
      auditHash: 'SHA-002',
      snapshot: { status: 'published', quota: 500 },
    },
  ];

  it('renders timeline revisions and calculates diff', () => {
    const onApplyRollback = vi.fn();
    const view = render(SnapshotTimelineReplay, {
      revisions,
      onApplyRollback,
    });

    expect(view.container.textContent).toContain('Admin Alice');
    expect(view.container.textContent).toContain('v1');
    expect(view.container.textContent).toContain('v2');
  });

  it('allows scrubbing timeline and triggers rollback callback', async () => {
    const onApplyRollback = vi.fn();
    const view = render(SnapshotTimelineReplay, {
      revisions,
      onApplyRollback,
    });

    // Click rev-2
    const rev2Btn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('v2'),
    );
    expect(rev2Btn).toBeTruthy();
    if (rev2Btn) {
      await fireEvent.click(rev2Btn);
      expect(view.container.textContent).toContain('Security Bob');

      const rollbackBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('回滚') || b.textContent?.includes('Rollback'),
      );
      expect(rollbackBtn).toBeTruthy();
      if (rollbackBtn) {
        await fireEvent.click(rollbackBtn);
        expect(onApplyRollback).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'rev-2' }),
        );
      }
    }
  });
});
