import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '../../test/legacy-locale';
import TreeTransfer, { type TreeTransferNode } from './TreeTransfer.svelte';

beforeEach(() => {
  setLocale('zh-CN');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const testNodes: TreeTransferNode[] = [
  {
    key: 'dept-1',
    title: '研发中心',
    children: [
      { key: 'fe', title: '前端架构组' },
      { key: 'be', title: '后端架构组' },
    ],
  },
  {
    key: 'dept-2',
    title: '产品设计中心',
    children: [
      { key: 'ui', title: 'UI/UX 组' },
    ],
  },
];

describe('TreeTransfer', () => {
  it('renders root container with correct data attribute', () => {
    const { container } = render(TreeTransfer, {
      dataSource: testNodes,
      targetKeys: ['fe'],
    });

    const root = container.querySelector('[data-svadmin-component="TreeTransfer"]');
    expect(root).toBeTruthy();
    expect(screen.getByText('研发中心')).toBeTruthy();
    expect(screen.getAllByText('前端架构组').length).toBeGreaterThanOrEqual(1);
  });

  it('selects and deselects node via onchange', async () => {
    const onchange = vi.fn();
    render(TreeTransfer, {
      dataSource: testNodes,
      targetKeys: [],
      onchange,
    });

    const feNode = screen.getByText('前端架构组');
    await fireEvent.click(feNode);

    expect(onchange).toHaveBeenCalledWith(['fe']);
  });

  it('clears all selected targets', async () => {
    const onchange = vi.fn();
    render(TreeTransfer, {
      dataSource: testNodes,
      targetKeys: ['fe', 'ui'],
      onchange,
    });

    const clearButton = screen.getByText('清空已选');
    await fireEvent.click(clearButton);

    expect(onchange).toHaveBeenCalledWith([]);
  });
});
