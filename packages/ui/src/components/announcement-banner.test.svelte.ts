import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AnnouncementBanner from './AnnouncementBanner.svelte';

describe('AnnouncementBanner Component', () => {
  it('renders single announcement message with default warning tone', () => {
    const { container } = render(AnnouncementBanner, {
      props: {
        message: '系统将于今晚 23:00 进行停服维护，请提前保存数据。',
        tone: 'warning',
      },
    });

    const root = container.querySelector('[data-svadmin-component="AnnouncementBanner"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('系统将于今晚 23:00 进行停服维护');
    expect(root?.className).toContain('text-warning');
  });

  it('renders multiple announcements with carousel pagination controls', async () => {
    const items = [
      { id: 1, message: '第一条：新版本 v2.4 已正式发布' },
      { id: 2, message: '第二条：多租户权限系统升级完毕' },
    ];

    const { container } = render(AnnouncementBanner, {
      props: {
        items,
        interval: 0,
      },
    });

    expect(container.textContent).toContain('[1/2]');
    expect(container.textContent).toContain('第一条：新版本 v2.4 已正式发布');

    const nextBtn = container.querySelector('button[aria-label="Next announcement"]');
    expect(nextBtn).toBeTruthy();
    if (nextBtn) {
      await fireEvent.click(nextBtn);
      expect(container.textContent).toContain('[2/2]');
      expect(container.textContent).toContain('第二条：多租户权限系统升级完毕');
    }
  });

  it('renders countdown clock when countdownTo is specified', () => {
    const future = new Date(Date.now() + 3600 * 1000 * 2); // 2 hours later
    const { container } = render(AnnouncementBanner, {
      props: {
        message: '紧急系统停机维护通知',
        countdownTo: future,
        countdownPrefix: '倒计时: ',
      },
    });

    expect(container.textContent).toContain('倒计时: ');
  });

  it('triggers onaction callback when action button is clicked', async () => {
    const onAction = vi.fn();
    const { container } = render(AnnouncementBanner, {
      props: {
        message: '安全警告：发现异常异地登录',
        tone: 'error',
        actionText: '立即查看',
        onaction: onAction,
      },
    });

    expect(container.textContent).toContain('立即查看');
    const buttons = container.querySelectorAll('button');
    const targetBtn = Array.from(buttons).find((b) => b.textContent?.includes('立即查看'));
    expect(targetBtn).toBeTruthy();

    if (targetBtn) {
      await fireEvent.click(targetBtn);
      expect(onAction).toHaveBeenCalledTimes(1);
    }
  });

  it('closes banner when close button is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(AnnouncementBanner, {
      props: {
        message: '可关闭的临时通知',
        closable: true,
        onclose: onClose,
      },
    });

    const closeBtn = container.querySelector('button[aria-label="Close announcement"]');
    expect(closeBtn).toBeTruthy();

    if (closeBtn) {
      await fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
      const root = container.querySelector('[data-svadmin-component="AnnouncementBanner"]');
      expect(root).toBeNull();
    }
  });
});
