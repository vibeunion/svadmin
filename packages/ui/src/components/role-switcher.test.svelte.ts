import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import RoleSwitcher from './RoleSwitcher.svelte';

describe('RoleSwitcher Component', () => {
  it('renders trigger button with default role key and component marker', () => {
    const { container } = render(RoleSwitcher, { props: { activeRole: 'super_admin' } });
    const wrapper = container.querySelector('[data-svadmin-component="RoleSwitcher"]');
    expect(wrapper).toBeTruthy();
    expect(container.textContent).toContain('super_admin');
    expect(container.textContent).toContain('超级管理员');
  });

  it('opens popup when clicking trigger button and displays role list', async () => {
    const { getByRole, container } = render(RoleSwitcher);
    const trigger = getByRole('button');
    await fireEvent.click(trigger);

    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(container.textContent).toContain('运营专家');
    expect(container.textContent).toContain('研发技术专员');
  });

  it('triggers onroleswitch callback when selecting a new role', async () => {
    const onroleswitch = vi.fn();
    const { getByRole, container } = render(RoleSwitcher, {
      props: { onroleswitch },
    });

    const trigger = getByRole('button');
    await fireEvent.click(trigger);

    const operatorBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('运营专家')
    );
    expect(operatorBtn).toBeTruthy();
    if (operatorBtn) {
      await fireEvent.click(operatorBtn);
      expect(onroleswitch).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'operator', label: '运营专家' })
      );
    }
  });
});
