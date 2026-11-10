import { describe, it, expect } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import AuditLogDrawer from './AuditLogDrawer.svelte';
import type { AuditEntry } from '@svadmin/core';

describe('AuditLogDrawer Advanced Component', () => {
  const mockEntries: AuditEntry[] = [
    {
      id: 'entry-1',
      resource: 'orders',
      recordId: '101',
      action: 'update',
      timestamp: '2026-11-10T12:00:00.000Z',
      userId: 'admin_alex',
      outcome: 'success',
      previousData: { status: 'PENDING', total: 100 },
      data: { status: 'COMPLETED', total: 120 },
      ipAddress: '10.0.0.12',
    },
    {
      id: 'entry-2',
      resource: 'orders',
      recordId: '101',
      action: 'create',
      timestamp: '2026-11-09T10:00:00.000Z',
      userId: 'system_bot',
      outcome: 'success',
      data: { status: 'PENDING', total: 100 },
    },
  ];

  it('loads entries via loadEntries and computes field diffs', async () => {
    render(AuditLogDrawer, {
      props: {
        open: true,
        resource: 'orders',
        recordId: '101',
        loadEntries: async () => mockEntries,
      },
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('UPDATE orders');
      expect(document.body.textContent).toContain('CREATE orders');
    });

    // 检查字段变更计算结果
    expect(document.body.textContent).toContain('status');
    expect(document.body.textContent).toContain('PENDING');
    expect(document.body.textContent).toContain('COMPLETED');
  });

  it('filters entries by action and search query', async () => {
    render(AuditLogDrawer, {
      props: {
        open: true,
        resource: 'orders',
        recordId: '101',
        loadEntries: async () => mockEntries,
      },
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('admin_alex');
      expect(document.body.textContent).toContain('system_bot');
    });

    // 过滤操作动作：只保留 update
    const select = document.body.querySelector('select[data-svadmin-field="audit-action-filter"]') as HTMLSelectElement | null;
    expect(select).not.toBeNull();
    if (select) {
      await fireEvent.change(select, { target: { value: 'update' } });
      await waitFor(() => {
        expect(document.body.textContent).toContain('admin_alex');
        expect(document.body.textContent).not.toContain('system_bot');
      });
    }

    // 搜索输入框过滤
    const searchInput = document.body.querySelector('input[data-svadmin-field="audit-search"]');
    expect(searchInput).not.toBeNull();
    if (searchInput) {
      await fireEvent.input(searchInput, { target: { value: 'alex' } });
      await waitFor(() => {
        expect(document.body.textContent).toContain('admin_alex');
      });

      await fireEvent.input(searchInput, { target: { value: 'nonexistent_user' } });
      await waitFor(() => {
        expect(document.body.textContent).toContain('No matching audit records');
      });
    }
  });
});
