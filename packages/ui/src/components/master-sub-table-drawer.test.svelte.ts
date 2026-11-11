import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MasterSubTableDrawer from './MasterSubTableDrawer.svelte';

describe('MasterSubTableDrawer suite', () => {
  it('renders master summary and sub-table rows', () => {
    render(MasterSubTableDrawer, {
      open: true,
      masterRecord: { orderNo: 'ORD-9901', customer: 'Acme Inc' },
      masterFields: [
        { key: 'orderNo', label: 'Order No' },
        { key: 'customer', label: 'Customer' },
      ],
      subColumns: [
        { key: 'sku', label: 'SKU' },
        { key: 'qty', label: 'Quantity' },
      ],
      subItems: [{ sku: 'A1', qty: 10 }],
    });

    expect(document.body.textContent).toContain('ORD-9901');
    expect(document.body.textContent).toContain('Acme Inc');
    expect(document.body.textContent).toContain('A1');
    expect(document.body.textContent).toContain('10');
  });

  it('triggers onSave when clicking save changes', async () => {
    const onSave = vi.fn();
    render(MasterSubTableDrawer, {
      open: true,
      masterRecord: { id: 1 },
      subColumns: [{ key: 'id', label: 'ID' }],
      subItems: [{ id: 101 }],
      onSave,
    });

    const saveBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('保存') || b.textContent?.includes('Save'),
    );
    expect(saveBtn).toBeTruthy();
    if (saveBtn) {
      await fireEvent.click(saveBtn);
      expect(onSave).toHaveBeenCalled();
    }
  });
});
