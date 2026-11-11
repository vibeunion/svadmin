import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ScheduledJobManager from './ScheduledJobManager.svelte';

describe('ScheduledJobManager suite', () => {
  const jobs = [
    {
      id: 'job-settle',
      name: '夜间财务自动化对账清算',
      cron: '0 2 * * *',
      nextRunText: '04:12:30 后触发',
      status: 'active' as const,
    },
  ];

  it('renders scheduled jobs list with cron expression', () => {
    const view = render(ScheduledJobManager, {
      jobs,
    });

    expect(view.container.textContent).toContain('夜间财务自动化对账清算');
    expect(view.container.textContent).toContain('0 2 * * *');
  });

  it('triggers onTriggerJob when clicking run button', async () => {
    const onTriggerJob = vi.fn();
    const view = render(ScheduledJobManager, {
      jobs,
      onTriggerJob,
    });

    const runBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('立即执行') || b.textContent?.includes('Run'),
    );
    expect(runBtn).toBeTruthy();
    if (runBtn) {
      await fireEvent.click(runBtn);
      expect(onTriggerJob).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'job-settle' }),
      );
    }
  });
});
