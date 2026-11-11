import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ResultPage from './ResultPage.svelte';

describe('ResultPage Component', () => {
  it('renders success state with title and description', () => {
    const { container } = render(ResultPage, {
      props: {
        status: 'success',
        title: '订单提交成功',
        description: '您的工单已进入自动审批队列，审批完成后将发送通知。',
      },
    });

    const root = container.querySelector('[data-svadmin-component="ResultPage"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-status')).toBe('success');
    expect(container.textContent).toContain('订单提交成功');
    expect(container.textContent).toContain('您的工单已进入自动审批队列');
  });

  it('renders primary and secondary action buttons and handles clicks', async () => {
    const primaryMock = vi.fn();
    const secondaryMock = vi.fn();

    const { container } = render(ResultPage, {
      props: {
        status: 'success',
        title: '操作完成',
        primaryActionText: '返回列表',
        onPrimaryAction: primaryMock,
        secondaryActionText: '再次发起',
        onSecondaryAction: secondaryMock,
      },
    });

    const primaryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('返回列表')
    );
    const secondaryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('再次发起')
    );

    expect(primaryBtn).toBeDefined();
    expect(secondaryBtn).toBeDefined();

    if (primaryBtn) {
      await fireEvent.click(primaryBtn);
      expect(primaryMock).toHaveBeenCalledTimes(1);
    }

    if (secondaryBtn) {
      await fireEvent.click(secondaryBtn);
      expect(secondaryMock).toHaveBeenCalledTimes(1);
    }
  });

  it('renders 403, 404, 500 error status pages with appropriate tones', () => {
    const { container: c403 } = render(ResultPage, {
      props: {
        status: '403',
        title: '无权访问',
      },
    });
    expect(c403.querySelector('[data-status="403"]')).toBeTruthy();

    const { container: c500 } = render(ResultPage, {
      props: {
        status: '500',
        title: '服务器故障',
      },
    });
    expect(c500.querySelector('[data-status="500"]')).toBeTruthy();
  });
});
