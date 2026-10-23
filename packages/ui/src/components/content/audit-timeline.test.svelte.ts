import { cleanup, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuditTimeline, { type TimelineItem } from './AuditTimeline.svelte';
import utilityClasses from '../../../scripts/utility-class-map.json';
import { renderWithI18n as render } from '../../../test/fixtures/render-with-i18n';

afterEach(cleanup);

describe('AuditTimeline enterprise component', () => {
  it('renders empty state when items are empty', () => {
    const view = render(AuditTimeline, { items: [], emptyTitle: 'No Records' });
    expect(view.container.textContent).toContain('No Records');
    expect(view.getByText('Activity events and status transitions will appear here.')).toBeTruthy();
    expect(view.container.querySelector('[data-svadmin-audit-timeline]')?.getAttribute('data-svadmin-audit-state')).toBe('empty');
  });

  it('renders timeline items with titles, timestamps, and status badges', () => {
    const items: TimelineItem[] = [
      {
        id: '1',
        title: 'Application Created',
        actor: 'CSY',
        timestamp: '2026-08-27 10:00:00',
        status: 'info',
        description: 'Initiated intake workflow.',
      },
      {
        id: '2',
        title: 'Review Approved',
        actor: 'Approver A',
        timestamp: '2026-08-27 10:15:00',
        status: 'success',
        tag: 'Approved',
        description: 'Passed verification checks.',
      },
    ];

    const view = render(AuditTimeline, { items });
    expect(view.container.textContent).toContain('Application Created');
    expect(view.container.textContent).toContain('by CSY');
    expect(view.container.textContent).toContain('Review Approved');
    expect(view.container.textContent).toContain('by Approver A');
    expect(view.container.textContent).toContain('Approved');
    expect(view.container.querySelector(`.${utilityClasses['text-success']}`)).not.toBeNull();
    expect(view.container.querySelector('[data-svadmin-audit-events]')).toBeTruthy();
    expect(view.container.querySelector('[data-svadmin-audit-timeline]')?.getAttribute('data-svadmin-audit-state')).toBe('ready');
  });

  it.each(['loading', 'filtered-empty', 'forbidden'] as const)('renders an explicit %s boundary without exposing stale events', state => {
    const view = render(AuditTimeline, {
      state,
      items: [{ id: 'secret', title: 'Hidden event' }],
    });

    expect(view.container.querySelector(`[data-svadmin-data-state="${state}"]`)).toBeTruthy();
    expect(view.queryByText('Hidden event')).toBeNull();
    expect(view.container.querySelector('[data-svadmin-audit-events]')).toBeNull();
    expect(view.container.querySelector('[data-svadmin-audit-timeline]')?.getAttribute('data-svadmin-audit-state')).toBe(state);
  });

  it('keeps error recovery owned by the timeline provider', async () => {
    const retry = vi.fn();
    const view = render(AuditTimeline, {
      state: 'error',
      retry,
      retryLabel: 'Reload audit events',
      stateTitle: 'Audit unavailable',
      stateDescription: 'The audit service did not respond.',
    });

    await fireEvent.click(view.getByRole('button', { name: 'Reload audit events' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(view.getByText('Audit unavailable')).toBeTruthy();
    expect(view.getByText('The audit service did not respond.')).toBeTruthy();
  });

  it('restores default feedback when an empty timeline becomes forbidden', async () => {
    const view = render(AuditTimeline, {
      items: [],
      emptyTitle: 'No audit events yet',
      emptyDescription: 'New events will appear here.',
    });
    expect(view.getByText('No audit events yet')).toBeTruthy();
    await view.rerender({ state: 'forbidden' });
    expect(view.getByText('Access restricted')).toBeTruthy();
    expect(view.getByText('You do not have permission to view this content.')).toBeTruthy();
    expect(view.queryByText('No audit events yet')).toBeNull();
    expect(view.queryByText('New events will appear here.')).toBeNull();
    expect(view.queryByRole('button')).toBeNull();
  });

  it('forwards the loading label without showing stale events', () => {
    const view = render(AuditTimeline, {
      state: 'loading',
      loadingLabel: 'Loading audit history',
      items: [{ id: 'stale', title: 'Old event' }],
    });
    expect(view.getByRole('status', { name: 'Loading audit history' }).getAttribute('aria-busy')).toBe('true');
    expect(view.queryByText('Old event')).toBeNull();
  });

  it('exposes a provider-owned recovery action for filtered audit results', () => {
    const action = createRawSnippet(() => ({ render: () => '<button type="button">Clear audit filters</button>' }));
    const view = render(AuditTimeline, { state: 'filtered-empty', action });

    expect(view.getByRole('button', { name: 'Clear audit filters' })).toBeTruthy();
  });

  it('updates default empty feedback in both directions', async () => {
    const view = render(AuditTimeline, { items: [] });
    expect(view.getByText('No timeline events')).toBeTruthy();
    await view.wrapper.setLocale('zh-CN');
    expect(view.getByText('暂无审计事件')).toBeTruthy();
    expect(view.getByText('活动事件和状态变更将在此显示。')).toBeTruthy();
    expect(view.queryByText('No timeline events')).toBeNull();
    await view.wrapper.setLocale('en');
    expect(view.getByText('No timeline events')).toBeTruthy();
    expect(view.getByText('Activity events and status transitions will appear here.')).toBeTruthy();
  });

  it('localizes default actor and tone labels without changing event content', async () => {
    const statuses = ['success', 'warning', 'danger', 'info', 'neutral'] as const;
    const items: TimelineItem[] = statuses.map(status => ({
      id: status,
      title: `Event ${status}`,
      status,
    }));
    items.push({
      id: 'custom',
      title: 'Business event',
      actor: 'Alice',
      status: 'success',
      tag: 'Approved by committee',
      description: 'Provider-owned content',
      timestamp: '2026-10-22 09:00',
    });
    const view = render(AuditTimeline, { items });
    expect(view.getByText('by Alice')).toBeTruthy();
    await view.wrapper.setLocale('zh-CN');
    for (const label of ['成功', '警告', '危险', '信息', '一般']) {
      expect(view.getByText(label)).toBeTruthy();
    }
    expect(view.getByText('操作人：Alice')).toBeTruthy();
    expect(view.queryByText('by Alice')).toBeNull();
    for (const text of ['Business event', 'Approved by committee', 'Provider-owned content', '2026-10-22 09:00']) {
      expect(view.getByText(text)).toBeTruthy();
    }
    await view.wrapper.setLocale('en');
    for (const status of statuses) expect(view.getByText(status)).toBeTruthy();
    expect(view.getByText('by Alice')).toBeTruthy();
    expect(view.getByText('Approved by committee')).toBeTruthy();
  });

  it('preserves custom and explicitly empty feedback across locale changes', async () => {
    const view = render(AuditTimeline, {
      emptyTitle: 'Custom audit title',
      emptyDescription: '',
    });
    await view.wrapper.setLocale('zh-CN');
    expect(view.getByText('Custom audit title')).toBeTruthy();
    expect(view.queryByText('活动事件和状态变更将在此显示。')).toBeNull();
    await view.rerender({ stateTitle: 'Override title', stateDescription: 'Override description' });
    expect(view.getByText('Override title')).toBeTruthy();
    expect(view.getByText('Override description')).toBeTruthy();
    expect(view.queryByText('Custom audit title')).toBeNull();
    await view.wrapper.setLocale('en');
    expect(view.getByText('Override title')).toBeTruthy();
    expect(view.getByText('Override description')).toBeTruthy();
  });

  it('keeps stale events hidden while localizing loading and recovery states', async () => {
    const retry = vi.fn();
    const view = render(AuditTimeline, {
      state: 'loading',
      retry,
      items: [{ id: 'old', title: 'Old event' }],
    });
    await view.wrapper.setLocale('zh-CN');
    expect(view.getByRole('status', { name: '加载中...' })).toBeTruthy();
    expect(view.queryByText('Old event')).toBeNull();
    await view.rerender({ state: 'error' });
    expect(view.queryByText('Old event')).toBeNull();
    expect(retry).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('button', { name: '重试' }));
    expect(retry).toHaveBeenCalledOnce();
    await view.wrapper.setLocale('en');
    expect(view.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(retry).toHaveBeenCalledOnce();
    expect(view.queryByText('Old event')).toBeNull();
  });

  it('does not change a sibling timeline locale', async () => {
    const english = render(AuditTimeline, { items: [] });
    const chinese = render(AuditTimeline, { items: [] }, 'zh-CN');
    expect(english.container.textContent).toContain('No timeline events');
    expect(chinese.container.textContent).toContain('暂无审计事件');
    await english.wrapper.setLocale('zh-CN');
    await chinese.wrapper.setLocale('en');
    expect(english.container.textContent).toContain('暂无审计事件');
    expect(chinese.container.textContent).toContain('No timeline events');
  });

  it.each([
    ['forbidden', 'Access restricted', '无权访问'],
    ['filtered-empty', 'No matching results', '没有匹配结果'],
  ] as const)('preserves the %s boundary during locale changes', async (state, english, chinese) => {
    const view = render(AuditTimeline, {
      state,
      items: [{ id: 'old', title: 'Old event' }],
      emptyTitle: 'Unused empty title',
    });
    expect(view.getByText(english)).toBeTruthy();
    await view.wrapper.setLocale('zh-CN');
    expect(view.getByText(chinese)).toBeTruthy();
    expect(view.queryByText('Old event')).toBeNull();
    expect(view.queryByText('Unused empty title')).toBeNull();
    expect(view.queryByRole('button')).toBeNull();
    await view.wrapper.setLocale('en');
    expect(view.getByText(english)).toBeTruthy();
    expect(view.queryByText('Old event')).toBeNull();
  });

  it('renders actor names literally across locale changes', async () => {
    const actor = 'A$&B$$C{name}<script>literal</script>';
    const view = render(AuditTimeline, {
      items: [{ id: 'literal', title: 'Event', actor }],
    });
    expect(view.getByText(`by ${actor}`)).toBeTruthy();
    expect(view.container.querySelector('script')).toBeNull();
    await view.wrapper.setLocale('zh-CN');
    expect(view.getByText(`操作人：${actor}`)).toBeTruthy();
    expect(view.container.querySelector('script')).toBeNull();
    await view.wrapper.setLocale('en');
    expect(view.getByText(`by ${actor}`)).toBeTruthy();
  });
});
