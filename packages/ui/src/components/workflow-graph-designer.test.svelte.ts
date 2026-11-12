import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import WorkflowGraphDesigner, { type WorkflowGraphNode } from './WorkflowGraphDesigner.svelte';

describe('WorkflowGraphDesigner Component', () => {
  const sampleNodes: WorkflowGraphNode[] = [
    { id: 'node-start', type: 'start', title: '发起申请' },
    { id: 'node-appr-1', type: 'approval', title: '主管审批', assigneeText: '张经理' },
    { id: 'node-end', type: 'end', title: '归档完成' },
  ];

  it('renders workflow nodes and assignee badges', () => {
    const { container } = render(WorkflowGraphDesigner, {
      props: {
        initialNodes: sampleNodes,
      },
    });

    const root = container.querySelector('[data-svadmin-component="WorkflowGraphDesigner"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('复杂审批流可视化编排设计器');
    expect(container.textContent).toContain('主管审批');
    expect(container.textContent).toContain('张经理');
  });

  it('triggers onselectnode when node card is clicked', async () => {
    const onSelect = vi.fn();
    const { container } = render(WorkflowGraphDesigner, {
      props: {
        initialNodes: sampleNodes,
        onselectnode: onSelect,
      },
    });

    const apprNode = container.querySelector('[data-workflow-node="node-appr-1"]');
    expect(apprNode).toBeTruthy();
    if (apprNode) {
      await fireEvent.click(apprNode);
      expect(onSelect).toHaveBeenCalledWith(sampleNodes[1]);
    }
  });
});
