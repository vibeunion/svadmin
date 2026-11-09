import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import GlobalShortcuts from './GlobalShortcuts.svelte';

describe('GlobalShortcuts Component', () => {
  it('renders shortcut dialog when open is true', () => {
    const { container } = render(GlobalShortcuts, {
      props: {
        open: true,
      },
    });

    const modal = container.querySelector('[data-svadmin-component="global-shortcuts"]');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('全局搜索 / 命令面板');
    expect(modal?.textContent).toContain('会话安全锁屏');
  });

  it('filters shortcuts by query', async () => {
    const { container } = render(GlobalShortcuts, {
      props: {
        open: true,
      },
    });

    const searchInput = container.querySelector('input[type="text"]');
    expect(searchInput).not.toBeNull();

    if (searchInput) {
      await fireEvent.input(searchInput, { target: { value: '主题' } });
      expect(container.textContent).toContain('切换主题外观');
      expect(container.textContent).not.toContain('会话安全锁屏');
    }
  });

  it('triggers action when shortcut item is clicked', async () => {
    const actionMock = vi.fn();
    const { container } = render(GlobalShortcuts, {
      props: {
        open: true,
        onAction: actionMock,
      },
    });

    const items = container.querySelectorAll('[role="button"]');
    expect(items.length).toBeGreaterThan(0);

    if (items[0]) {
      await fireEvent.click(items[0]);
      expect(actionMock).toHaveBeenCalled();
    }
  });
});
