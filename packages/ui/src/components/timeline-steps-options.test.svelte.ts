import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Timeline, { type TimelineEntry } from './Timeline.svelte';
import Steps, { type StepItem } from './Steps.svelte';

describe('Timeline enterprise design system options', () => {
  it('supports item dotColor, lineType, and lineColor styles', () => {
    const items: TimelineEntry[] = [
      {
        id: '1',
        title: 'Step 1',
        label: '2026-11-01',
        dotColor: 'var(--success)',
        lineType: 'dashed',
        lineColor: 'var(--success)',
      },
      {
        id: '2',
        title: 'Step 2',
        label: '2026-11-02',
        lineType: 'dotted',
      },
    ];

    const { container } = render(Timeline, {
      props: { items, lineType: 'solid' },
    });

    const listItems = container.querySelectorAll('.svadmin-timeline__item');
    expect(listItems.length).toBe(2);
    expect(listItems[0]?.getAttribute('style')).toContain('--timeline-dot-color: var(--success)');
    expect(listItems[0]?.getAttribute('style')).toContain('--timeline-item-line-style: dashed');
    expect(listItems[0]?.getAttribute('style')).toContain('--timeline-item-line-color: var(--success)');
    expect(listItems[1]?.getAttribute('style')).toContain('--timeline-item-line-style: dotted');

    const time = container.querySelector('.svadmin-timeline__time');
    expect(time?.textContent?.trim()).toBe('2026-11-01');
  });

  it('supports mode="right"', () => {
    const items: TimelineEntry[] = [
      { id: '1', title: 'Start' },
      { id: '2', title: 'End' },
    ];

    const { container } = render(Timeline, {
      props: { items, mode: 'right' },
    });

    const ol = container.querySelector('.svadmin-timeline');
    expect(ol?.getAttribute('data-mode')).toBe('right');
  });
});

describe('Steps enterprise design system options', () => {
  it('supports item-level status override', () => {
    const items: StepItem[] = [
      { id: '1', title: 'Step 1' },
      { id: '2', title: 'Step 2', status: 'error' },
      { id: '3', title: 'Step 3' },
    ];

    const { container } = render(Steps, {
      props: { items, current: 0 },
    });

    const stepElements = container.querySelectorAll('.svadmin-steps__item');
    expect(stepElements[0]?.getAttribute('data-status')).toBe('process');
    expect(stepElements[1]?.getAttribute('data-status')).toBe('error');
    expect(stepElements[2]?.getAttribute('data-status')).toBe('wait');
  });

  it('supports onChange callback alias and type="arrow" / type="navigation"', async () => {
    const onChange = vi.fn();
    const onchange = vi.fn();
    const items: StepItem[] = [
      { id: '1', title: 'Step 1' },
      { id: '2', title: 'Step 2' },
    ];

    const { container } = render(Steps, {
      props: {
        items,
        current: 0,
        clickable: true,
        type: 'arrow',
        onChange,
        onchange,
      },
    });

    const list = container.querySelector('.svadmin-steps');
    expect(list?.getAttribute('data-type')).toBe('arrow');

    const buttons = container.querySelectorAll('.svadmin-steps__action');
    const secondAction = buttons[1];
    if (secondAction === undefined) throw new Error('expected a second step action');
    await fireEvent.click(secondAction);

    expect(onChange).toHaveBeenCalledWith(1);
    expect(onchange).toHaveBeenCalledWith(1);
  });
});
