import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Link from './Link.svelte';
import Result from './Result.svelte';
import ItemList from './ItemList.svelte';
import Tree from './Tree.svelte';
import Spin from './Spin.svelte';

afterEach(() => cleanup());

describe('Arco gap components', () => {
  it('renders a link, result, list, tree and spin with Arco roles', () => {
    render(Link, { href: '/docs', children: undefined });
    render(Result, { status: 'success', title: '提交成功', subtitle: '可以返回列表' });
    render(ItemList, { items: [{ id: '1', title: '第一条', description: '说明' }] });
    render(Tree, { nodes: [{ id: 'root', label: '根节点', children: [{ id: 'leaf', label: '叶子' }] }] });
    render(Spin, { tip: '加载中' });

    expect(screen.getByRole('heading', { name: '提交成功' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('加载中');
    expect(screen.getByRole('tree')).toBeTruthy();
    expect(screen.getByRole('button', { name: '根节点' })).toBeTruthy();
    expect(screen.getByText('第一条')).toBeTruthy();
  });
});
