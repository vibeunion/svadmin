import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import WorkflowNodeInspector from './WorkflowNodeInspector.svelte';

describe('WorkflowNodeInspector component suite', () => {
  it('renders drawer form when open is true', () => {
    const { getByRole, getByText, container } = render(WorkflowNodeInspector, {
      open: true,
    });

    expect(getByRole('dialog')).toBeTruthy();
    expect(getByText('流程节点属性检查器 (Node Inspector)')).toBeTruthy();
    expect(getByText('审批人指定规则')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="workflow-node-inspector"]')).toBeTruthy();
  });

  it('triggers onSaveNode callback when clicking save', async () => {
    const onSave = vi.fn();
    const { getByText } = render(WorkflowNodeInspector, {
      open: true,
      onSaveNode: onSave,
    });

    const saveBtn = getByText('保存节点配置');
    await fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalled();
  });
});
