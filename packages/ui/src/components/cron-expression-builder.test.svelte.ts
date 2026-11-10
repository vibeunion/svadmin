import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CronExpressionBuilder from './CronExpressionBuilder.svelte';

describe('CronExpressionBuilder Component', () => {
  it('renders cron expression, header, and presets', () => {
    const { container } = render(CronExpressionBuilder, {
      props: {
        value: '0 9 * * 1-5',
      },
    });

    const root = container.querySelector('[data-svadmin-component="CronExpressionBuilder"]');
    expect(root).not.toBeNull();
    expect(container.textContent).toContain('0 9 * * 1-5');
    expect(container.textContent).toContain('Cron Expression Builder');
    expect(container.textContent).toContain('Common Presets');
    expect(container.textContent).toContain('Next 5 Estimated Executions');
  });

  it('applies preset when a preset button is clicked', async () => {
    const onchangeMock = vi.fn();
    const { container } = render(CronExpressionBuilder, {
      props: {
        value: '* * * * *',
        onchange: onchangeMock,
      },
    });

    const hourlyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Hourly')
    );
    expect(hourlyBtn).toBeDefined();

    if (hourlyBtn) {
      await fireEvent.click(hourlyBtn);
      expect(onchangeMock).toHaveBeenCalledWith('0 * * * *');
    }
  });

  it('switches segment tabs correctly', async () => {
    const { container } = render(CronExpressionBuilder, {
      props: {
        value: '0 0 * * *',
      },
    });

    const hourTab = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Hour (0-23)')
    );
    expect(hourTab).toBeDefined();

    if (hourTab) {
      await fireEvent.click(hourTab);
      expect(container.textContent).toContain('Every hour (*)');
      expect(container.textContent).toContain('At midnight (00:00)');
    }
  });
});
