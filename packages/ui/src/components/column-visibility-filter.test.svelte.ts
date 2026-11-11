import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ColumnVisibilityDrawer from './ColumnVisibilityDrawer.svelte';
import ColumnFilterBuilder from './ColumnFilterBuilder.svelte';
import type { ColumnItem, ColumnPreset } from './ColumnSettings.svelte';
import type { FieldDefinition, Filter } from '@svadmin/core';

describe('ColumnVisibilityDrawer and ColumnFilterBuilder suite', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('renders ColumnVisibilityDrawer with columns, allows visibility toggle', async () => {
    const onchange = vi.fn();
    const cols: ColumnItem[] = [
      { key: 'id', label: 'Order ID', visible: true, required: true },
      { key: 'customer', label: 'Customer', visible: true },
      { key: 'amount', label: 'Total Amount', visible: true },
    ];

    render(ColumnVisibilityDrawer, {
      open: true,
      columns: cols,
      onchange,
    });

    expect(document.body.textContent).toContain('Order ID');
    expect(document.body.textContent).toContain('Customer');
    expect(document.body.textContent).toContain('Total Amount');

    const customerCheckbox = document.body.querySelector('button[aria-label="Toggle Customer"]');
    expect(customerCheckbox).toBeTruthy();
    if (customerCheckbox) {
      await fireEvent.click(customerCheckbox);
      expect(onchange).toHaveBeenCalled();
    }
  });

  it('pins column to left or right', async () => {
    const onchange = vi.fn();
    const cols: ColumnItem[] = [
      { key: 'id', label: 'Order ID', visible: true },
      { key: 'status', label: 'Status', visible: true },
    ];

    render(ColumnVisibilityDrawer, {
      open: true,
      columns: cols,
      onchange,
    });

    const pinBtn = document.body.querySelector('button[aria-label="Pin Order ID left"]');
    expect(pinBtn).toBeTruthy();
    if (pinBtn) {
      await fireEvent.click(pinBtn);
      expect(onchange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ key: 'id', fixed: 'left' }),
        ]),
      );
    }
  });

  it('applies quick view preset correctly', async () => {
    const onchange = vi.fn();
    const cols: ColumnItem[] = [
      { key: 'id', label: 'ID', visible: true, required: true },
      { key: 'user', label: 'User', visible: true },
      { key: 'extra1', label: 'Extra 1', visible: true },
      { key: 'extra2', label: 'Extra 2', visible: true },
    ];

    const presets: ColumnPreset[] = [
      { id: 'compact', label: '精简视图', visibleKeys: ['id', 'user'] },
    ];

    render(ColumnVisibilityDrawer, {
      open: true,
      columns: cols,
      presets,
      onchange,
    });

    expect(document.body.textContent).toContain('精简视图');
    const presetBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('精简视图'),
    );
    expect(presetBtn).toBeTruthy();
    if (presetBtn) {
      await fireEvent.click(presetBtn);
      expect(onchange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ key: 'id', visible: true }),
          expect.objectContaining({ key: 'user', visible: true }),
          expect.objectContaining({ key: 'extra1', visible: false }),
          expect.objectContaining({ key: 'extra2', visible: false }),
        ]),
      );
    }
  });

  it('renders ColumnFilterBuilder trigger and opens sheet', async () => {
    const fields: FieldDefinition[] = [
      { key: 'status', label: 'Status', type: 'select' },
      { key: 'amount', label: 'Amount', type: 'number' },
    ];

    const initialFilters: Filter[] = [
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const view = render(ColumnFilterBuilder, {
      showTrigger: true,
      title: '高级列组合筛选器',
      fields,
      filters: initialFilters,
    });

    expect(view.container.textContent).toContain('高级列组合筛选器');
    expect(view.container.textContent).toContain('1');
  });
});
