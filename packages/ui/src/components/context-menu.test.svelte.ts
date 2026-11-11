import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ContextMenu, { type ContextMenuItem } from './ContextMenu.svelte';

describe('ContextMenu Component', () => {
  const items: ContextMenuItem[] = [
    { key: 'copy', label: '复制', shortcut: '⌘C' },
    { key: 'paste', label: '粘贴', shortcut: '⌘V' },
    { key: 'sep1', label: '', divider: true },
    { key: 'delete', label: '删除', danger: true, shortcut: 'Del' },
    { key: 'disabled-item', label: '不可用操作', disabled: true },
  ];

  it('renders container and opens menu on contextmenu event', async () => {
    const { container } = render(ContextMenu, {
      props: { items },
    });

    const trigger = container.querySelector('[data-svadmin-component="ContextMenu"]');
    expect(trigger).toBeTruthy();

    expect(document.querySelector('[data-svadmin-context-menu-popup="true"]')).toBeNull();

    if (trigger) {
      await fireEvent.contextMenu(trigger, { clientX: 100, clientY: 120 });
    }

    const popup = document.querySelector('[data-svadmin-context-menu-popup="true"]');
    expect(popup).toBeTruthy();
    expect(popup?.textContent).toContain('复制');
    expect(popup?.textContent).toContain('⌘C');
    expect(popup?.textContent).toContain('删除');
  });

  it('triggers item click and onselect handler, then closes menu', async () => {
    const onSelectMock = vi.fn();
    const copyClickMock = vi.fn();

    const menuItems: ContextMenuItem[] = [
      { key: 'copy', label: '复制', onclick: copyClickMock },
      { key: 'export', label: '导出' },
    ];

    const { container } = render(ContextMenu, {
      props: {
        items: menuItems,
        onselect: onSelectMock,
      },
    });

    const trigger = container.querySelector('[data-svadmin-component="ContextMenu"]');
    if (trigger) {
      await fireEvent.contextMenu(trigger, { clientX: 200, clientY: 200 });
    }

    const copyBtn = Array.from(document.querySelectorAll('[role="menuitem"]')).find((b) =>
      b.textContent?.includes('复制')
    );
    expect(copyBtn).toBeDefined();

    if (copyBtn) {
      await fireEvent.click(copyBtn);
      expect(copyClickMock).toHaveBeenCalledTimes(1);
      expect(onSelectMock).toHaveBeenCalledWith(menuItems[0]);
    }

    // Popup should now be closed
    expect(document.querySelector('[data-svadmin-context-menu-popup="true"]')).toBeNull();
  });

  it('closes menu on Escape key', async () => {
    const { container } = render(ContextMenu, {
      props: { items },
    });

    const trigger = container.querySelector('[data-svadmin-component="ContextMenu"]');
    if (trigger) {
      await fireEvent.contextMenu(trigger, { clientX: 50, clientY: 50 });
    }

    expect(document.querySelector('[data-svadmin-context-menu-popup="true"]')).toBeTruthy();

    await fireEvent.keyDown(window, { key: 'Escape' });

    expect(document.querySelector('[data-svadmin-context-menu-popup="true"]')).toBeNull();
  });
});
