import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import HotkeysHelpModal from './HotkeysHelpModal.svelte';

describe('HotkeysHelpModal Component', () => {
  it('renders modal when open is true', () => {
    const { baseElement: container } = render(HotkeysHelpModal, {
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
    const { baseElement: container } = render(HotkeysHelpModal, {
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
    const { baseElement: container } = render(HotkeysHelpModal, {
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
    const { baseElement: container } = render(HotkeysHelpModal, {
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
    const { baseElement: container } = render(HotkeysHelpModal, {
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
  it('moves focus to search and closes once on Escape, restoring the trigger', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const onOpenChange = vi.fn();
    const { baseElement, unmount } = render(HotkeysHelpModal, { props: { open: true, onOpenChange } });
    const search = baseElement.querySelector<HTMLInputElement>('input[type="search"]');
    expect(search).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(search));
    if (search) await fireEvent.keyDown(search, { key: 'Escape' });
    await waitFor(() => expect(baseElement.querySelector('[role="dialog"]')).toBeNull());
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    unmount(); trigger.remove();
  });
  it('reacts to platform and category changes', async () => {
    const { baseElement, rerender } = render(HotkeysHelpModal, { props: {
      open: true, platform: 'mac', hotkeys: [{ id: 'a', name: 'Old action', keys: ['Meta'], category: 'Old' }],
    } });
    const oldTab = Array.from(baseElement.querySelectorAll('button')).find(button => button.textContent?.includes('Old ('));
    if (!oldTab) throw new Error('missing category tab');
    await fireEvent.click(oldTab);
    await rerender({ open: true, platform: 'windows', hotkeys: [{ id: 'b', name: 'New action', keys: ['Meta'], category: 'New' }] });
    expect(baseElement.textContent).toContain('New action');
    expect(baseElement.textContent).toContain('Win');
    expect(baseElement.textContent).not.toContain('macOS');
  });

});
