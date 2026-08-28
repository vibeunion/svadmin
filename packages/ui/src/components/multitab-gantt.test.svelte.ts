import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import MultiTabKeepAlive from './MultiTabKeepAlive.svelte';
import GanttChart from './GanttChart.svelte';

describe('MultiTabKeepAlive and GanttChart Components', () => {
  it('renders MultiTabKeepAlive tabs with active status', () => {
    const tabs = [
      { id: '1', title: 'Dashboard', path: '/dashboard', pinned: true },
      { id: '2', title: 'Orders', path: '/orders', closable: true },
    ];

    const view = render(MultiTabKeepAlive, {
      tabs,
      activeTabId: '1',
    });

    expect(view.container.textContent).toContain('Dashboard');
    expect(view.container.textContent).toContain('Orders');
  });

  it('renders GanttChart with tasks and schedule grid', () => {
    const tasks = [
      { id: 't1', title: 'Architecture Review', startDay: 0, durationDays: 3, progress: 80, status: 'completed' as const },
      { id: 't2', title: 'Implementation', startDay: 3, durationDays: 5, progress: 40, status: 'in_progress' as const },
    ];

    const view = render(GanttChart, {
      tasks,
      totalDays: 10,
    });

    expect(view.container.textContent).toContain('Project Gantt Schedule');
    expect(view.container.textContent).toContain('Architecture Review');
    expect(view.container.textContent).toContain('Implementation');
  });
});
