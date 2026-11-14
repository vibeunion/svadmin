import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CannedResponsePicker, { type CannedTemplate } from './CannedResponsePicker.svelte';

describe('CannedResponsePicker', () => {
  const templates: CannedTemplate[] = [
    {
      id: 'tpl_hello',
      title: '工单受理问候',
      category: '常见接待',
      shortcut: '/hello',
      content: '尊敬的 {{customer_name}} 客户您好，您的工单 {{ticket_id}} 已受理，工程师正火速排查中。',
    },
    {
      id: 'tpl_resolve',
      title: '故障修复结单',
      category: '结单致谢',
      shortcut: '/done',
      content: '尊敬的客户，相关问题已为您妥善修复，请刷新控制台重试。',
    },
  ];

  it('renders template list and category tabs', () => {
    render(CannedResponsePicker, {
      props: {
        templates,
      },
    });

    expect(screen.getByText('快捷客服与工单回复模版')).toBeTruthy();
    // The title is rendered in both the list row and the live preview.
    expect(screen.getAllByText('工单受理问候').length).toBeGreaterThan(0);
    expect(screen.getAllByText('故障修复结单').length).toBeGreaterThan(0);
    expect(screen.getAllByText('常见接待').length).toBeGreaterThan(0);
    expect(screen.getAllByText('结单致谢').length).toBeGreaterThan(0);
  });

  it('substitutes dynamic variables from contextVariables and calls onselect', async () => {
    const onselect = vi.fn();
    render(CannedResponsePicker, {
      props: {
        templates,
        contextVariables: {
          customer_name: '张总',
          ticket_id: 'TCK-8848',
        },
        onselect,
      },
    });

    // 检查推演预览中占位符是否被替换为实参
    expect(
      screen.getByText('尊敬的 张总 客户您好，您的工单 TCK-8848 已受理，工程师正火速排查中。')
    ).toBeTruthy();

    const selectBtn = screen.getByText('选用此模版并填入');
    await fireEvent.click(selectBtn);

    expect(onselect).toHaveBeenCalledWith(
      '尊敬的 张总 客户您好，您的工单 TCK-8848 已受理，工程师正火速排查中。',
      templates[0]
    );
  });
});
