import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';
import TaskCenter from './TaskCenter.svelte';

describe('TaskCenter', () => {
  it('translates default labels and task statuses with the active locale', async () => {
    const view = renderWithI18n(
      TaskCenter,
      {
        open: true,
        tasks: [{
          id: 'task-1',
          name: '导出报表',
          status: 'running',
          createdAt: '2026-11-12T10:00:00.000Z',
          estimatedSecondsRemaining: 75,
        }],
        onrefresh: () => undefined,
      },
      'zh-CN',
    );

    expect(view.getByText('任务中心')).toBeTruthy();
    expect(view.getAllByText('执行中').length).toBeGreaterThanOrEqual(1);
    expect(view.getByText('剩余约 1 分 15 秒')).toBeTruthy();
    expect(view.getByRole('button', { name: '刷新任务' })).toBeTruthy();
    expect(view.getByRole('button', { name: '关闭任务中心' })).toBeTruthy();

    await view.wrapper.setLocale('en');
    expect(view.getByText('Task Center')).toBeTruthy();
    expect(view.getAllByText('Running').length).toBeGreaterThanOrEqual(1);
    expect(view.getByText('~1m 15s remaining')).toBeTruthy();
  });
});
