import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import HotkeysHelpModal from './HotkeysHelpModal.svelte';

describe('HotkeysHelpModal Component', () => {
  it('renders modal when open is true', () => {
    const { container } = render(HotkeysHelpModal, {
      props: {
        open: true,
      },
    });

    const root = container.querySelector('[data-svadmin-component="HotkeysHelpModal"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('快捷键指引');
    expect(container.textContent).toContain('打开全局命令栏');
  });

  it('filters hotkeys based on search query', async () => {
    const { container } = render(HotkeysHelpModal, {
      props: {
        open: true,
      },
    });

    const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    await fireEvent.input(searchInput, { target: { value: '命令栏' } });
    expect(container.textContent).toContain('打开全局命令栏');
    expect(container.textContent).not.toContain('保存表单');

    await fireEvent.input(searchInput, { target: { value: 'xyznotfound999' } });
    expect(container.textContent).toContain('未找到匹配的键盘快捷键');
  });

  it('filters hotkeys based on category selection', async () => {
    const { container } = render(HotkeysHelpModal, {
      props: {
        open: true,
      },
    });

    const formCategoryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('表单与编辑')
    );
    expect(formCategoryBtn).toBeTruthy();

    if (formCategoryBtn) {
      await fireEvent.click(formCategoryBtn);
    }
    expect(container.textContent).toContain('保存表单 / 提交');
    expect(container.textContent).not.toContain('打开全局命令栏');
  });

  it('formats keys properly for mac platform', () => {
    const { container } = render(HotkeysHelpModal, {
      props: {
        open: true,
        platform: 'mac',
      },
    });

    const kbds = Array.from(container.querySelectorAll('kbd')).map((k) => k.textContent?.trim());
    expect(kbds).toContain('⌘');
    expect(container.textContent).toContain('macOS (⌘)');
  });

  it('invokes onOpenChange when closing via close button', async () => {
    const onOpenChange = vi.fn();
    const { container } = render(HotkeysHelpModal, {
      props: {
        open: true,
        onOpenChange,
      },
    });

    const closeBtn = container.querySelector('button[title*="关闭"]');
    expect(closeBtn).toBeTruthy();
    if (closeBtn) {
      await fireEvent.click(closeBtn);
    }

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
