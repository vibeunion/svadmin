import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import WorkflowExecutionTracker, { type ExecutionStep } from './WorkflowExecutionTracker.svelte';

describe('WorkflowExecutionTracker Component', () => {
  const steps: ExecutionStep[] = [
    { id: 's1', nodeTitle: '提交单据', status: 'completed', handlerName: '李明', durationText: '2m' },
    { id: 's2', nodeTitle: '财务初审', status: 'current', handlerName: '王主管', comment: '正在复核凭证' },
    { id: 's3', nodeTitle: '总经理审批', status: 'waiting' },
  ];

  it('renders instance ID, timeline steps and status badges', () => {
    const { container } = render(WorkflowExecutionTracker, {
      props: {
        instanceId: 'FLOW-8848-001',
        flowName: '特批采购付款单',
        steps,
      },
    });

    const root = container.querySelector('[data-svadmin-component="WorkflowExecutionTracker"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('FLOW-8848-001');
    expect(container.textContent).toContain('特批采购付款单');
    expect(container.textContent).toContain('提交单据');
    expect(container.textContent).toContain('李明');
    expect(container.textContent).toContain('财务初审');
    expect(container.textContent).toContain('正在复核凭证');
    expect(container.textContent).toContain('已通过');
    expect(container.textContent).toContain('审批流转中');
  });
});
