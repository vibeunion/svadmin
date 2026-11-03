import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import WorkflowDesigner from './WorkflowDesigner.svelte';

describe('WorkflowDesigner', () => {
  const nodes = [
    { id: '1', type: 'start' as const, title: '发起人', content: '全体正式员工' },
    { id: '2', type: 'approver' as const, title: '直属主管审批', content: '由一级主管审批', status: 'completed' as const },
    { id: '3', type: 'notifier' as const, title: '抄送人', content: '抄送财务部', status: 'pending' as const },
  ];

  it('renders workflow nodes and status badges', () => {
    render(WorkflowDesigner, { nodes });

    expect(screen.getByText('发起人')).toBeTruthy();
    expect(screen.getByText('全体正式员工')).toBeTruthy();
    expect(screen.getByText('直属主管审批')).toBeTruthy();
    expect(screen.getByText('由一级主管审批')).toBeTruthy();
    expect(screen.getByText('completed')).toBeTruthy();
    expect(screen.getByText('流程结束')).toBeTruthy();
  });

  it('triggers onnodeclick when a node is clicked', async () => {
    const onnodeclick = vi.fn();
    render(WorkflowDesigner, { nodes, onnodeclick });

    const approverNode = screen.getByText('由一级主管审批');
    await fireEvent.click(approverNode);

    expect(onnodeclick).toHaveBeenCalledWith(expect.objectContaining({ id: '2', title: '直属主管审批' }));
  });

  it('triggers ondeletenode when delete button is clicked on non-start node', async () => {
    const ondeletenode = vi.fn();
    render(WorkflowDesigner, { nodes, ondeletenode });

    const deleteBtn = screen.getByRole('button', { name: '删除 直属主管审批' });
    await fireEvent.click(deleteBtn);

    expect(ondeletenode).toHaveBeenCalledWith('2');
  });

  it('opens add menu and triggers onaddnode', async () => {
    const onaddnode = vi.fn();
    render(WorkflowDesigner, { nodes, onaddnode });

    const addButtons = screen.getAllByRole('button', { name: '添加节点' });
    await fireEvent.click(addButtons[0]);

    const addApprover = screen.getByText('审批人节点');
    await fireEvent.click(addApprover);

    expect(onaddnode).toHaveBeenCalledWith('1', 'approver');
  });
});
