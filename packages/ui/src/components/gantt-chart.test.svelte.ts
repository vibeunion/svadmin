import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { setLocale } from '@svadmin/core/i18n';
import { GANTT_LIMITS, validateGantt } from '@svadmin/core/gantt';
import GanttChart, { type GanttTask } from './GanttChart.svelte';
import LiteGanttChart from '../../../lite/src/components/LiteGanttChart.svelte';

const task: GanttTask = { id: 'build', title: 'Build', startDay: 1, durationDays: 3, progress: 0, status: 'planned' };
beforeEach(() => setLocale('en'));
afterEach(() => { cleanup(); setLocale('en'); });

describe('bounded Gantt model', () => {
  it.each([0, -1, 1.5, NaN, Infinity, 367, 1_000_000_000])('rejects invalid timeline %s', days => {
    expect(validateGantt([task], days)).toBe('invalidData');
  });

  it.each([
    { id: '' }, { title: '' }, { title: '  ' }, { title: 'x'.repeat(1001) },
    { startDay: -1 }, { startDay: 1.5 }, { startDay: Infinity }, { startDay: NaN },
    { durationDays: 0 }, { durationDays: -1 }, { durationDays: 1.5 }, { durationDays: Infinity },
    { startDay: 13, durationDays: 2 }, { progress: -1 }, { progress: 101 }, { progress: Infinity }, { progress: NaN },
  ])('rejects invalid task fields %j', patch => {
    expect(validateGantt([{ ...task, ...patch }], 14)).toBe('invalidData');
  });

  it('rejects duplicate identifiers and missing records', () => {
    expect(validateGantt([task, task], 14)).toBe('invalidData');
    expect(validateGantt(new Array<GanttTask>(1), 14)).toBe('invalidData');
  });

  it('validates dependency existence, order, cycles and milestones before rendering', () => {
    expect(validateGantt([
      { ...task, id: 'start', startDay: 0, durationDays: 2 },
      { ...task, id: 'finish', startDay: 2, durationDays: 0, dependencies: ['start'], milestone: true },
    ], 14)).toBeUndefined();
    expect(validateGantt([{ ...task, dependencies: ['missing'] }], 14)).toBe('dependency');
    expect(validateGantt([
      { ...task, id: 'a', dependencies: ['b'] },
      { ...task, id: 'b', dependencies: ['a'] },
    ], 14)).toBe('dependency');
    expect(validateGantt([
      { ...task, id: 'a', startDay: 2, durationDays: 2 },
      { ...task, id: 'b', startDay: 1, dependencies: ['a'] },
    ], 14)).toBe('dependency');
    expect(validateGantt([{ ...task, milestone: true, durationDays: 2 }], 14)).toBe('invalidData');
  });

  it('detects zero-duration cycles and accepts an acyclic chain without recursion', () => {
    const tasks = Array.from({ length: 1000 }, (_, index) => ({
      ...task, id: String(index), startDay: 0, durationDays: 0, milestone: true,
      dependencies: index ? [String(index - 1)] : [],
    }));
    expect(validateGantt(tasks, 1)).toBeUndefined();
    tasks[0]!.dependencies = ['999'];
    expect(validateGantt(tasks, 1)).toBe('dependency');
  });

  it('permits boundary durations, zero and fractional progress', () => {
    expect(validateGantt([{ ...task, startDay: 0, durationDays: 366 }], 366)).toBeUndefined();
    expect(validateGantt([{ ...task, startDay: 365, durationDays: 1, progress: 100 }], 366)).toBeUndefined();
    expect(validateGantt([{ ...task, progress: 0.5 }], 14)).toBeUndefined();
  });

  it('bounds task count before reading input records', () => {
    const poison = { ...task, get startDay(): number { throw new Error('must not scan'); } };
    const tasks = Array.from({ length: GANTT_LIMITS.tasks + 1 }, () => poison);
    expect(validateGantt(tasks, 14)).toBe('limit');
  });

  it('bounds total grid cells and accepts the limit', () => {
    const tasks = Array.from({ length: 1000 }, (_, i) => ({ ...task, id: String(i) }));
    expect(validateGantt(tasks, 40)).toBeUndefined();
    expect(validateGantt(tasks, 41)).toBe('limit');
  });
});

describe.each([['SPA', GanttChart], ['Lite', LiteGanttChart]] as const)('%s Gantt view', (_name, Component) => {
  it('renders a zero-duration milestone and rejects invalid dependencies atomically', async () => {
    const renderable = Component as unknown as typeof GanttChart;
    const view = render(renderable, { tasks: [{ ...task, title: 'Release', durationDays: 0, milestone: true }] });
    expect(view.getByRole(_name === 'SPA' ? 'group' : 'rowheader', { name: /Release, Milestone, Day 2/ })).toBeTruthy();
    await view.rerender({ tasks: [{ ...task, dependencies: ['missing'] }] });
    expect(view.getByRole('alert').textContent).toContain('dependencies');
    expect(view.queryByRole('group', { name: /Build/ })).toBeNull();
  });
  it('handles empty, loading and external failure without showing stale task content', async () => {
    const renderable = Component as unknown as typeof GanttChart;
    const view = render(renderable, { tasks: [] });
    expect(view.getByRole('status').textContent).toContain('No schedule tasks');
    await view.rerender({ tasks: [task], loading: true });
    expect(view.getByRole('status').textContent).toContain('Loading');
    expect(view.container.textContent).not.toContain('Build');
    await view.rerender({ loading: false, error: 'Access denied' });
    expect(view.getByRole('alert').textContent).toBe('Access denied');
    expect(view.container.textContent).not.toContain('Build');
    await view.rerender({ error: undefined });
    expect(view.container.textContent).toContain('Build');
  });

  it('rejects invalid durations, duplicate keys and oversized grids without partial rows', async () => {
    const renderable = Component as unknown as typeof GanttChart;
    const view = render(renderable, { tasks: [{ ...task, durationDays: 0 }] });
    expect(view.getByRole('alert').textContent).toContain('Invalid Gantt');
    expect(view.container.textContent).not.toContain('Build');
    await view.rerender({ tasks: [task, task] });
    expect(view.getByRole('alert')).toBeTruthy();
    await view.rerender({ tasks: [task], totalDays: Infinity });
    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.container.querySelectorAll('td, [role=button]')).toHaveLength(0);
    await view.rerender({ totalDays: 14, tasks: Array.from({ length: 1001 }, (_, i) => ({ ...task, id: String(i) })) });
    expect(view.getByRole('alert').textContent).toContain('limit');
  });

  it('updates task snapshots and internationalizes status labels', async () => {
    setLocale('zh-CN');
    const renderable = Component as unknown as typeof GanttChart;
    const view = render(renderable, { tasks: [task] });
    expect(view.container.textContent).toContain('项目甘特图');
    expect(view.container.textContent).toContain('1 个任务 / 14 天');
    expect(view.container.textContent).toContain('已计划');
    await view.rerender({ tasks: [{ ...task, title: '发布', status: 'completed', progress: 100 }] });
    expect(view.container.textContent).not.toContain('Build');
    expect(view.container.textContent).toContain('已完成');
    expect(view.container.textContent).toContain('100%');
  });
});

it('SPA task selection supports click, Enter and Space with an explicit time range', async () => {
  const onselecttask = vi.fn();
  const view = render(GanttChart, { tasks: [task], onselecttask, ariaLabel: 'Delivery schedule' });
  expect(view.getByRole('region', { name: 'Delivery schedule' })).toBeTruthy();
  const button = view.getByRole('button', { name: 'Build, Day 2 through day 4, Planned, Progress 0%' });
  expect(button.getAttribute('tabindex')).toBe('0');
  await fireEvent.click(button);
  await fireEvent.keyDown(button, { key: 'Enter' });
  await fireEvent.keyDown(button, { key: ' ' });
  expect(onselecttask).toHaveBeenCalledTimes(3);
  expect(onselecttask).toHaveBeenLastCalledWith(task);
  await fireEvent.keyDown(button, { key: ' ', repeat: true });
  expect(onselecttask).toHaveBeenCalledTimes(3);
});

it('SPA read-only tasks are named groups, not keyboard buttons', () => {
  const view = render(GanttChart, { tasks: [task] });
  expect(view.queryByRole('button')).toBeNull();
  const row = view.getByRole('group', { name: /Build, Day 2/ });
  expect(row.hasAttribute('tabindex')).toBe(false);
});

it('SPA short bars preserve duration instead of forcing four percent width', () => {
  const view = render(GanttChart, { tasks: [{ ...task, startDay: 99, durationDays: 1 }], totalDays: 100 });
  const bar = view.container.querySelector<HTMLElement>('[style*="margin-left"]');
  expect(bar?.style.marginLeft).toBe('99%');
  expect(bar?.style.width).toBe('1%');
  expect(bar?.style.flexShrink).toBe('0');
});

it('SPA retry calls the host and leaves data ownership outside the component', async () => {
  const onRetry = vi.fn();
  const view = render(GanttChart, { tasks: [task], error: 'Failed', onRetry });
  await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(view.getByRole('alert').textContent).toBe('Failed');
});

it('Lite marks the covered day interval with text alternatives, including zero progress', () => {
  const view = render(LiteGanttChart, { tasks: [task], ariaLabel: 'Delivery' });
  expect(view.getByRole('table', { name: 'Delivery' })).toBeTruthy();
  expect(view.getByRole('rowheader', { name: 'Build, Day 2 through day 4' })).toBeTruthy();
  expect(view.container.querySelectorAll('td[aria-label]')).toHaveLength(3);
  expect(view.getByRole('cell', { name: 'Build, D2, Planned' }).textContent).toContain('0%');
});

it('Lite error recovery is a same-site link rather than a client callback', async () => {
  const view = render(LiteGanttChart, { tasks: [task], error: 'Failed', retryHref: '/schedule' });
  expect(view.getByRole('link', { name: 'Retry' }).getAttribute('href')).toBe('/schedule');
  for (const retryHref of ['javascript:alert(1)', '//evil.example', '/\\evil.example', '/\tevil.example']) {
    await view.rerender({ retryHref });
    expect(view.queryByRole('link')).toBeNull();
  }
});
