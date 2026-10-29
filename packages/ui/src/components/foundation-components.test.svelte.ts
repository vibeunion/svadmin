import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConfigProvider from './ConfigProvider.svelte';
import Countdown from './Countdown.svelte';
import Grid from './Grid.svelte';
import GridCell from './GridCell.svelte';
import Menu from './Menu.svelte';
import Row from './Row.svelte';
import Col from './Col.svelte';
import ResizeBox from './ResizeBox.svelte';
import Space from './Space.svelte';
import Statistic from './Statistic.svelte';
import Timeline from './Timeline.svelte';
import Tour from './Tour.svelte';
import { Progress } from './ui/progress/index.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const text = (value: string) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));

describe('foundation components', () => {
  it('renders space, grid and row layouts with token gaps', () => {
    const view = render(Space, { props: { size: 'lg', children: text('A') } });
    const space = view.container.querySelector('.svadmin-space') as HTMLElement;
    expect(space.style.getPropertyValue('--svadmin-space-gap')).toBe('var(--svadmin-space-4)');

    const gridView = render(Grid, { props: { columns: 3, children: createRawSnippet(() => ({ render: () => '<span>A</span><span>B</span>' })) } });
    expect((gridView.container.querySelector('.svadmin-grid') as HTMLElement).style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');

    const rowView = render(Row, { props: { children: createRawSnippet(() => ({ render: () => '<span>Cell</span>' })) } });
    expect(rowView.container.querySelector('.svadmin-row')).toBeTruthy();
    cleanup();
    render(Col, { props: { span: 12, offset: 6, children: text('Half') } });
    expect(screen.getByText('Half')).toBeTruthy();
    cleanup();
    render(GridCell, { props: { span: 2, children: text('Wide') } });
    expect(screen.getByText('Wide')).toBeTruthy();
  });

  it('renders timeline entries and statistic formatting', () => {
    render(Timeline, { props: { items: [{ id: '1', title: 'Created', time: '09:00', tone: 'success' }] } });
    expect(screen.getByText('Created')).toBeTruthy();
    cleanup();
    const view = render(Statistic, { props: { title: 'Revenue', value: 1234.5, precision: 1, prefix: '$', suffix: 'USD', trend: 'up', trendLabel: '12%' } });
    expect(view.container.textContent).toContain('1,234.5');
    expect(view.container.textContent).toContain('$');
    expect(view.container.textContent).toContain('USD');
  });

  it('renders countdown and progress semantics', async () => {
    vi.useFakeTimers();
    const onfinish = vi.fn();
    render(Countdown, { props: { duration: 2, onfinish } });
    expect(screen.getAllByText('00:00:02').length).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(2000);
    expect(onfinish).toHaveBeenCalledTimes(1);

    const progress = render(Progress, { props: { value: 40 } });
    const bar = progress.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('supports menu selection and nested expansion', async () => {
    const onselect = vi.fn();
    render(Menu, {
      props: {
        selected: 'overview',
        items: [
          { id: 'overview', label: 'Overview' },
          { id: 'reports', label: 'Reports', children: [{ id: 'weekly', label: 'Weekly' }] },
        ],
        onselect,
      },
    });
    expect(screen.getByRole('button', { name: 'Overview' }).getAttribute('data-selected')).toBe('true');
    await fireEvent.click(screen.getByRole('button', { name: /Reports/ }));
    expect(screen.getByRole('button', { name: 'Weekly' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Weekly' }));
    expect(onselect).toHaveBeenCalledWith(expect.objectContaining({ id: 'weekly' }));
  });

  it('renders provider attributes and a resize handle', () => {
    const view = render(ConfigProvider, { props: { density: 'compact', direction: 'rtl', locale: 'zh-CN', children: text('Content') } });
    const provider = view.container.querySelector('.svadmin-config-provider') as HTMLElement;
    expect(provider.getAttribute('data-svadmin-density')).toBe('compact');
    expect(provider.getAttribute('dir')).toBe('rtl');
    expect(provider.getAttribute('lang')).toBe('zh-CN');

    cleanup();
    render(ResizeBox, { props: { width: 320, height: 200, children: text('Resizable') } });
    expect(screen.getByRole('button', { name: /Resize panel/ })).toBeTruthy();
  });

  it('walks through tour steps and finishes', async () => {
    const onfinish = vi.fn();
    render(Tour, {
      props: {
        open: true,
        steps: [
          { title: 'Welcome', description: 'First step' },
          { title: 'Ready', description: 'Second step' },
        ],
        onfinish,
      },
    });
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Ready' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onfinish).toHaveBeenCalledTimes(1);
  });
});