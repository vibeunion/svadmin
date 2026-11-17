import { describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, fireEvent, screen } from '@testing-library/svelte';
import EmptyState from './EmptyState.svelte';
import Spin from './Spin.svelte';
import Popconfirm from './Popconfirm.svelte';
import Rate from './Rate.svelte';

const emptySnippet = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('Feedback components option parity (EmptyState, Spin, Popconfirm, Rate)', () => {
  it('renders EmptyState with extra slot, imgStyle, and custom description snippet', () => {
    const { container } = render(EmptyState, {
      title: '无数据',
      description: emptySnippet('暂无相关记录'),
      imgSrc: 'https://example.com/empty.png',
      imgStyle: 'width: 120px; height: 120px;',
      extra: emptySnippet('新建一条'),
    });

    const img = container.querySelector('img');
    expect(img?.getAttribute('style')).toContain('width: 120px');
    expect(container.textContent).toContain('暂无相关记录');
    expect(container.textContent).toContain('新建一条');
  });

  it('renders Spin with element snippet and custom tip snippet', () => {
    const { container } = render(Spin, {
      loading: true,
      element: emptySnippet('自定义加载图标'),
      tip: emptySnippet('正在处理中...'),
    });

    expect(container.textContent).toContain('自定义加载图标');
    expect(container.textContent).toContain('正在处理中...');
  });

  it('renders Popconfirm with visible, defaultVisible, and button props', () => {
    render(Popconfirm, {
      title: '确认提交？',
      visible: true,
      okButtonProps: { 'data-testid': 'custom-ok-btn' },
      cancelButtonProps: { 'data-testid': 'custom-cancel-btn' },
      children: emptySnippet('操作'),
    });

    expect(screen.getByTestId('custom-ok-btn')).not.toBeNull();
    expect(screen.getByTestId('custom-cancel-btn')).not.toBeNull();
  });

  it('supports Rate readOnly, onChange, and onHoverChange', async () => {
    const onChange = vi.fn();
    const onHoverChange = vi.fn();

    const { getAllByRole } = render(Rate, {
      value: 2,
      readOnly: false,
      onChange,
      onHoverChange,
    });

    const buttons = getAllByRole('radio');
    expect(buttons.length).toBe(5);

    const fourthStar = buttons[3];
    if (fourthStar === undefined) throw new Error('expected five stars');
    await fireEvent.mouseEnter(fourthStar);
    expect(onHoverChange).toHaveBeenCalledWith(4);

    await fireEvent.click(fourthStar);
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
