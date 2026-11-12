import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PermissionSimulator from './PermissionSimulator.svelte';

describe('PermissionSimulator component suite', () => {
  it('renders target users and simulated permissions', () => {
    const { getByText, getAllByText, container } = render(PermissionSimulator);

    expect(getByText('角色与多维属性权限模拟沙箱 (Permission Simulator)')).toBeTruthy();
    expect(getAllByText('李思远 (财务主管)').length).toBeGreaterThan(0);
    expect(getByText('系统导航可见性推演')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="permission-simulator"]')).toBeTruthy();
  });

  it('switches simulation user on click', async () => {
    const onSimulate = vi.fn();
    const { getByText } = render(PermissionSimulator, {
      onSimulate,
    });

    const targetUserBtn = getByText('赵宏 (合规安全总监)');
    await fireEvent.click(targetUserBtn);

    expect(onSimulate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'usr-sec-03',
        name: '赵宏 (合规安全总监)',
      })
    );
  });
});
