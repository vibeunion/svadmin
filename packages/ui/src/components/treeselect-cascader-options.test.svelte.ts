import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TreeSelect from './TreeSelect.svelte';
import Cascader from './Cascader.svelte';
import Tree from './Tree.svelte';

describe('TreeSelect and Cascader option parity', () => {
  it('renders TreeSelect with treeData and key/title node properties', async () => {
    const treeData = [
      {
        key: 'node-1',
        title: '节点 1',
        children: [
          { key: 'node-1-1', title: '子节点 1-1' },
        ],
      },
      { key: 'node-2', title: '节点 2' },
    ];

    const view = render(TreeSelect, {
      treeData,
      value: 'node-1-1',
      showSearch: false,
    });

    expect(view.container.textContent).toContain('子节点 1-1');
  });

  it('renders Cascader with data alias and key/title node properties', () => {
    const data = [
      {
        key: 'zhejiang',
        title: '浙江省',
        children: [
          { key: 'hangzhou', title: '杭州市' },
        ],
      },
    ];

    const view = render(Cascader, {
      data,
      value: ['zhejiang', 'hangzhou'],
    });

    expect(view.container.textContent).toContain('浙江省 / 杭州市');
  });

  it('supports defaultExpandedKeys, defaultSelectedKeys, and onSelect in Tree', async () => {
    const onSelect = vi.fn();
    const treeData = [
      {
        key: 'dept-1',
        title: '技术部',
        children: [
          { key: 'team-frontend', title: '前端组' },
        ],
      },
    ];

    const view = render(Tree, {
      treeData,
      defaultExpandedKeys: ['dept-1'],
      defaultSelectedKeys: ['team-frontend'],
      onSelect,
    });

    expect(view.container.textContent).toContain('前端组');
    const selectedNode = view.container.querySelector('[aria-selected="true"]');
    expect(selectedNode).not.toBeNull();
    expect(selectedNode?.textContent).toContain('前端组');

    const deptBtn = view.container.querySelector('button[aria-label="技术部"]');
    if (deptBtn) {
      await fireEvent.click(deptBtn);
      expect(onSelect).toHaveBeenCalled();
    }
  });

  it('supports defaultValue in TreeSelect and Cascader', () => {
    const treeData = [
      { key: 'opt-1', title: '选项一' },
      { key: 'opt-2', title: '选项二' },
    ];

    const selectView = render(TreeSelect, {
      treeData,
      defaultValue: 'opt-1',
    });
    expect(selectView.container.textContent).toContain('选项一');

    const cascaderData = [
      {
        key: 'bj',
        title: '北京市',
        children: [{ key: 'hd', title: '海淀区' }],
      },
    ];
    const cascaderView = render(Cascader, {
      data: cascaderData,
      defaultValue: ['bj', 'hd'],
    });
    expect(cascaderView.container.textContent).toContain('北京市 / 海淀区');
  });
});
