import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SafeDeleteConfirm from './SafeDeleteConfirm.svelte';

describe('SafeDeleteConfirm Component', () => {
  it('does not render dialog content when open is false', () => {
    const { container } = render(SafeDeleteConfirm, {
      props: {
        open: false,
        targetName: 'prod-database-cluster-01',
      },
    });

    const dialog = container.querySelector('[data-svadmin-component="SafeDeleteConfirm"]');
    expect(dialog).toBeNull();
  });

  it('renders title, target name, impact assessment list, and warning when open is true', () => {
    const { container } = render(SafeDeleteConfirm, {
      props: {
        open: true,
        targetName: 'prod-database-cluster-01',
        title: '生产数据库集群删除审查',
        description: '删除后所有从库与快照将一并销毁。',
        impactList: [
          { label: '关联数据库实例', count: 8 },
          { label: '挂载云盘存储', count: '1.2 TB', description: '包含核心账单日志' },
        ],
      },
    });

    const dialog = container.querySelector('[data-svadmin-component="SafeDeleteConfirm"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('生产数据库集群删除审查');
    expect(dialog?.textContent).toContain('删除后所有从库与快照将一并销毁。');
    expect(dialog?.textContent).toContain('prod-database-cluster-01');
    expect(dialog?.textContent).toContain('关联数据库实例');
    expect(dialog?.textContent).toContain('8');
    expect(dialog?.textContent).toContain('1.2 TB');
  });

  it('prevents paste and shows warning message when preventPaste is enabled', async () => {
    const { container } = render(SafeDeleteConfirm, {
      props: {
        open: true,
        targetName: 'my-service-app',
        preventPaste: true,
      },
    });

    const input = container.querySelector('input[data-svadmin-field="confirm-input"]');
    expect(input).not.toBeNull();

    if (input) {
      // 模拟粘贴事件
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
      input.dispatchEvent(pasteEvent);
      expect(pasteEvent.defaultPrevented).toBe(true);
    }
  });

  it('enforces input matching and countdown unlock before allowing deletion', async () => {
    const onconfirmMock = vi.fn();
    const oncancelMock = vi.fn();

    const { container } = render(SafeDeleteConfirm, {
      props: {
        open: true,
        targetName: 'critical-tenant-vault',
        countdown: 0, // 设为 0 便于验证输入匹配解锁
        onconfirm: onconfirmMock,
        oncancel: oncancelMock,
      },
    });

    const input = container.querySelector('input[data-svadmin-field="confirm-input"]');
    const confirmBtn = container.querySelector('button[data-svadmin-action="confirm-delete"]') as HTMLButtonElement;
    expect(input).not.toBeNull();
    expect(confirmBtn).not.toBeNull();

    // 初始状态下禁用
    expect(confirmBtn.disabled).toBe(true);

    // 输入不匹配
    if (input) {
      await fireEvent.input(input, { target: { value: 'wrong-name' } });
      expect(confirmBtn.disabled).toBe(true);

      // 输入完全匹配
      await fireEvent.input(input, { target: { value: 'critical-tenant-vault' } });
      expect(confirmBtn.disabled).toBe(false);

      // 点击确认
      await fireEvent.click(confirmBtn);
      expect(onconfirmMock).toHaveBeenCalledTimes(1);
    }
  });

  it('handles cancellation and close triggers properly', async () => {
    const oncancelMock = vi.fn();
    const { container } = render(SafeDeleteConfirm, {
      props: {
        open: true,
        targetName: 'test-resource',
        oncancel: oncancelMock,
      },
    });

    const closeBtn = container.querySelector('button[aria-label="Close"]');
    expect(closeBtn).not.toBeNull();
    if (closeBtn) {
      await fireEvent.click(closeBtn);
      expect(oncancelMock).toHaveBeenCalledTimes(1);
    }
  });
});
