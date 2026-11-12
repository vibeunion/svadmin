import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DashboardLayoutStorage from './DashboardLayoutStorage.svelte';

describe('DashboardLayoutStorage component suite', () => {
  it('renders presets and handles selection', async () => {
    const onSelect = vi.fn();
    const { getByText, getAllByText, container } = render(DashboardLayoutStorage, {
      onSelectPreset: onSelect,
    });

    expect(getByText('大屏排版预设方案库')).toBeTruthy();
    expect(getByText('高管经营全景大屏')).toBeTruthy();
    expect(container.querySelector('[data-svadmin-component="dashboard-layout-storage"]')).toBeTruthy();

    const applyBtns = getAllByText('应用此布局');
    expect(applyBtns.length).toBeGreaterThan(0);
    await fireEvent.click(applyBtns[0]);

    expect(onSelect).toHaveBeenCalled();
  });

  it('saves new preset through inline form', async () => {
    const onSave = vi.fn();
    const { getByText, getByPlaceholderText } = render(DashboardLayoutStorage, {
      onSaveCurrentAsPreset: onSave,
    });

    const openSaveBtn = getByText('另存为方案');
    await fireEvent.click(openSaveBtn);

    const nameInput = getByPlaceholderText('输入大屏方案名称 (如：双十一作战指挥大屏)...');
    await fireEvent.input(nameInput, { target: { value: '我的自定义监控看板' } });

    const confirmBtn = getByText('保存方案');
    await fireEvent.click(confirmBtn);

    expect(onSave).toHaveBeenCalledWith('我的自定义监控看板', '');
  });
});
