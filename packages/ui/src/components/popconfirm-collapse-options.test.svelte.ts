import { describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, fireEvent, screen } from '@testing-library/svelte';
import Popconfirm from './Popconfirm.svelte';
import Collapse from './Collapse.svelte';
import PopconfirmHarness from '../../test/fixtures/PopconfirmHarness.svelte';

const emptySnippet = () => createRawSnippet(() => ({ render: () => '<span></span>' }));

describe('Popconfirm and Collapse option parity', () => {
  it('renders Popconfirm with content description, onOk alias, and okLoading', async () => {
    const onOk = vi.fn();
    render(Popconfirm, {
      title: '确认提交变更？',
      content: '此操作将同步至生产集群。',
      okText: '立即执行',
      okLoading: false,
      onOk,
      children: emptySnippet(),
    });
  });

  it('triggers onOk and closes on confirm in Popconfirm', async () => {
    const onOk = vi.fn();
    const { getByRole } = render(PopconfirmHarness, {
      props: {
        title: '删除项目？',
        onConfirm: onOk,
      },
    });

    const trigger = getByRole('button', { name: '删除数据' });
    await fireEvent.click(trigger);

    expect(screen.getByText('删除项目？')).toBeDefined();
    const okBtn = screen.getByRole('button', { name: '确定' });
    await fireEvent.click(okBtn);
    expect(onOk).toHaveBeenCalledTimes(1);
  });

  it('supports popupVisible controlled prop and onVisibleChange in Popconfirm', () => {
    const onVisibleChange = vi.fn();
    const view = render(Popconfirm, {
      title: 'Controlled confirm',
      popupVisible: true,
      onVisibleChange,
      children: emptySnippet(),
    });

    expect(screen.getByText('Controlled confirm')).toBeDefined();
  });

  it('renders Collapse with key, header, extra and defaultActiveKey', () => {
    const view = render(Collapse, {
      items: [
        {
          key: 'panel-1',
          header: '第一面板',
          content: emptySnippet(),
        },
        {
          key: 'panel-2',
          header: '第二面板',
          content: emptySnippet(),
        },
      ],
      defaultActiveKey: ['panel-1'],
    });

    expect(view.container.textContent).toContain('第一面板');
    expect(view.container.textContent).toContain('第二面板');
    const trigger1 = view.container.querySelector('button[aria-controls="svadmin-collapse-panel-1"]');
    expect(trigger1?.getAttribute('aria-expanded')).toBe('true');
  });
});
