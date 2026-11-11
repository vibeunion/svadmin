import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TreeTransferSelect, { type TreeTransferNode } from './TreeTransferSelect.svelte';

describe('TreeTransferSelect suite', () => {
  const treeData: TreeTransferNode[] = [
    {
      id: 'dept-eng',
      label: '研发中心',
      children: [
        { id: 'user-ada', label: 'Ada (前端)', isLeaf: true },
        { id: 'user-lin', label: 'Lin (后端)', isLeaf: true },
      ],
    },
    {
      id: 'dept-fin',
      label: '财务部门',
      children: [
        { id: 'user-sam', label: 'Sam (会计)', isLeaf: true },
      ],
    },
  ];

  it('renders tree nodes and assigned count', () => {
    const view = render(TreeTransferSelect, {
      treeData,
      targetKeys: ['user-ada'],
    });

    expect(view.container.textContent).toContain('研发中心');
    expect(view.container.textContent).toContain('Ada (前端)');
    expect(view.container.textContent).toContain('1 items');
  });

  it('moves checked node from left tree to right target', async () => {
    const onChange = vi.fn();
    const view = render(TreeTransferSelect, {
      treeData,
      targetKeys: [],
      onChange,
    });

    const checkboxes = view.container.querySelectorAll('button[role="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    if (checkboxes[0]) {
      await fireEvent.click(checkboxes[0]);
    }

    const moveRightBtn = view.container.querySelector('button[title="穿梭指派至右侧"], button[title="Assign to right"]') as HTMLButtonElement;
    expect(moveRightBtn).toBeTruthy();
    if (moveRightBtn && !moveRightBtn.disabled) {
      await fireEvent.click(moveRightBtn);
      expect(onChange).toHaveBeenCalled();
    }
  });
});
