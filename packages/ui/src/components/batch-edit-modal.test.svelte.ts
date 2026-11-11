import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import BatchEditModal, { type BatchFieldOption } from './BatchEditModal.svelte';

describe('BatchEditModal Component', () => {
  const fields: BatchFieldOption[] = [
    { key: 'assignee', label: '负责人', type: 'text' },
    { key: 'status', label: '审批状态', type: 'select', options: [{ label: '通过', value: 'approved' }] },
  ];

  it('does not render modal when open is false', () => {
    const { container } = render(BatchEditModal, {
      props: {
        open: false,
        selectedCount: 15,
        fields,
      },
    });

    expect(container.querySelector('[data-svadmin-component="BatchEditModal"]')).toBeNull();
  });

  it('renders modal with selected record count and impact warning', () => {
    const { container } = render(BatchEditModal, {
      props: {
        open: true,
        selectedCount: 28,
        resourceName: '交易单据',
        fields,
      },
    });

    const modal = container.querySelector('[data-svadmin-component="BatchEditModal"]');
    expect(modal).toBeTruthy();
    expect(container.textContent).toContain('批量修改 交易单据 (28 条记录)');
    expect(container.textContent).toContain('高影响操作提示');
    expect(container.textContent).toContain('28');
  });

  it('triggers onconfirm callback with payload changes', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const { container } = render(BatchEditModal, {
      props: {
        open: true,
        selectedCount: 10,
        fields,
        onconfirm: onConfirm,
        onclose: onClose,
      },
    });

    const input = container.querySelector('input[type="text"]');
    if (input) {
      await fireEvent.input(input, { target: { value: '李工' } });
    }

    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('确认批量修改')
    );
    expect(confirmBtn).toBeTruthy();
    if (confirmBtn) {
      await fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    }
  });
});
