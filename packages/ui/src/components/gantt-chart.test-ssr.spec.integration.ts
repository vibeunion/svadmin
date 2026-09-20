import { render } from 'svelte/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setLocale } from '@svadmin/core/i18n';
import GanttChart from './GanttChart.svelte';
import LiteGanttChart from '../../../lite/src/components/LiteGanttChart.svelte';

const task = { id: 'build', title: 'Build', startDay: 0, durationDays: 2, progress: 0 };
beforeEach(() => setLocale('en'));

describe.each([['SPA', GanttChart], ['Lite', LiteGanttChart]] as const)('%s Gantt SSR', (_name, Component) => {
  it('renders the schedule without browser globals', () => {
    const { body } = render(Component, { props: { tasks: [task] } });
    expect(body).toContain('Build');
    expect(body).toContain('0%');
    expect(body).not.toContain('<script');
  });

  it('rejects massive timelines before rendering task rows', () => {
    const { body } = render(Component, { props: { tasks: [task], totalDays: 1_000_000_000 } });
    expect(body).toContain('role="alert"');
    expect(body).not.toContain('Build');
    expect(body).not.toContain('<table');
  });
});

it('Lite SSR preserves native retry and row/column semantics', () => {
  const { body } = render(LiteGanttChart, { props: { tasks: [task] } });
  expect(body).toContain('scope="row"');
  expect(body).toContain('scope="col"');
  const failed = render(LiteGanttChart, { props: { tasks: [], error: 'Failed', retryHref: '/schedule' } }).body;
  expect(failed).toContain('href="/schedule"');
  expect(failed).not.toContain('onclick');
});
