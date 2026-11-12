import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AdminCopilotWidget from './AdminCopilotWidget.svelte';

describe('AdminCopilotWidget Component', () => {
  it('renders floating trigger button and toggles open card', async () => {
    const { container } = render(AdminCopilotWidget, {
      props: {
        botName: 'AI 财务分析助手',
        defaultOpen: false,
      },
    });

    const root = container.querySelector('[data-svadmin-component="AdminCopilotWidget"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-open')).toBe('false');

    const triggerBtn = container.querySelector('button[aria-label="Open AI Copilot"]');
    expect(triggerBtn).toBeTruthy();
    if (triggerBtn) {
      await fireEvent.click(triggerBtn);
      expect(root?.getAttribute('data-open')).toBe('true');
      expect(container.textContent).toContain('AI 财务分析助手');
    }
  });

  it('sends user message and renders filter recommendation with apply callback', async () => {
    const onApply = vi.fn();
    const onSend = vi.fn().mockResolvedValue({
      id: 'mock-1',
      role: 'assistant',
      content: '已为您找到相关单据，建议应用筛选条件：',
      suggestedFilter: {
        field: 'status',
        operator: '=',
        value: 'paid',
        label: '订单状态 = 已支付',
      },
    });

    const { container } = render(AdminCopilotWidget, {
      props: {
        defaultOpen: true,
        onsendmessage: onSend,
        onapplyfilter: onApply,
      },
    });

    const input = container.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    if (input) {
      await fireEvent.input(input, { target: { value: '帮我查已支付订单' } });
      const form = container.querySelector('form');
      if (form) await fireEvent.submit(form);
      await new Promise((r) => setTimeout(r, 20));

      expect(onSend).toHaveBeenCalledWith('帮我查已支付订单');
      expect(container.textContent).toContain('订单状态 = 已支付');

      const applyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('一键应用此筛选')
      );
      expect(applyBtn).toBeTruthy();
      if (applyBtn) {
        await fireEvent.click(applyBtn);
        expect(onApply).toHaveBeenCalled();
      }
    }
  });
});
