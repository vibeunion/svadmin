import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import OmnibarCommandPalette from './OmnibarCommandPalette.svelte';

describe('OmnibarCommandPalette component suite', () => {
  it('renders command palette dialog when open is true', () => {
    const { getByRole, getByText, container } = render(OmnibarCommandPalette, {
      open: true,
    });

    expect(getByRole('dialog')).toBeTruthy();
    expect(getByText('运营与财务仪表盘')).toBeTruthy();
    expect(getByText('新建采购审批流')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="omnibar-command-palette"]')).toBeTruthy();
  });

  it('filters command items based on search query', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(OmnibarCommandPalette, {
      open: true,
    });

    const input = getByPlaceholderText('输入命令、查找页面或搜索实体资源... (⌘K)');
    await fireEvent.input(input, { target: { value: '导出' } });

    expect(getByText('导出全量报表数据')).toBeTruthy();
    expect(queryByText('运营与财务仪表盘')).toBeNull();
  });

  it('triggers onSelect callback when clicking a command item', async () => {
    const onSelect = vi.fn();
    const { getByText } = render(OmnibarCommandPalette, {
      open: true,
      onSelect,
    });

    const item = getByText('新建采购审批流');
    await fireEvent.click(item);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'act-new-order',
        title: '新建采购审批流',
      })
    );
  });
});
