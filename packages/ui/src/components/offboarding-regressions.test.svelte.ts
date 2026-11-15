import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import EmployeeOffboardingAuditor, { type OffboardingItem } from './EmployeeOffboardingAuditor.svelte';
import AccessRevocationMatrix, { type TargetSystemAccess } from './AccessRevocationMatrix.svelte';

const employee = { id: 'a', name: 'CALLER', department: 'IT', role: 'engineer',
  lastWorkingDate: '2026-11-15', handoverTarget: 'manager' };
const handover: OffboardingItem = { id: 'same-item', category: 'document', title: 'caller',
  description: 'caller', status: 'pending', assignee: 'caller', updatedAt: 'today' };
const systems: TargetSystemAccess[] = ['active', 'failed', 'revoking', 'revoked'].map((status, index) =>
  ({ id: String(index), status: status as TargetSystemAccess['status'], systemName: `sys-${index}`,
    systemType: 'code', accountIdentifier: 'caller', privilegeLevel: 'read' }));
describe('offboarding safety regressions', () => {
  it.each(['pending', 'in_progress', 'blocked'] as const)('cannot sign with a %s handover', async status => {
    const onSignoff = vi.fn();
    const view = render(EmployeeOffboardingAuditor, { employee, items: [{ ...handover, status }], onSignoff });
    for (const button of view.getAllByRole('button', { name: '点击盖章签署' })) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
      await fireEvent.click(button);
    }
    expect(onSignoff).not.toHaveBeenCalled();
  });
  it('allows signoff only after every item is completed', async () => {
    const onSignoff = vi.fn();
    const view = render(EmployeeOffboardingAuditor, { employee,
      items: [{ ...handover, status: 'completed' }], onSignoff });
    const button = view.getAllByRole('button', { name: '点击盖章签署' }).at(0);
    if (!button) throw new Error('Expected manager signoff button');
    await fireEvent.click(button);
    expect(onSignoff).toHaveBeenCalledWith('manager');
  });
  it('requires a real reason and clears the modal on employee changes', async () => {
    const onItemStatusChange = vi.fn();
    const view = render(EmployeeOffboardingAuditor, { employee, items: [handover], onItemStatusChange });
    await fireEvent.click(view.getByRole('button', { name: '阻断异常' }));
    expect((view.getByRole('button', { name: '确认阻断' }) as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(view.getByRole('button', { name: '确认阻断' }));
    expect(onItemStatusChange).not.toHaveBeenCalled();
    await fireEvent.input(view.getByRole('textbox'), { target: { value: 'A-only reason' } });
    await view.rerender({ employee: { ...employee, id: 'b' }, items: [handover], onItemStatusChange });
    expect(view.queryByRole('button', { name: '确认阻断' })).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: '阻断异常' }));
    expect((view.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    await fireEvent.input(view.getByRole('textbox'), { target: { value: 'actual reason' } });
    await fireEvent.click(view.getByRole('button', { name: '确认阻断' }));
    expect(onItemStatusChange).toHaveBeenCalledWith(expect.objectContaining({ id: handover.id }), 'blocked', 'actual reason');
  });
  it('selects only active and failed systems and never revokes in-flight targets', async () => {
    const onRevokeBatch = vi.fn();
    const view = render(AccessRevocationMatrix, { employeeId: 'a', employeeName: 'caller', systems, onRevokeBatch });
    const boxes = view.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes.map(box => box.disabled)).toEqual([false, false, true, true]);
    await fireEvent.click(view.getByRole('button', { name: '全选待回收系统' }));
    await fireEvent.click(view.getByRole('button', { name: /一键批量注销/ }));
    await fireEvent.click(view.getByRole('button', { name: '确认执行注销' }));
    expect(onRevokeBatch).toHaveBeenCalledWith(['0', '1']);
  });
  it('clears selections and confirmation across employee switches with reused system ids', async () => {
    const onRevokeBatch = vi.fn();
    const props = { employeeId: 'a', employeeName: 'caller', systems, onRevokeBatch };
    const view = render(AccessRevocationMatrix, props);
    await fireEvent.click(view.getByRole('button', { name: '全选待回收系统' }));
    await fireEvent.click(view.getByRole('button', { name: /一键批量注销/ }));
    await view.rerender({ ...props, employeeId: 'b' });
    expect(view.queryByRole('button', { name: '确认执行注销' })).toBeNull();
    expect((view.getByRole('button', { name: /一键批量注销/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(onRevokeBatch).not.toHaveBeenCalled();
  });
  it('revalidates busy state and changed target eligibility at confirmation', async () => {
    const onRevokeBatch = vi.fn();
    const props = { employeeId: 'a', employeeName: 'caller', systems, onRevokeBatch };
    const view = render(AccessRevocationMatrix, props);
    await fireEvent.click(view.getByRole('button', { name: '全选待回收系统' }));
    await fireEvent.click(view.getByRole('button', { name: /一键批量注销/ }));
    await view.rerender({ ...props, batchRevoking: true });
    const confirm = view.getByRole('button', { name: '确认执行注销' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    await fireEvent.click(confirm);
    expect(onRevokeBatch).not.toHaveBeenCalled();
    await view.rerender({ ...props, systems: systems.map(system => ({ ...system, status: 'revoking' })) });
    expect(view.queryByRole('button', { name: '确认执行注销' })).toBeNull();
  });
});
