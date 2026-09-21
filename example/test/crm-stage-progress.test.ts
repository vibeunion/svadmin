import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import CrmStageProgress from '../src/components/CrmStageProgress.svelte';

describe('CRM stage progress', () => {
  it('preserves the dashboard count-only layout', () => {
    const view = render(CrmStageProgress, { label: 'Lost', count: 0, total: 3 });
    expect(view.getByRole('progressbar', { name: 'Lost' }).getAttribute('aria-valuenow')).toBe('0');
    expect(view.container.querySelector('.amount')).toBeNull();
  });
  it.each([
    { count: 0, total: 3, percentage: 0 },
    { count: 0, total: 0, percentage: 0 },
    { count: 2, total: 8, percentage: 25 },
    { count: 8, total: 8, percentage: 100 },
    { count: 9, total: 8, percentage: 100 },
  ])('renders $count / $total as $percentage%', ({ count, total, percentage }) => {
    const view = render(CrmStageProgress, { label: 'Proposal', count, total, amount: '$20K' });
    const progress = view.getByRole('progressbar', { name: 'Proposal' });
    expect(progress.getAttribute('aria-valuenow')).toBe(String(percentage));
    expect(progress.querySelector<HTMLElement>('.fill')?.style.width).toBe(`${percentage}%`);
    expect(view.getByText('$20K')).toBeTruthy();
  });

  it('updates the visual and accessible value when data changes', async () => {
    const view = render(CrmStageProgress, { label: 'Won', count: 0, total: 4, amount: '$0K' });
    await view.rerender({ label: 'Won', count: 2, total: 4, amount: '$40K' });
    const progress = view.getByRole('progressbar', { name: 'Won' });
    expect(progress.getAttribute('aria-valuenow')).toBe('50');
    expect(progress.querySelector<HTMLElement>('.fill')?.style.width).toBe('50%');
    expect(view.getByText('$40K')).toBeTruthy();
  });
});
