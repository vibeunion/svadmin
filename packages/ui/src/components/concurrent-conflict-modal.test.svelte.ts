import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ConcurrentConflictModal, { type ConflictFieldDiff } from './ConcurrentConflictModal.svelte';

describe('ConcurrentConflictModal Component', () => {
  const conflictFields: ConflictFieldDiff[] = [
    {
      field: 'title',
      label: '商品名称',
      baseValue: '旧手机',
      localValue: '智能手机 Pro 2026',
      remoteValue: '旗舰手机 Ultra 2026',
    },
    {
      field: 'price',
      label: '销售价格',
      baseValue: 1999,
      localValue: 2499,
      remoteValue: 2699,
    },
  ];

  it('renders dialog with modifier information and conflict fields table', () => {
    const { container } = render(ConcurrentConflictModal, {
      props: {
        open: true,
        conflictFields,
        modifiedBy: '李四 (运营专家)',
        modifiedAt: '2026-11-10T12:30:00.000Z',
      },
    });

    const dialog = container.querySelector('[data-svadmin-component="ConcurrentConflictModal"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('李四 (运营专家)');
    expect(dialog?.textContent).toContain('商品名称');
    expect(dialog?.textContent).toContain('智能手机 Pro 2026');
    expect(dialog?.textContent).toContain('旗舰手机 Ultra 2026');
    expect(dialog?.textContent).toContain('销售价格');
    expect(dialog?.textContent).toContain('2499');
    expect(dialog?.textContent).toContain('2699');
  });

  it('allows toggling field resolution choices and triggers onresolve with merged data', async () => {
    const onresolveMock = vi.fn();
    const { container } = render(ConcurrentConflictModal, {
      props: {
        open: true,
        conflictFields,
        onresolve: onresolveMock,
      },
    });

    // 默认 title 选 local，price 选 local
    // 将 price 改为选择远端数据
    const remotePriceBtn = container.querySelector('button[data-svadmin-choice="remote-price"]');
    expect(remotePriceBtn).not.toBeNull();
    if (remotePriceBtn) {
      await fireEvent.click(remotePriceBtn);
    }

    // 点击“应用合并方案并保存”
    const mergeBtn = container.querySelector('button[data-svadmin-action="merge-conflict"]');
    expect(mergeBtn).not.toBeNull();
    if (mergeBtn) {
      await fireEvent.click(mergeBtn);
      expect(onresolveMock).toHaveBeenCalledWith({
        title: '智能手机 Pro 2026', // 保留本地
        price: 2699,                // 采纳远端
      });
    }
  });

  it('triggers ondiscard and onoverwrite callbacks correctly', async () => {
    const ondiscardMock = vi.fn();
    const onoverwriteMock = vi.fn();

    const { container } = render(ConcurrentConflictModal, {
      props: {
        open: true,
        conflictFields,
        ondiscard: ondiscardMock,
        onoverwrite: onoverwriteMock,
      },
    });

    const discardBtn = container.querySelector('button[data-svadmin-action="discard-conflict"]');
    if (discardBtn) {
      await fireEvent.click(discardBtn);
      expect(ondiscardMock).toHaveBeenCalledTimes(1);
    }

    const overwriteBtn = container.querySelector('button[data-svadmin-action="overwrite-conflict"]');
    if (overwriteBtn) {
      await fireEvent.click(overwriteBtn);
      expect(onoverwriteMock).toHaveBeenCalledTimes(1);
    }
  });
});
