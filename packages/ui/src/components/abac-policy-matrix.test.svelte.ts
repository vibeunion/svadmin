import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AbacPolicyMatrix from './AbacPolicyMatrix.svelte';

describe('AbacPolicyMatrix component suite', () => {
  it('renders policy rules and effect indicators', () => {
    const { getByText, container } = render(AbacPolicyMatrix);

    expect(getByText('企业级 ABAC 动态访问控制策略矩阵 (Policy Matrix)')).toBeTruthy();
    expect(getByText('财务经理大额资金调拨审批放行')).toBeTruthy();
    expect(getByText('普通业务专员薪酬资产动态脱敏')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="abac-policy-matrix"]')).toBeTruthy();
  });

  it('filters rules by effect tag', async () => {
    const { getByText, queryByText } = render(AbacPolicyMatrix);

    const denyBtn = getByText('阻断');
    await fireEvent.click(denyBtn);

    expect(getByText('非工作时段核心审计库防篡改阻断')).toBeTruthy();
    expect(queryByText('财务经理大额资金调拨审批放行')).toBeNull();
  });

  it('toggles rule enabled state', async () => {
    const onToggle = vi.fn();
    const { getAllByText } = render(AbacPolicyMatrix, {
      onToggleRule: onToggle,
    });

    const toggleBtns = getAllByText('已启用');
    expect(toggleBtns.length).toBeGreaterThan(0);
    const firstToggle = toggleBtns[0];
    if (firstToggle) {
      await fireEvent.click(firstToggle);
    }

    expect(onToggle).toHaveBeenCalled();
  });
});
