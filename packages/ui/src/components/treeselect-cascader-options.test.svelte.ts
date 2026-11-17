import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import TreeSelect from './TreeSelect.svelte';
import Cascader from './Cascader.svelte';

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
});
