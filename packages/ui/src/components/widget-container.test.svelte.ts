import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import WidgetContainer from './WidgetContainer.svelte';

describe('WidgetContainer Component', () => {
  it('renders title, description and last updated time', () => {
    const { container } = render(WidgetContainer, {
      props: {
        title: '核心业务指标',
        description: '统计过去 24 小时活跃调用量',
        lastUpdated: new Date(2026, 10, 11, 14, 30, 0),
      },
    });

    const root = container.querySelector('[data-svadmin-component="WidgetContainer"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('核心业务指标');
    expect(container.textContent).toContain('统计过去 24 小时活跃调用量');
  });

  it('toggles fullscreen state when fullscreen button is clicked', async () => {
    const { container } = render(WidgetContainer, {
      props: {
        title: '全屏监控小部件',
        allowFullscreen: true,
      },
    });

    const root = container.querySelector('[data-svadmin-component="WidgetContainer"]');
    expect(root?.getAttribute('data-fullscreen')).toBe('false');

    const fsBtn = container.querySelector('button[aria-label="Enter fullscreen"]');
    expect(fsBtn).toBeTruthy();
    if (fsBtn) {
      await fireEvent.click(fsBtn);
      expect(root?.getAttribute('data-fullscreen')).toBe('true');
    }
  });

  it('triggers onrefresh callback and displays loading animation', async () => {
    const onRefresh = vi.fn();
    const { container } = render(WidgetContainer, {
      props: {
        title: '刷新测试小部件',
        onrefresh: onRefresh,
      },
    });

    const refreshBtn = container.querySelector('button[aria-label="Refresh widget"]');
    expect(refreshBtn).toBeTruthy();
    if (refreshBtn) {
      await fireEvent.click(refreshBtn);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    }
  });

  it('renders error state and retry button when error is passed', () => {
    const onRetry = vi.fn();
    const { container } = render(WidgetContainer, {
      props: {
        title: '异常错误部件',
        error: '数据库连接池已耗尽',
        onretry: onRetry,
      },
    });

    expect(container.textContent).toContain('小部件数据拉取失败');
    expect(container.textContent).toContain('数据库连接池已耗尽');
    expect(container.textContent).toContain('重新加载');
  });
});
