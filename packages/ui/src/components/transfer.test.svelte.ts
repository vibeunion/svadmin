import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Transfer, { type TransferItem } from './Transfer.svelte';

const testItems: TransferItem[] = [
  { key: 'admin', title: '管理员权限', description: '系统所有操作权限' },
  { key: 'editor', title: '编辑者权限', description: '内容编写与发布' },
  { key: 'viewer', title: '访问者权限', description: '仅供查看' },
];

describe('Transfer component', () => {
  it('renders source and target lists with titles', () => {
    const view = render(Transfer, {
      dataSource: testItems,
      targetKeys: ['viewer'],
      titles: ['未选权限', '已选权限'],
    });

    expect(view.container.textContent).toContain('未选权限');
    expect(view.container.textContent).toContain('已选权限');
    expect(view.container.textContent).toContain('管理员权限');
    expect(view.container.textContent).toContain('编辑者权限');
    expect(view.container.textContent).toContain('访问者权限');
  });

  it('filters items when search input is typed', async () => {
    const view = render(Transfer, {
      dataSource: testItems,
      targetKeys: [],
    });

    const searchInput = view.container.querySelector('input[type="text"]');
    expect(searchInput).not.toBeNull();
    if (searchInput) {
      await fireEvent.input(searchInput, { target: { value: '管理' } });
    }

    expect(view.container.textContent).toContain('管理员权限');
    expect(view.container.textContent).not.toContain('编辑者权限');
  });
});
