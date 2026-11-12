import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import LiteAbacPolicyMatrix from './LiteAbacPolicyMatrix.svelte';
import LitePermissionSimulator from './LitePermissionSimulator.svelte';
import LiteWorkflowNodeInspector from './LiteWorkflowNodeInspector.svelte';

describe('Lite Enterprise Parity Wave 13 suite', () => {
  it('renders LiteAbacPolicyMatrix with rule table', () => {
    const { getByText, container } = render(LiteAbacPolicyMatrix);

    expect(getByText('企业级 ABAC 访问控制策略矩阵 (SSR 静态列表)')).toBeTruthy();
    expect(getByText('财务大额调拨审批放行')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LiteAbacPolicyMatrix"]')).toBeTruthy();
  });

  it('renders LitePermissionSimulator with user list', () => {
    const { getByText, container } = render(LitePermissionSimulator);

    expect(getByText('权限模拟沙箱 (SSR 静态列表)')).toBeTruthy();
    expect(getByText('李思远 (财务主管)')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LitePermissionSimulator"]')).toBeTruthy();
  });

  it('renders LiteWorkflowNodeInspector with node properties', () => {
    const { getByText, container } = render(LiteWorkflowNodeInspector);

    expect(getByText('流程节点属性检查器 (SSR 静态面板)')).toBeTruthy();
    expect(getByText('部门主管审批节点')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="LiteWorkflowNodeInspector"]')).toBeTruthy();
  });
});
