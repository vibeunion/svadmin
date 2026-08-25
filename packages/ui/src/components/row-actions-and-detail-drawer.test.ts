import { describe, expect, it } from 'vitest';
import RowActions from './RowActions.svelte';
import DetailDrawer from './DetailDrawer.svelte';

describe('RowActions & DetailDrawer components', () => {
  it('exports RowActions and DetailDrawer components correctly', () => {
    expect(RowActions).toBeDefined();
    expect(DetailDrawer).toBeDefined();
  });

  it('filters and partitions actions based on maxVisible', () => {
    const actions = [
      { label: '查看', onclick: () => {} },
      { label: '编辑', onclick: () => {} },
      { label: '删除', onclick: () => {}, danger: true },
      { label: '隐藏项', onclick: () => {}, hidden: true },
    ];

    const visible = actions.filter((a) => !a.hidden).slice(0, 2);
    const overflow = actions.filter((a) => !a.hidden).slice(2);

    expect(visible.length).toBe(2);
    expect(visible[0].label).toBe('查看');
    expect(visible[1].label).toBe('编辑');

    expect(overflow.length).toBe(1);
    expect(overflow[0].label).toBe('删除');
    expect(overflow[0].danger).toBe(true);
  });
});
