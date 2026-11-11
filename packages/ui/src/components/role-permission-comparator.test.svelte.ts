import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import RolePermissionComparator from './RolePermissionComparator.svelte';

describe('RolePermissionComparator suite', () => {
  it('renders permission diff matrix and alerts on high risk escalation', () => {
    const view = render(RolePermissionComparator, {
      roleId: 'finance_lead',
      roleName: '财务主管',
      changes: [
        { resource: 'ledger', resourceLabel: '财务账本', action: 'delete', previousAllowed: false, currentAllowed: true, isHighRisk: true },
      ],
    });

    expect(view.container.textContent).toContain('财务主管');
    expect(view.container.textContent).toContain('财务账本');
    expect(view.container.textContent).toContain('Permission Escalation');
  });

  it('submits audit record with ticket number', async () => {
    const onConfirmChanges = vi.fn();
    const view = render(RolePermissionComparator, {
      roleId: 'sec_admin',
      roleName: '安全专员',
      changes: [
        { resource: 'orders', resourceLabel: '订单管理', action: 'export', previousAllowed: false, currentAllowed: true },
      ],
      onConfirmChanges,
    });

    const input = view.container.querySelector('input#approval-ticket-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    if (input) {
      await fireEvent.input(input, { target: { value: 'TICKET-2026-901' } });
      const submitBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('确认并签署') || b.textContent?.includes('Audit & Confirm'),
      );
      expect(submitBtn).toBeTruthy();
      if (submitBtn) {
        await fireEvent.click(submitBtn);
        expect(onConfirmChanges).toHaveBeenCalledWith(
          expect.objectContaining({ approvalTicket: 'TICKET-2026-901' }),
        );
      }
    }
  });
});
