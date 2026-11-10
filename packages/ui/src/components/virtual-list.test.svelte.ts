import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import VirtualList from './VirtualList.svelte';

describe('VirtualList Component', () => {
  const dummyItems = Array.from({ length: 100 }, (_, i) => ({
    id: `item-${i}`,
    title: `Data Record ${i + 1}`,
  }));

  it('renders visible slice of items without mounting all 100 DOM elements', () => {
    const { container } = render(VirtualList, {
      props: {
        items: dummyItems,
        itemHeight: 50,
        height: 300,
        overscan: 2,
        keyField: 'id',
      },
    });

    const root = container.querySelector('[data-svadmin-component="VirtualList"]');
    expect(root).not.toBeNull();

    // 视口高 300，每项 50，一屏约 6 项，加上 overscan 2，挂载数量应远少于 100 项
    const renderedRows = container.querySelectorAll('[data-index]');
    expect(renderedRows.length).toBeGreaterThan(0);
    expect(renderedRows.length).toBeLessThan(30);

    // 检查首项渲染
    expect(container.textContent).toContain('Data Record 1');
  });

  it('renders empty fallback when items array is empty', () => {
    const { container } = render(VirtualList, {
      props: {
        items: [],
      },
    });

    expect(container.textContent).toContain('暂无数据');
  });
});
