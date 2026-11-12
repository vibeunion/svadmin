import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DashboardGridLayout from './DashboardGridLayout.svelte';

describe('DashboardGridLayout component suite', () => {
  it('renders grid widgets and title', () => {
    const { getByText, container } = render(DashboardGridLayout, {
      title: '监控中心大屏',
    });

    expect(getByText('监控中心大屏')).toBeTruthy();
    expect(getByText('本季度核心营收 (GMV)')).toBeTruthy();
    expect(getByText('¥48,290,000')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="dashboard-grid-layout"]')).toBeTruthy();
  });

  it('toggles editable mode and adds a widget', async () => {
    const onAdd = vi.fn();
    const { getByText } = render(DashboardGridLayout, {
      onAddWidget: onAdd,
    });

    const editBtn = getByText('编辑布局');
    await fireEvent.click(editBtn);

    expect(getByText('完成排版')).toBeTruthy();
    const addCardBtn = getByText('添加卡片');
    expect(addCardBtn).toBeTruthy();
    await fireEvent.click(addCardBtn);

    expect(onAdd).toHaveBeenCalledWith('kpi');
  });

  it('removes a widget when clicking remove in editable mode', async () => {
    const onRemove = vi.fn();
    const { container } = render(DashboardGridLayout, {
      isEditable: true,
      onRemoveWidget: onRemove,
    });

    const removeBtns = container.querySelectorAll('button[title="移除小部件"]');
    expect(removeBtns.length).toBeGreaterThan(0);
    const firstRemoveBtn = removeBtns[0];
    if (firstRemoveBtn) {
      await fireEvent.click(firstRemoveBtn);
    }

    expect(onRemove).toHaveBeenCalled();
  });
});
