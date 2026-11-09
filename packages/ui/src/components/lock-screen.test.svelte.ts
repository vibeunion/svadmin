import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import LockScreen from './LockScreen.svelte';

describe('LockScreen Component', () => {
  it('renders trigger and opens lock screen on trigger click', async () => {
    const { container } = render(LockScreen, {
      props: {
        showTrigger: true,
        user: { name: 'SuperAdmin' },
      },
    });

    const triggerBtn = container.querySelector('button');
    expect(triggerBtn).not.toBeNull();

    if (triggerBtn) {
      await fireEvent.click(triggerBtn);
    }

    const lockModal = container.querySelector('[data-svadmin-component="lock-screen"]');
    expect(lockModal).not.toBeNull();
    expect(lockModal?.textContent).toContain('SuperAdmin');
  });

  it('handles unlock flow correctly', async () => {
    const unlockMock = vi.fn().mockImplementation((pwd: string) => pwd === 'secret123');

    const { container } = render(LockScreen, {
      props: {
        locked: true,
        onUnlock: unlockMock,
      },
    });

    const passwordInput = container.querySelector('input[type="password"]');
    expect(passwordInput).not.toBeNull();

    if (passwordInput) {
      await fireEvent.input(passwordInput, { target: { value: 'wrong-pass' } });
      const submitBtn = container.querySelector('button[type="button"].bg-primary');
      if (submitBtn) {
        await fireEvent.click(submitBtn);
      }
      expect(unlockMock).toHaveBeenCalledWith('wrong-pass');
      // 仍然处于锁定状态
      expect(container.querySelector('[data-svadmin-component="lock-screen"]')).not.toBeNull();

      // 输入正确密码
      await fireEvent.input(passwordInput, { target: { value: 'secret123' } });
      if (submitBtn) {
        await fireEvent.click(submitBtn);
      }
      expect(unlockMock).toHaveBeenCalledWith('secret123');
    }
  });
});
